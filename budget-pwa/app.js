/* Budget — app de suivi budgétaire hors ligne.
   Toutes les données restent dans le navigateur (localStorage), avec export/import de sauvegarde. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- constantes
  const KEY = 'budget-app-v1';
  const APP_VERSION = '1.8.0';
  const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const MSHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
  const TYPES = ['Dépenses','Factures','Revenus','Épargnes',"Reprise d'épargne",'Transfert de fonds','Remboursement'];
  const GROUPS = ['Revenus','Factures','Dépenses','Épargnes'];
  const CAT_GROUPS = [...GROUPS, 'Transferts'];
  const GROUP_HELP = {
    Revenus: 'Salaires, aides, ventes, cadeaux…',
    Factures: 'Charges fixes et prélèvements, crédits compris.',
    'Dépenses': 'Dépenses variables du quotidien.',
    'Épargnes': 'Tes enveloppes d’épargne et projets.',
    Transferts: 'Mouvements entre tes propres comptes.'
  };
  const DEFAULT_CATS = {
    Revenus: ['Salaire','Primes','Aides (CAF…)','Remboursements santé','Ventes','Cadeaux reçus','Revenus financiers','Autres revenus'],
    Factures: ['Loyer / crédit immobilier','Électricité & gaz','Eau','Internet & téléphone','Assurances','Abonnements','Transports en commun','Frais bancaires','Impôts'],
    'Dépenses': ['Courses','Transport & carburant','Restaurants & sorties','Shopping','Loisirs','Santé','Vacances','Cadeaux','Divers'],
    'Épargnes': ['Épargne de précaution','Projets','Vacances','Investissements'],
    Transferts: ['Virement interne','Retrait','Dépôt']
  };
  const ACCENTS = [['Prusse','#1F4E79'],['Pétrole','#1F6F7A'],['Forêt','#2F6B45'],['Brique','#B4532A'],['Prune','#7A3B5E'],['Graphite','#4A4A50']];
  const OLD_DEFAULT_ACCENTS = ['#2C6A4D', '#7B68F5', '#13998A', '#3A6FE0', '#C98316', '#E0485E', '#5B6275', '#2E4A8B'];
  const ACC_COLORS = ['#2A8C99', '#C2703D', '#4F6BB0', '#6E8F3F', '#A8506B', '#8A7A5C', '#3F7F6E', '#B08A2E', '#6A5D9E', '#5F6368'];
  const OLD_ACC_COLORS = ['#7B68F5', '#13998A', '#3A6FE0', '#E08A1E', '#E0485E', '#2FA36B', '#D45FA8', '#1E9BD7', '#8A6D3B', '#5B6275'];
  const MARK_SVG = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11.5" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="16" r="3.4" fill="var(--accent)"/></svg>`;
  const COMMON_CURRENCIES = ['EUR','CHF','USD','GBP','CAD','MAD','TND','DZD','XOF','XAF'];
  const FALLBACK_CURRENCIES = ['EUR','CHF','USD','GBP','CAD','AUD','NZD','JPY','CNY','HKD','SGD','INR','BRL','MXN','ARS','CLP','COP','PEN','ZAR','MAD','TND','DZD','EGP','XOF','XAF','NGN','KES','TRY','ILS','AED','SAR','QAR','SEK','NOK','DKK','ISK','PLN','CZK','HUF','RON','BGN','RSD','UAH','RUB','THB','VND','IDR','MYR','PHP','KRW','TWD'];
  // Formats de nombres : une langue + un pays. Seuls ceux que le navigateur sait afficher sont proposés.
  const LOCALE_TAGS = ['fr-FR','fr-BE','fr-CH','fr-CA','fr-LU','fr-MC','fr-MA','fr-TN','fr-DZ','fr-SN','fr-CI','fr-CM','fr-BF','fr-ML','fr-MG','fr-CD','fr-RE','fr-MU','fr-HT','fr-NC','fr-PF',
    'en-US','en-GB','en-IE','en-CA','en-AU','en-NZ','en-ZA','en-IN','en-SG','en-HK','en-NG','en-KE','en-PH','en-MT',
    'de-DE','de-AT','de-CH','de-LU','de-BE','it-IT','it-CH','es-ES','es-MX','es-AR','es-CO','es-CL','es-PE','es-UY','es-VE','es-US','pt-PT','pt-BR','pt-AO','nl-NL','nl-BE','ca-ES','eu-ES','gl-ES',
    'da-DK','sv-SE','nb-NO','fi-FI','is-IS','pl-PL','cs-CZ','sk-SK','hu-HU','ro-RO','bg-BG','el-GR','el-CY','hr-HR','sl-SI','sr-RS','bs-BA','mk-MK','sq-AL','et-EE','lv-LV','lt-LT','uk-UA','ru-RU','be-BY','ka-GE','hy-AM','az-AZ','kk-KZ',
    'tr-TR','ar-MA','ar-TN','ar-DZ','ar-EG','ar-SA','ar-AE','ar-QA','ar-LB','ar-JO','he-IL','fa-IR','ur-PK','hi-IN','bn-BD','ta-IN','th-TH','vi-VN','id-ID','ms-MY','fil-PH','zh-CN','zh-TW','zh-HK','zh-SG','ja-JP','ko-KR','sw-KE','am-ET','af-ZA'];
  const TABS = ['apercu', 'transactions', 'previsionnel', 'epargne', 'credits', 'reglages'];
  const FREQS = [[1,'Chaque mois'],[2,'Tous les 2 mois'],[3,'Chaque trimestre'],[6,'Chaque semestre'],[12,'Chaque année']];

  // ---------------------------------------------------------------- utilitaires
  const $ = (id) => document.getElementById(id);
  const r2 = (x) => Math.round((+x || 0) * 100) / 100;
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const pad2 = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayStr = () => isoOf(new Date());

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return el;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v); return el; }
  function opt(value, label, selected) { const o = new Option(label ?? value, value); if (selected) o.selected = true; return o; }

  function parseNum(str) {
    let x = String(str ?? '').replace(/[\s  €$£]/g, '');
    if (x.includes(',') && x.includes('.')) {
      x = x.lastIndexOf(',') > x.lastIndexOf('.') ? x.replace(/\./g, '').replace(',', '.') : x.replace(/,/g, '');
    } else x = x.replace(',', '.');
    const n = parseFloat(x);
    return Number.isFinite(n) ? n : NaN;
  }

  // ---------------------------------------------------------------- état
  let S = null;              // données sauvegardées : {version, cfg, tx}
  const U = { tab: 'apercu', period: '1', year: new Date().getFullYear(), editing: null, onbStep: 0, draft: null, pendingImport: null, confirmReset: false, lastAcc: {}, msg: {} };
  let fmt, fmt0, pct, num2;

  function defaultCfg() {
    return {
      appName: 'Mon budget', currency: 'EUR', locale: 'fr-FR', startDay: 1, startEarly: false,
      theme: 'system', accent: ACCENTS[0][1], year: new Date().getFullYear(),
      accounts: [
        { id: uid(), name: 'Compte courant', start: 0, savings: false },
        { id: uid(), name: 'Livret A', start: 0, savings: true }
      ],
      categories: clone(DEFAULT_CATS), plan: {}, goals: [], loans: [], recurring: [], autoRecurring: false, sample: false
    };
  }

  function normalize(data) {
    const d = defaultCfg();
    const cfg = Object.assign({}, d, data.cfg || {});
    if (String(cfg.accent).toUpperCase() === '#1F6F7A' && !cfg.accentChosen) cfg.accent = '#1F4E79';
    { const i = OLD_DEFAULT_ACCENTS.indexOf(String(cfg.accent).toUpperCase()); if (i >= 0) cfg.accent = ACCENTS[[0, 0, 1, 0, 3, 4, 5, 0][i]][1]; }
    cfg.startDay = Math.min(28, Math.max(1, parseInt(cfg.startDay, 10) || 1));
    cfg.year = parseInt(cfg.year, 10) || d.year;
    cfg.accounts = (Array.isArray(cfg.accounts) ? cfg.accounts : []).filter(a => a && a.name && a.name !== 'Externe').map(a => ({ id: a.id || uid(), name: String(a.name), start: r2(a.start), savings: !!a.savings, current: a.savings ? false : (a.current === undefined ? true : !!a.current), color: /^#[0-9a-f]{6}$/i.test(a.color || '') ? a.color : '' }));
    cfg.accounts.forEach((a, i) => { const o = OLD_ACC_COLORS.indexOf(String(a.color).toUpperCase()); if (o >= 0) a.color = ACC_COLORS[o]; if (!a.color) a.color = ACC_COLORS[i % ACC_COLORS.length]; });
    const cats = {};
    for (const g of CAT_GROUPS) cats[g] = Array.isArray(cfg.categories?.[g]) ? [...new Set(cfg.categories[g].map(String).filter(Boolean))] : clone(DEFAULT_CATS[g]);
    cfg.categories = cats;
    cfg.plan = cfg.plan && typeof cfg.plan === 'object' ? cfg.plan : {};
    // ancien format : plan sans année
    if (cfg.plan.Revenus || cfg.plan.Factures || cfg.plan['Dépenses'] || cfg.plan['Épargnes']) cfg.plan = { [cfg.year]: cfg.plan };
    cfg.goals = (Array.isArray(cfg.goals) ? cfg.goals : []).map(g => ({ id: g.id || uid(), category: g.category || '', account: g.account || '', start: r2(g.start), target: r2(g.target) }));
    cfg.loans = (Array.isArray(cfg.loans) ? cfg.loans : []).map(l => ({ id: l.id || uid(), name: l.name || 'Crédit', category: l.category || '', capital: r2(l.capital), interest: r2(l.interest), months: parseInt(l.months, 10) || 0, rate: +l.rate || 0, monthly: r2(l.monthly), paidBefore: r2(l.paidBefore), startDate: /^\d{4}-\d{2}$/.test(l.startDate || '') ? l.startDate : '' }));
    cfg.recurring = (Array.isArray(cfg.recurring) ? cfg.recurring : []).filter(r => r && TYPES.includes(r.type)).map(r => ({
      id: r.id || uid(), label: String(r.label || ''), type: r.type, category: String(r.category || ''), from: String(r.from || 'Externe'), to: String(r.to || 'Externe'),
      amount: r2(r.amount), day: Math.min(31, Math.max(1, parseInt(r.day, 10) || 1)), every: [1, 2, 3, 6, 12].includes(+r.every) ? +r.every : 1,
      start: /^\d{4}-\d{2}$/.test(r.start || '') ? r.start : todayStr().slice(0, 7), end: /^\d{4}-\d{2}$/.test(r.end || '') ? r.end : '', pointed: !!r.pointed, active: r.active !== false }));
    cfg.autoRecurring = !!cfg.autoRecurring;
    const tx = (Array.isArray(data.tx) ? data.tx : []).filter(t => t && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && +t.amount > 0).map(t => ({
      id: t.id || uid(), date: t.date, amount: r2(t.amount), type: TYPES.includes(t.type) ? t.type : 'Dépenses',
      category: String(t.category || ''), from: String(t.from || 'Externe'), to: String(t.to || 'Externe'), description: String(t.description || ''), pointed: t.pointed !== false, ...(t.recurId ? { recurId: String(t.recurId) } : {}), ...(t.toSort ? { toSort: true } : {})
    }));
    return { version: 1, cfg, tx };
  }

  function load() { try { const raw = localStorage.getItem(KEY); return raw ? normalize(JSON.parse(raw)) : null; } catch (e) { return null; } }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(S)); setStatus('Enregistré sur cet appareil'); }
      catch (e) { setStatus('Impossible d’enregistrer : stockage du navigateur plein ou bloqué. Exporte une sauvegarde.', true); }
    }, 150);
  }
  function setStatus(text, bad) { const el = $('status'); el.textContent = text; el.classList.toggle('bad', !!bad); }

  // ---------------------------------------------------------------- apparence & formats
  function applyLook(cfg) {
    const root = document.documentElement;
    if (cfg.theme === 'light' || cfg.theme === 'dark') root.setAttribute('data-theme', cfg.theme); else root.removeAttribute('data-theme');
    root.style.setProperty('--accent-base', /^#[0-9a-f]{6}$/i.test(cfg.accent) ? cfg.accent : ACCENTS[0][1]);
    document.title = cfg.appName || 'Focale';
    $('appName').textContent = cfg.appName || 'Focale';
    try {
      fmt = new Intl.NumberFormat(cfg.locale, { style: 'currency', currency: cfg.currency });
      fmt0 = new Intl.NumberFormat(cfg.locale, { style: 'currency', currency: cfg.currency, maximumFractionDigits: 0 });
    } catch (e) {
      fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
      fmt0 = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    }
    pct = new Intl.NumberFormat(cfg.locale || 'fr-FR', { style: 'percent', maximumFractionDigits: 1 });
    num2 = new Intl.NumberFormat(cfg.locale || 'fr-FR', { maximumFractionDigits: 2, useGrouping: false });
  }
  const money = (x) => fmt.format(x);
  /** Montant typographié : unités pleines, centimes et devise en retrait. */
  function moneyEl(x, cls = '') {
    let main = '', minor = '', seen = false;
    try { for (const p of fmt.formatToParts(x)) { if (p.type === 'decimal') seen = true; if (seen || (p.type === 'currency' && main && /\d/.test(main))) minor += p.value; else main += p.value; } } catch (e) { main = money(x); }
    return h('span', { class: 'mny ' + cls, 'aria-label': money(x) }, h('span', { class: 'mj', 'aria-hidden': 'true', text: main.trim() }), minor ? h('span', { class: 'mn', 'aria-hidden': 'true', text: minor.replace(/^\s+/, '\u202f') }) : null);
  }
  const sgn = (x) => (x > 0.004 ? '+' : x < -0.004 ? '−' : '') + fmt.format(Math.abs(x));
  const numIn = (x) => (x ? num2.format(x) : '');

  // ---------------------------------------------------------------- logique budgétaire
  /** Mois budgétaire d'une date, selon le jour de début choisi. */
  function bm(date) {
    let y = +date.slice(0, 4), m = +date.slice(5, 7); const d = +date.slice(8, 10);
    const D = S.cfg.startDay || 1;
    if (D > 1) {
      if (S.cfg.startEarly) { if (d >= D) m++; }
      else if (d < D) m--;
    }
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    return { y, m };
  }
  function monthRange(y, m) {
    const D = S.cfg.startDay || 1;
    if (D === 1) return [new Date(y, m - 1, 1), new Date(y, m, 0)];
    const startM = S.cfg.startEarly ? m - 2 : m - 1;
    const a = new Date(y, startM, D), b = new Date(y, startM + 1, D - 1);
    return [a, b];
  }
  const dfmt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const inPeriod = (t, p = U.period, y = U.year) => { const b = bm(t.date); return b.y === y && (p === 'year' || b.m === +p); };
  const periodLabel = (p = U.period) => p === 'year' ? `l'année ${U.year}` : `${MONTHS[+p - 1].toLowerCase()} ${U.year}`;
  const accNames = () => S.cfg.accounts.map(a => a.name);
  const accColor = (name) => S.cfg.accounts.find(a => a.name === name)?.color || 'var(--muted)';
  const accPill = (name) => h('span', { class: 'acc-pill' + (name === 'Externe' ? ' ext' : ''), style: name === 'Externe' ? null : `--ac:${accColor(name)}` }, h('i', { class: 'tok', 'aria-hidden': 'true' }), name);
  const nextAccColor = (cfg) => ACC_COLORS.find(c => !cfg.accounts.some(a => a.color === c)) || ACC_COLORS[cfg.accounts.length % ACC_COLORS.length];
  const savingsAccs = () => S.cfg.accounts.filter(a => a.savings).map(a => a.name);
  const mainAcc = () => (S.cfg.accounts.find(a => !a.savings) || S.cfg.accounts[0] || { name: 'Externe' }).name;

  function catsFor(type, cfg = S.cfg) {
    const c = cfg.categories;
    switch (type) {
      case 'Revenus': return c.Revenus;
      case 'Factures': return c.Factures;
      case 'Dépenses': return c['Dépenses'];
      case 'Épargnes': case "Reprise d'épargne": return c['Épargnes'];
      case 'Transfert de fonds': return c.Transferts;
      case 'Remboursement': return [...c.Factures, ...c['Dépenses'].filter(x => !c.Factures.includes(x))];
      default: return [];
    }
  }
  /** Groupes de catégories qu'un type de transaction utilise. */
  function groupsOfType(type) {
    switch (type) {
      case 'Revenus': return ['Revenus'];
      case 'Factures': return ['Factures'];
      case 'Dépenses': return ['Dépenses'];
      case 'Épargnes': case "Reprise d'épargne": return ['Épargnes'];
      case 'Transfert de fonds': return ['Transferts'];
      case 'Remboursement': return ['Factures', 'Dépenses'];
      default: return [];
    }
  }

  function budget(p = U.period, y = U.year) {
    const out = { Revenus: {}, Factures: {}, 'Dépenses': {}, 'Épargnes': {}, reprises: {}, tot: { Revenus: 0, Factures: 0, 'Dépenses': 0, 'Épargnes': 0, reprises: 0 } };
    const facts = new Set(S.cfg.categories.Factures);
    for (const t of S.tx) {
      if (!inPeriod(t, p, y)) continue;
      let g = null, sign = 1;
      if (t.type === "Reprise d'épargne") { out.reprises[t.category] = (out.reprises[t.category] || 0) + t.amount; out.tot.reprises += t.amount; continue; }
      if (GROUPS.includes(t.type)) g = t.type;
      else if (t.type === 'Remboursement') { g = facts.has(t.category) ? 'Factures' : 'Dépenses'; sign = -1; }
      if (!g) continue;
      out[g][t.category] = (out[g][t.category] || 0) + sign * t.amount;
      out.tot[g] += sign * t.amount;
    }
    for (const k of Object.keys(out.tot)) out.tot[k] = r2(out.tot[k]);
    return out;
  }
  const planOf = (y = U.year) => S.cfg.plan[y] || {};
  function planned(group, cat, p = U.period, y = U.year) {
    const arr = planOf(y)[group]?.[cat]; if (!arr) return 0;
    return p === 'year' ? arr.reduce((a, b) => a + (+b || 0), 0) : (+arr[+p - 1] || 0);
  }
  const plannedTotal = (group, p = U.period, y = U.year) => r2(S.cfg.categories[group].reduce((a, c) => a + planned(group, c, p, y), 0));

  function balances() {
    const real = {}, fut = {};
    for (const a of S.cfg.accounts) { real[a.name] = a.start; fut[a.name] = a.start; }
    for (const t of S.tx) {
      for (const [b, ok] of [[real, t.pointed], [fut, true]]) {
        if (!ok) continue;
        if (t.from in b) b[t.from] -= t.amount;
        if (t.to in b) b[t.to] += t.amount;
      }
    }
    for (const k in real) { real[k] = r2(real[k]); fut[k] = r2(fut[k]); }
    return { real, fut };
  }
  function savingsByCat() {
    const m = {};
    for (const g of S.cfg.goals) m[g.category] = { start: g.start, saved: 0, taken: 0 };
    for (const t of S.tx) {
      if (!(t.category in m)) continue;
      if (t.type === 'Épargnes') m[t.category].saved += t.amount;
      if (t.type === "Reprise d'épargne") m[t.category].taken += t.amount;
    }
    return m;
  }
  function years() {
    const set = new Set([S.cfg.year, bm(todayStr()).y]);
    for (const t of S.tx) set.add(bm(t.date).y);
    for (const y of Object.keys(S.cfg.plan)) set.add(+y);
    return [...set].filter(y => y >= 1990 && y <= 2100).sort((a, b) => a - b);
  }
  function lastActiveMonth(y) {
    const tb = bm(todayStr());
    if (y < tb.y) return 12;
    let m = y === tb.y ? tb.m : 0;
    for (const t of S.tx) { const b = bm(t.date); if (b.y === y) m = Math.max(m, b.m); }
    return m || 1;
  }

  // ---------------------------------------------------------------- mutations
  function commit() { save(); renderSoon(); }
  function upsertTx(tx) {
    const i = S.tx.findIndex(t => t.id === tx.id);
    if (i >= 0) S.tx[i] = tx; else S.tx.push(tx);
    commit();
  }
  function removeTx(id) { S.tx = S.tx.filter(t => t.id !== id); commit(); }

  function categoryUsage(group, name) {
    let n = S.tx.filter(t => t.category === name && groupsOfType(t.type).includes(group)).length;
    return n;
  }
  function renameCategory(cfg, group, oldName, newName, withData) {
    const list = cfg.categories[group];
    const i = list.indexOf(oldName); if (i < 0) return;
    list[i] = newName;
    if (!withData) return;
    for (const t of S.tx) if (t.category === oldName && groupsOfType(t.type).includes(group)) t.category = newName;
    if (GROUPS.includes(group)) for (const y of Object.keys(cfg.plan)) {
      const g = cfg.plan[y][group]; if (g && g[oldName]) { g[newName] = g[oldName]; delete g[oldName]; }
    }
    if (group === 'Épargnes') cfg.goals.forEach(g => { if (g.category === oldName) g.category = newName; });
    if (group === 'Factures') cfg.loans.forEach(l => { if (l.category === oldName) l.category = newName; });
  }
  function accountUsage(name) { return S.tx.filter(t => t.from === name || t.to === name).length; }
  function renameAccount(cfg, acc, newName, withData) {
    const old = acc.name; acc.name = newName;
    if (!withData) return;
    for (const t of S.tx) { if (t.from === old) t.from = newName; if (t.to === old) t.to = newName; }
    cfg.goals.forEach(g => { if (g.account === old) g.account = newName; });
  }

  // ---------------------------------------------------------------- rendu général
  let renderTimer = null;
  function renderSoon() { clearTimeout(renderTimer); renderTimer = setTimeout(() => withFocus(render), 0); }
  function withFocus(fn) {
    const a = document.activeElement; const id = a && a.id; let ss = null, se = null;
    try { ss = a.selectionStart; se = a.selectionEnd; } catch (e) {}
    fn();
    if (id) {
      const el = document.getElementById(id);
      if (el && el !== document.activeElement) { el.focus({ preventScroll: true }); try { if (ss != null) el.setSelectionRange(ss, se); } catch (e) {} }
    }
  }

  function render() {
    if (!S) { renderOnboarding(); return; }
    applyLook(S.cfg);
    $('top').hidden = false;
    $('p-onboarding').hidden = true; $('p-onboarding').replaceChildren();
    $('sampleBanner').hidden = !S.cfg.sample;
    // sélecteurs de période
    const ys = years(); if (!ys.includes(U.year)) U.year = ys[ys.length - 1];
    const ysel = $('year'); ysel.replaceChildren(...ys.map(y => opt(String(y), String(y), y === U.year)));
    ysel.hidden = ys.length < 2;
    const ps = $('period'); ps.replaceChildren(...MONTHS.map((m, i) => opt(String(i + 1), ys.length < 2 ? `${m} ${U.year}` : m, String(i + 1) === U.period)), opt('year', ys.length < 2 ? `Année ${U.year}` : 'Année entière', U.period === 'year'));
    document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === U.tab)));
    for (const t of TABS) $('p-' + t).hidden = t !== U.tab;
    if (U.tab === 'apercu') renderApercu();
    if (U.tab === 'transactions') { refreshFormOptions(); renderExpress(); renderToSort(); renderRecurring(); renderList(); }
    if (U.tab === 'credits') renderCredits();
    if (U.tab === 'previsionnel') renderPlan();
    if (U.tab === 'epargne') renderEpargne();
    if (U.tab === 'reglages') renderSettings();
  }
  function showTab(tab) {
    if (!TABS.includes(tab)) tab = 'apercu';
    U.tab = tab; U.msg.recur = '';
    try { history.replaceState(null, '', '#' + tab); } catch (e) {}
    render();
    window.scrollTo({ top: 0 });
  }

  // ---------------------------------------------------------------- aperçu
  function prevPeriod() {
    if (U.period === 'year') return { p: 'year', y: U.year - 1, label: String(U.year - 1) };
    const m = +U.period; return m === 1 ? { p: '12', y: U.year - 1, label: `déc. ${U.year - 1}` } : { p: String(m - 1), y: U.year, label: MSHORT[m - 2].toLowerCase() + '.' };
  }
  function overCategories(b) {
    const out = [];
    for (const g of ['Dépenses', 'Factures']) for (const c of Object.keys(b[g])) {
      const p = planned(g, c), r = r2(b[g][c]);
      if (r > p + 0.5) out.push({ c, over: r2(r - p), p });
    }
    return out.sort((a, z) => z.over - a.over);
  }
  /** Ce qui reste encore à passer ce mois-ci, d'après le prévisionnel (catégorie par catégorie, jamais négatif). */
  /** Ce qui doit encore passer ce mois-ci d'après le prévisionnel, une fois retiré ce qui est déjà saisi. */
  function remainingThisMonth() {
    const tb = bm(todayStr()), p = String(tb.m), y = tb.y, b = budget(p, y);
    const group = (g, done, onlyIfNone) => {
      const items = [];
      for (const c of S.cfg.categories[g]) {
        const pl = planned(g, c, p, y), re = b[g][c] || 0;
        const left = onlyIfNone ? (re > 0 ? 0 : pl) : Math.max(0, pl - re);
        if (left >= 0.005) items.push({ cat: c, left: r2(left) });
      }
      let total = r2(items.reduce((s, i) => s + i.left, 0));
      // ce qui a été fait sous une autre catégorie compte aussi : on plafonne au reste global
      const cap = Math.max(0, r2(plannedTotal(g, p, y) - done));
      if (!onlyIfNone && total > cap) {
        let over = r2(total - cap);
        for (const i of items.slice().sort((x, z) => x.left - z.left)) { const cut = Math.min(i.left, over); i.left = r2(i.left - cut); over = r2(over - cut); if (over <= 0) break; }
        total = cap;
      }
      return { total: r2(total), items: items.filter(i => i.left >= 0.005).sort((x, z) => z.left - x.left), done: r2(done) };
    };
    const savAcc = new Set(S.cfg.accounts.filter(z => z.savings).map(z => z.name));
    // un simple virement vers un livret compte aussi comme de l'épargne faite
    const viaTransfer = r2(S.tx.filter(t => t.type === 'Transfert de fonds' && inPeriod(t, p, y)).reduce((s, t) => s + (savAcc.has(t.to) && !savAcc.has(t.from) ? t.amount : !savAcc.has(t.to) && savAcc.has(t.from) ? -t.amount : 0), 0));
    const inc = group('Revenus', b.tot.Revenus, true), bil = group('Factures', b.tot.Factures), sav = group('Épargnes', r2(b.tot['Épargnes'] - b.tot.reprises + Math.max(0, viaTransfer)));
    return {
      y, m: tb.m, inc, bil, sav,
      income: inc.total, bills: bil.total, savings: sav.total,
      spend: Math.max(0, r2(plannedTotal('Dépenses', p, y) - b.tot['Dépenses']))
    };
  }
  function renderCashHero(box) {
    const { real, fut } = balances();
    const cur = S.cfg.accounts.filter(a => a.current);
    const list = cur.length ? cur : S.cfg.accounts.filter(a => !a.savings);
    const totReal = r2(list.reduce((s, a) => s + real[a.name], 0));
    const totFut = r2(list.reduce((s, a) => s + fut[a.name], 0));
    const now = new Date();
    box.append(h('div', { class: 'hero-label', text: `Disponible sur tes comptes courants, le ${now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` }),
      h('div', { class: 'hero-num num' + (totReal < 0 ? ' neg' : '') }, moneyEl(totReal)));
    { // réglette du mois : un trait par jour, le jour courant marqué
      const tb = bm(todayStr()); const [st, en] = monthRange(tb.y, tb.m);
      const total = Math.round((en - st) / 864e5) + 1, done = Math.min(total, Math.max(1, Math.floor((now - st) / 864e5) + 1));
      const ruler = h('div', { class: 'ruler', role: 'img', 'aria-label': `Jour ${done} sur ${total} du mois budgétaire` });
      for (let i = 1; i <= total; i++) ruler.append(h('i', { class: (i < done ? 'past' : i === done ? 'now' : '') + (i % 5 === 0 ? ' major' : '') }));
      box.append(h('div', { class: 'ruler-wrap' }, ruler, h('span', { class: 'ruler-lbl', text: `${total - done} jour${total - done > 1 ? 's' : ''} avant la fin du mois` })));
    }
    // un chip par compte courant
    const chips = h('div', { class: 'acc-chips' });
    for (const a of list) {
      const r = real[a.name], f = fut[a.name], pending = r2(f - r);
      chips.append(h('div', { class: 'acc-chip' + (f < 0 ? ' low' : ''), style: `--ac:${a.color}` },
        h('span', { class: 'acc-name' }, h('i', { class: 'tok', 'aria-hidden': 'true' }), a.name),
        h('span', { class: 'acc-val num' + (r < 0 ? ' neg' : '') }, moneyEl(r)),
        h('span', { class: 'acc-sub', text: Math.abs(pending) >= 0.005 ? `${money(f)} après ${pending < 0 ? 'les débits' : 'les opérations'} en attente (${sgn(pending)})` : 'rien en attente' })));
    }
    box.append(chips);
    // reste à vivre jusqu'à la fin du mois en cours
    const rm = remainingThisMonth();
    const [, end] = monthRange(rm.y, rm.m); end.setHours(23, 59, 59);
    const daysLeft = Math.max(1, Math.ceil((end - now) / 864e5));
    const live = r2(totFut + rm.income - rm.bills - rm.savings);
    const txt = h('p', { class: 'hero-text' });
    const parts = [];
    if (rm.bills) parts.push(`${money(rm.bills)} de factures`);
    if (rm.savings) parts.push(`${money(rm.savings)} d’épargne`);
    if (rm.income) parts.push(`+${money(rm.income)} de revenus attendus`);
    const after = parts.length ? `En comptant ce qui doit encore passer ce mois-ci (${parts.join(', ')}), ` : 'Une fois les opérations en attente passées, ';
    const deMois = (m) => (/^[aeiouy]/i.test(MONTHS[m - 1]) ? 'd’' : 'de ') + MONTHS[m - 1].toLowerCase();
    const facts = [];
    if (rm.sav.done) facts.push(`${money(rm.sav.done)} d’épargne`);
    if (rm.bil.done) facts.push(`${money(rm.bil.done)} de factures`);
    if (facts.length) txt.append(`Déjà passé ce mois-ci : ${facts.join(' et ')}, c’est compris dans les soldes ci-dessus. `);
    if (live >= 0) {
      txt.append(after, 'il te restera ', h('b', { text: money(live) }), ` pour finir ${MONTHS[rm.m - 1].toLowerCase()}, soit `, h('b', { text: `${money(live / daysLeft)} par jour` }), ` sur ${daysLeft} jour${daysLeft > 1 ? 's' : ''}.`);
      if (rm.spend > live + 0.5) txt.append(` C’est ${money(r2(rm.spend - live))} de moins que ton budget dépenses restant (${money(rm.spend)}).`);
    } else {
      txt.append(after, 'il te manquera ', h('b', { class: 'neg', text: money(-live) }), ` sur tes comptes courants d’ici la fin ${deMois(rm.m)}. ${rm.savings ? 'Pense à réduire ou décaler un virement d’épargne encore prévu, ou à puiser dans une réserve.' : 'Pense à puiser dans une réserve ou à transférer depuis un autre compte.'}`);
    }
    box.append(txt);
    const det = [...rm.bil.items.map(i => [i.cat, -i.left, 'Facture', 'Factures']), ...rm.sav.items.map(i => [i.cat, -i.left, 'Épargne', 'Épargnes']), ...rm.inc.items.map(i => [i.cat, i.left, 'Revenu', 'Revenus'])];
    const skip = (g, c, v) => {
      const plan = (S.cfg.plan[rm.y] ||= {}); const arr = ((plan[g] ||= {})[c] ||= Array(12).fill(0));
      arr[rm.m - 1] = r2(Math.max(0, (+arr[rm.m - 1] || 0) - Math.abs(v))); U.heroOpen = true; commit();
      toast(`${c} : prévu d’${MONTHS[rm.m - 1].toLowerCase()} réduit de ${money(Math.abs(v))}.`);
    };
    if (det.length) box.append(h('details', { class: 'hero-det', open: !!U.heroOpen }, h('summary', { text: 'Ce qui est encore prévu ce mois-ci' }),
      h('ul', null, ...det.map(([c, v, k, g]) => h('li', null, h('span', { class: 'det-k', text: k }), h('span', { class: 'det-c', text: c }), h('span', { class: 'num' + (v > 0 ? ' pos' : ''), text: ' ' + sgn(v) }),
        h('button', { class: 'btn small ghost', type: 'button', text: 'Ne passera pas', title: 'Retirer ce montant du prévu de ce mois', onclick: () => skip(g, c, v) })))),
      h('p', { class: 'hint', text: 'Calculé avec ton prévisionnel : prévu du mois moins ce qui est déjà saisi. Si une ligne n’arrivera pas ce mois-ci, touche « Ne passera pas ».' })));
  }

  function renderApercu() {
    const b = budget(), t = b.tot;
    const pRev = plannedTotal('Revenus'), pF = plannedTotal('Factures'), pD = plannedTotal('Dépenses'), pE = plannedTotal('Épargnes');
    const netSave = r2(t['Épargnes'] - t.reprises);
    const reste = r2(t.Revenus - t.Factures - t['Dépenses'] - netSave);
    const rate = t.Revenus ? netSave / t.Revenus : 0;
    const overD = r2(t['Dépenses'] - pD);
    const lede = $('lede'); lede.replaceChildren();
    lede.className = 'hero';
    if (!S.tx.length) {
      lede.append(h('div', { class: 'hero-label', text: 'Bienvenue' }), h('p', { class: 'hero-text', text: 'Ton budget est prêt. Ajoute ta première transaction avec « + Transaction », puis remplis ton prévisionnel pour comparer prévu et réel.' }));
    } else renderCashHero(lede);
    // alertes
    const alerts = $('alerts'); alerts.replaceChildren();
    const alert = (cls, text, btnLabel, fn) => h('span', { class: 'alert ' + cls }, h('i'), text, btnLabel ? h('button', { type: 'button', text: btnLabel, onclick: fn }) : null);
    if (U.period !== 'year') {
      const st = recurStatus(U.year, +U.period).filter(x => !x.done);
      if (st.length) alerts.append(alert('info', `${st.length} opération${st.length > 1 ? 's' : ''} récurrente${st.length > 1 ? 's' : ''} à reporter`, 'Reporter', () => { postRecurring(st, U.year, +U.period); commit(); }));
    }
    const nSort = S.tx.filter(x => x.toSort).length;
    if (nSort) alerts.append(alert('info', `${nSort} opération${nSort > 1 ? 's' : ''} à classer`, 'Classer', () => showTab('transactions')));
    const unp = S.tx.filter(x => !x.pointed && inPeriod(x)).length;
    if (unp) alerts.append(alert('', `${unp} transaction${unp > 1 ? 's' : ''} non pointée${unp > 1 ? 's' : ''}`, 'Voir', () => { $('fp').value = '0'; showTab('transactions'); }));
    const over = overCategories(b);
    over.slice(0, 3).forEach(o => alerts.append(alert('bad', `${o.c} : +${money(o.over)} ${o.p ? 'au-dessus du prévu' : 'sans budget prévu'}`)));
    if (over.length > 3) alerts.append(alert('bad', `et ${over.length - 3} autre${over.length - 3 > 1 ? 's' : ''} catégorie${over.length - 3 > 1 ? 's' : ''} dépassée${over.length - 3 > 1 ? 's' : ''}`));
    // KPI avec variation
    const pp = prevPeriod(), pb = budget(pp.p, pp.y).tot, hasPrev = S.tx.some(x => inPeriod(x, pp.p, pp.y));
    const pReste = r2(pb.Revenus - pb.Factures - pb['Dépenses'] - (pb['Épargnes'] - pb.reprises));
    const delta = (cur, prev, upGood) => {
      if (!hasPrev) return null;
      const d = r2(cur - prev); if (Math.abs(d) < 0.005) return h('span', { class: 'delta mut', text: `= vs ${pp.label}` });
      const good = upGood ? d > 0 : d < 0;
      return h('span', { class: 'delta ' + (good ? 'pos' : 'neg'), text: `${d > 0 ? '▲' : '▼'} ${money(Math.abs(d))} vs ${pp.label}` });
    };
    const kpi = (lbl, val, sub, dl, cls) => h('div', { class: 'kpi' }, h('span', { class: 'lbl', text: lbl }), h('span', { class: 'val ' + (cls || ''), text: val }), dl, h('span', { class: 'sub', text: sub }));
    $('kpis').replaceChildren(
      kpi('Revenus', money(t.Revenus), `prévu ${money(pRev)}`, delta(t.Revenus, pb.Revenus, true)),
      kpi('Factures', money(t.Factures), `prévu ${money(pF)}`, delta(t.Factures, pb.Factures, false)),
      kpi('Dépenses', money(t['Dépenses']), `prévu ${money(pD)}`, delta(t['Dépenses'], pb['Dépenses'], false), overD > 0.004 && pD > 0 ? 'neg' : ''),
      kpi('Épargne nette', money(netSave), `prévu ${money(pE)}, dont ${money(t.reprises)} repris`, delta(netSave, r2(pb['Épargnes'] - pb.reprises), true)),
      kpi('Solde du mois', money(reste), 'revenus − factures − dépenses − épargne', delta(reste, pReste, true), reste < 0 ? 'neg' : '')
    );
    renderPace(t['Dépenses'], pD);
    renderAlloc(t, netSave);
    // comptes
    const { real, fut } = balances();
    const acc = h('div', { class: 'acc' }, h('span', { class: 'h', text: 'Compte' }), h('span', { class: 'h', style: 'text-align:right', text: 'Réel' }), h('span', { class: 'h', style: 'text-align:right', text: 'À venir' }));
    const row = (name, a, f, cls) => [h('span', { class: cls || '', text: name }), h('span', { class: 'num ' + (cls || '') + (a < 0 ? ' neg' : ''), style: 'text-align:right', text: money(a) }), h('span', { class: 'num mut ' + (cls || ''), style: 'text-align:right', text: money(f) })];
    let tr = 0, tf = 0;
    for (const [label, list] of [['Comptes courants', S.cfg.accounts.filter(a => a.current)], ['Épargne', S.cfg.accounts.filter(a => a.savings)], ['Autres comptes', S.cfg.accounts.filter(a => !a.current && !a.savings)]]) {
      if (!list.length) continue;
      acc.append(h('span', { class: 'sec', text: label }));
      for (const a of list) { acc.append(...row(a.name, real[a.name], fut[a.name])); tr += real[a.name]; tf += fut[a.name]; }
    }
    acc.append(...row('Total', r2(tr), r2(tf), 'tot'));
    $('accounts').replaceChildren(S.cfg.accounts.length ? acc : h('p', { class: 'mut', text: 'Aucun compte. Ajoute-en dans Réglages.' }));
    // plus grosses dépenses
    const top = S.tx.filter(x => x.type === 'Dépenses' && inPeriod(x)).sort((a, z) => z.amount - a.amount).slice(0, 6);
    $('top-note').textContent = `Les achats les plus importants de ${periodLabel()}.`;
    const tl = h('div', { class: 'toplist' });
    for (const x of top) tl.append(h('div', { class: 'toprow-i' },
      h('div', { style: 'min-width:0' }, h('div', { text: x.description || x.category }), h('div', { class: 'desc', text: `${x.category}, le ${x.date.slice(8, 10)}/${x.date.slice(5, 7)}` })),
      h('span', { class: 'num', text: money(x.amount) }),
      h('div', { class: 'bar' }, h('i', { style: `width:${x.amount / top[0].amount * 100}%;background:var(--ochre)` }))));
    $('top-spend').replaceChildren(top.length ? tl : h('p', { class: 'mut', text: 'Aucune dépense sur cette période.' }));
    // détail
    const tb = h('tbody');
    for (const g of GROUPS) {
      const cats = [...new Set([...S.cfg.categories[g], ...Object.keys(b[g])])];
      const rows = cats.map(c => ({ c, p: planned(g, c), r: r2(b[g][c] || 0) })).filter(x => x.p || x.r);
      const gp = plannedTotal(g), gr = t[g];
      const good = (p, r) => (g === 'Revenus' || g === 'Épargnes') ? r - p : p - r;
      const gd = r2(good(gp, gr));
      tb.append(h('tr', { class: 'group' }, h('td', { text: g }), h('td', { class: 'r num', text: money(gp) }), h('td', { class: 'r num', text: money(gr) }), h('td'), h('td', { class: 'r num ' + (gd < 0 ? 'neg' : 'pos'), text: sgn(gd) })));
      for (const x of rows) {
        const d = r2(good(x.p, x.r)), w = Math.min(100, x.p ? x.r / x.p * 100 : 100);
        const ov = (g === 'Factures' || g === 'Dépenses') && x.r > x.p + 0.005;
        const col = ov ? 'var(--bad)' : g === 'Dépenses' ? 'var(--ochre)' : g === 'Épargnes' ? 'var(--plum)' : g === 'Factures' ? 'var(--muted)' : 'var(--accent)';
        tb.append(h('tr', null, h('td', { text: x.c }), h('td', { class: 'r num mut', text: money(x.p) }), h('td', { class: 'r num', text: money(x.r) }),
          h('td', { style: 'width:22%' }, h('div', { class: 'bar' }, h('i', { style: `width:${Math.max(0, w)}%;background:${col}` }))),
          h('td', { class: 'r num ' + (Math.abs(d) < 0.005 ? 'mut' : d < 0 ? 'neg' : 'pos'), text: sgn(d) })));
      }
    }
    $('detail').replaceChildren(h('thead', null, h('tr', null, h('th', { text: 'Catégorie' }), h('th', { class: 'r', text: 'Prévu' }), h('th', { class: 'r', text: 'Réel' }), h('th', { text: 'Consommé' }), h('th', { class: 'r', text: 'Écart' }))), tb);
    $('split-note').textContent = `Factures et dépenses de ${periodLabel()}, par catégorie.`;
    drawMonths(); drawSplit(); drawWorth();
  }

  /** Rythme des dépenses variables sur la période : jauge, reste par jour, projection. */
  function renderPace(spent, plan) {
    const box = $('pace');
    let a, z;
    if (U.period === 'year') { a = monthRange(U.year, 1)[0]; z = monthRange(U.year, 12)[1]; } else [a, z] = monthRange(U.year, +U.period);
    const DAY = 864e5, now = new Date(); now.setHours(12, 0, 0, 0);
    a.setHours(12, 0, 0, 0); z.setHours(12, 0, 0, 0);
    const total = Math.round((z - a) / DAY) + 1;
    const state = now < a ? 'future' : now > z ? 'past' : 'current';
    const elapsed = state === 'current' ? Math.round((now - a) / DAY) + 1 : state === 'past' ? total : 0;
    const left = total - elapsed;
    const remain = r2(plan - spent);
    $('pace-note').textContent = U.period === 'year' ? `Dépenses variables de l'année ${U.year} face au prévu.` : `Dépenses variables du ${dfmt(a)} au ${dfmt(z)} face au prévu.`;
    if (!plan && !spent) { box.replaceChildren(h('p', { class: 'mut', text: 'Aucune dépense ni budget prévu sur cette période. Remplis le prévisionnel pour suivre ton rythme.' })); return; }
    const scale = Math.max(plan, spent) || 1;
    const meter = h('div', { class: 'meter', role: 'img', 'aria-label': `${money(spent)} dépensés sur ${money(plan)} prévus` },
      h('i', { style: `width:${Math.min(100, spent / scale * 100)}%;background:${spent > plan ? 'var(--bad)' : 'var(--ochre)'}` }));
    if (state === 'current' && plan) meter.append(h('b', { title: 'Rythme attendu à date', style: `left:calc(${Math.min(100, plan * elapsed / total / scale * 100)}% - 1px)` }));
    const figs = h('div', { class: 'pace-figs' });
    const fig = (val, lbl, cls) => h('div', null, h('b', { class: cls || '', text: val }), h('small', { text: lbl }));
    figs.append(fig(money(spent), `dépensés sur ${money(plan)}`, spent > plan && plan ? 'neg' : ''));
    figs.append(fig(money(Math.abs(remain)), remain >= 0 ? 'restants' : 'de dépassement', remain < 0 ? 'neg' : ''));
    if (state === 'current') {
      figs.append(remain > 0 && left > 0 ? fig(money(remain / left), `par jour sur les ${left} jour${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}`) : fig('0 €', `de marge pour les ${left} jour${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}`, 'neg'));
      const proj = r2(spent / Math.max(1, elapsed) * total);
      figs.append(fig(money(proj), 'projection en fin de période', plan && proj > plan ? 'neg' : ''));
    }
    box.replaceChildren(meter, h('div', { class: 'meter-legend' }, h('span', { text: state === 'current' && plan ? 'Le trait marque où tu devrais en être aujourd’hui' : '' }), h('span', { text: `${Math.round(plan ? spent / plan * 100 : 100)} %` })), figs);
  }

  /** Ce que deviennent les revenus : factures, dépenses, épargne nette, reste. */
  function renderAlloc(t, netSave) {
    const box = $('alloc'); const R = t.Revenus;
    if (R <= 0) { box.replaceChildren(h('p', { class: 'mut', text: 'Aucun revenu sur cette période.' })); return; }
    const parts = [['Factures', t.Factures, 'var(--muted)'], ['Dépenses', t['Dépenses'], 'var(--ochre)'], ['Épargne nette', Math.max(0, netSave), 'var(--plum)']];
    const used = parts.reduce((a, p) => a + p[1], 0), rest = r2(R - used);
    if (rest > 0) parts.push(['Reste', rest, 'var(--accent)']);
    const base = Math.max(R, used);
    const bar = h('div', { class: 'alloc', role: 'img', 'aria-label': 'Répartition des revenus' }, ...parts.filter(p => p[1] > 0).map(p => h('i', { style: `width:${p[1] / base * 100}%;background:${p[2]}`, title: `${p[0]} ${money(p[1])}` })));
    const list = h('div', { class: 'alloc-list' }, ...parts.map(p => h('div', null, h('i', { class: 'sw', style: `background:${p[2]}` }), h('span', { text: p[0] }), h('span', { class: 'num', text: money(r2(p[1])) }), h('span', { class: 'p', text: pct.format(p[1] / R) }))));
    box.replaceChildren(...[bar, list,
      rest < 0 ? h('p', { class: 'warn', style: 'margin:8px 0 0', text: `Tes sorties et ton épargne dépassent tes revenus de ${money(-rest)} sur la période.` }) : null,
      h('p', { class: 'hint', style: 'margin:10px 0 0', text: 'Repère courant : environ 50 % pour les charges fixes, 30 % pour les envies, 20 % pour l’épargne.' })].filter(Boolean));
  }

  /** Avoirs et patrimoine net (avoirs − crédits restants) à la fin de chaque mois. */
  function worthSeries() {
    const last = lastActiveMonth(U.year), pts = [];
    const sorted = S.tx.map(t => ({ t, b: bm(t.date) })).map(x => ({ ...x, i: mIdx(x.b.y, x.b.m) }));
    const startBal = S.cfg.accounts.reduce((a, x) => a + x.start, 0);
    const accSet = new Set(accNames());
    for (let m = 1; m <= last; m++) {
      const lim = mIdx(U.year, m); let assets = startBal, debt = 0;
      for (const { t, i } of sorted) if (i <= lim) { if (accSet.has(t.from)) assets -= t.amount; if (accSet.has(t.to)) assets += t.amount; }
      for (const l of S.cfg.loans) {
        const tot = l.capital + l.interest; let paid = l.paidBefore;
        for (const { t, i } of sorted) if (i <= lim && t.type === 'Factures' && t.category === l.category && t.date <= todayStr()) paid += t.amount;
        debt += Math.max(0, tot - paid);
      }
      pts.push({ m, assets: r2(assets), net: r2(assets - debt) });
    }
    return pts;
  }
  function drawWorth() {
    const box = $('ch-worth'); const W = box.clientWidth; if (!W) return;
    const pts = worthSeries(); const hasDebt = S.cfg.loans.length > 0;
    if (!pts.length) { box.replaceChildren(); return; }
    const series = [{ k: 'assets', label: 'Avoirs', color: 'var(--accent)' }]; if (hasDebt) series.push({ k: 'net', label: 'Net de crédits', color: 'var(--plum)' });
    const H = 200, m = { t: 12, r: 0, b: 24, l: 0 };
    const vals = pts.flatMap(p => series.map(s => p[s.k]));
    const step = niceStep(Math.max(1, Math.max(...vals) - Math.min(0, ...vals)));
    const lo = Math.min(0, Math.floor(Math.min(...vals) / step) * step), hi = Math.ceil(Math.max(...vals) / step) * step || step;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Évolution du patrimoine' });
    box.replaceChildren(svg);
    const ticks = []; for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
    m.l = measure(svg, ticks.map(v => fmt0.format(v))) + 8;
    const endLabels = series.map(s => `${s.label} ${fmt0.format(pts[pts.length - 1][s.k])}`);
    m.r = Math.min(W * 0.4, measure(svg, endLabels) + 10);
    const iw = W - m.l - m.r, ih = H - m.t - m.b, n = pts.length;
    const x = (i) => m.l + (n > 1 ? i / (n - 1) : 0.5) * iw, y = (v) => m.t + ih - (v - lo) / (hi - lo) * ih;
    for (const v of ticks) { svg.append(s('line', { x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v), stroke: 'var(--line)' })); const t = s('text', { x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end' }); t.textContent = fmt0.format(v); svg.append(t); }
    pts.forEach((p, i) => { if (W < 420 && i % 2 && i !== n - 1) return; const t = s('text', { x: x(i), y: H - 6, 'text-anchor': 'middle' }); t.textContent = MSHORT[p.m - 1]; svg.append(t); });
    const ends = [];
    series.forEach(sr => {
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[sr.k]).toFixed(1)}`).join('');
      svg.append(s('path', { d, fill: 'none', stroke: sr.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      const lp = pts[n - 1]; svg.append(s('circle', { cx: x(n - 1), cy: y(lp[sr.k]), r: 3.5, fill: sr.color }));
      ends.push({ y: y(lp[sr.k]), text: `${sr.label} ${fmt0.format(lp[sr.k])}`, color: sr.color });
    });
    ends.sort((a, b) => a.y - b.y); for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
    ends.forEach(e => { const t = s('text', { x: x(n - 1) + 8, y: e.y + 4, style: `fill:${e.color};font-weight:600` }); t.textContent = e.text; svg.append(t); });
    const tip = tipFor(box);
    const rule = s('line', { y1: m.t, y2: m.t + ih, stroke: 'var(--muted)', 'stroke-dasharray': '3 3', style: 'display:none' }); svg.append(rule);
    const hit = s('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' }); svg.append(hit);
    hit.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect(), sc = r.width / W; const px = (e.clientX - r.left) / sc;
      const i = Math.max(0, Math.min(n - 1, Math.round((px - m.l) / iw * (n - 1)))); const p = pts[i];
      rule.setAttribute('x1', x(i)); rule.setAttribute('x2', x(i)); rule.style.display = '';
      tip.replaceChildren(h('div', { class: 'h', text: `fin ${MONTHS[p.m - 1].toLowerCase()} ${U.year}` }), ...series.map(sr => h('div', null, h('i', { class: 'sw', style: `background:${sr.color}` }), `${sr.label} ${money(p[sr.k])}`)), hasDebt ? h('div', { class: 'h', text: `Crédits restants ${money(r2(p.assets - p.net))}` }) : null);
      placeTip(box, tip, x(i) * sc, y(Math.max(...series.map(sr => p[sr.k]))) * sc);
    });
    hit.addEventListener('mouseleave', () => { tip.hidden = true; rule.style.display = 'none'; });
    box.append(tip);
  }

  function tipFor(box) { let t = box.querySelector('.tip'); if (!t) t = h('div', { class: 'tip', hidden: true }); box.append(t); return t; }
  function placeTip(box, tip, x, y) {
    tip.hidden = false;
    const bw = box.clientWidth, tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(bw - tw, x - tw / 2)) + 'px';
    tip.style.top = Math.max(0, y - tip.offsetHeight - 10) + 'px';
  }
  function measure(svg, texts) {
    let w = 0; for (const tx of texts) { const t = s('text'); t.textContent = tx; svg.append(t); w = Math.max(w, t.getComputedTextLength()); t.remove(); } return w;
  }
  function niceStep(max) { const raw = max / 5; const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }

  function drawMonths() {
    const box = $('ch-months'); const W = box.clientWidth; if (!W) return;
    const H = 230, m = { t: 10, r: 6, b: 24, l: 0 };
    const data = MONTHS.map((_, i) => { const b = budget(String(i + 1)).tot; return { i, rev: b.Revenus, out: r2(b.Factures + b['Dépenses']), ep: b['Épargnes'] }; });
    const max = Math.max(1, ...data.map(d => Math.max(d.rev, d.out, d.ep)));
    const step = niceStep(max), top = Math.ceil(max / step) * step;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Revenus, sorties et épargne par mois' });
    box.replaceChildren(svg);
    const ticks = []; for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
    m.l = measure(svg, ticks.map(v => fmt0.format(v))) + 8;
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const y = (v) => m.t + ih - v / top * ih;
    for (const v of ticks) {
      svg.append(s('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: 'var(--line)', 'stroke-width': 1 }));
      const t = s('text', { x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end' }); t.textContent = fmt0.format(v); svg.append(t);
    }
    const bw = iw / 12, bwid = Math.max(2, Math.min(14, (bw - 8) / 3));
    const sel = U.period === 'year' ? -1 : +U.period - 1;
    const tip = tipFor(box);
    data.forEach(d => {
      const x0 = m.l + d.i * bw + (bw - bwid * 3 - 4) / 2;
      if (d.i === sel) svg.append(s('rect', { x: m.l + d.i * bw + 1, y: m.t, width: bw - 2, height: ih, fill: 'var(--sunk)', rx: 6 }));
      [['rev', 'var(--accent)'], ['out', 'var(--ochre)'], ['ep', 'var(--plum)']].forEach(([k, c], j) => {
        const v = d[k]; if (v <= 0) return;
        svg.append(s('rect', { x: x0 + j * (bwid + 2), y: y(v), width: bwid, height: Math.max(1, y(0) - y(v)), fill: c, rx: Math.min(3, bwid / 2) }));
      });
      const lab = s('text', { x: m.l + d.i * bw + bw / 2, y: H - 6, 'text-anchor': 'middle' }); lab.textContent = W < 520 ? MSHORT[d.i].slice(0, 1) : MSHORT[d.i];
      if (d.i === sel) lab.setAttribute('style', 'fill:var(--fg);font-weight:600');
      svg.append(lab);
      const hit = s('rect', { x: m.l + d.i * bw, y: m.t, width: bw, height: ih + m.b, fill: 'transparent', style: 'cursor:pointer' });
      const show = () => {
        tip.replaceChildren(h('div', { class: 'h', text: `${MONTHS[d.i]} ${U.year}` }),
          h('div', null, h('i', { class: 'sw', style: 'background:var(--accent)' }), `Revenus ${money(d.rev)}`),
          h('div', null, h('i', { class: 'sw', style: 'background:var(--ochre)' }), `Factures + dépenses ${money(d.out)}`),
          h('div', null, h('i', { class: 'sw', style: 'background:var(--plum)' }), `Épargne ${money(d.ep)}`),
          h('div', { class: 'h', text: `Reste ${money(r2(d.rev - d.out))}` }));
        placeTip(box, tip, m.l + d.i * bw + bw / 2, y(Math.max(d.rev, d.out, d.ep)));
      };
      hit.addEventListener('mouseenter', show);
      hit.addEventListener('mouseleave', () => tip.hidden = true);
      hit.addEventListener('click', () => { U.period = String(d.i + 1); render(); });
      svg.append(hit);
    });
    box.append(tip);
  }

  function drawSplit() {
    const box = $('ch-split'); const W = box.clientWidth; if (!W) return;
    const b = budget();
    const items = [...Object.entries(b['Dépenses']).map(([c, v]) => ({ c, v, g: 'D' })), ...Object.entries(b.Factures).map(([c, v]) => ({ c, v, g: 'F' }))].filter(x => x.v > 0.004).sort((a, z) => z.v - a.v).slice(0, 10);
    if (!items.length) { box.replaceChildren(h('p', { class: 'mut', text: 'Aucune facture ni dépense sur cette période.' })); return; }
    const rowH = 26, H = items.length * rowH;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Sorties par catégorie' });
    box.replaceChildren(svg);
    const lw = Math.min(measure(svg, items.map(i => i.c)), W * 0.42), vw = measure(svg, items.map(i => money(i.v)));
    const x0 = lw + 10, x1 = W - vw - 8, max = items[0].v;
    items.forEach((it, i) => {
      const yc = i * rowH + rowH / 2;
      const a = s('text', { x: lw, y: yc + 4, 'text-anchor': 'end' }); a.textContent = it.c.length > 28 ? it.c.slice(0, 27) + '…' : it.c; svg.append(a);
      const w = Math.max(2, (x1 - x0 - 6) * it.v / max);
      svg.append(s('rect', { x: x0, y: yc - 7, width: w, height: 14, rx: 4, fill: it.g === 'D' ? 'var(--ochre)' : 'var(--muted)', 'fill-opacity': it.g === 'D' ? 1 : 0.55 }));
      const v = s('text', { x: x0 + w + 6, y: yc + 4, style: 'fill:var(--fg)' }); v.textContent = money(it.v); svg.append(v);
    });
  }

  // ---------------------------------------------------------------- transactions
  function fillSelect(sel, values, keep) {
    const cur = keep ?? sel.value;
    sel.replaceChildren(...values.map(v => opt(v)));
    if (values.includes(cur)) sel.value = cur;
  }
  function refreshFormOptions() {
    { const cur = $('fa').value; $('fa').replaceChildren(opt('', 'Tous les comptes'), ...accNames().map(n => opt(n, n, n === cur))); }
    fillSelect($('f-cat'), catsFor($('f-type').value));
    const accs = ['Externe', ...accNames()];
    fillSelect($('f-from'), accs); fillSelect($('f-to'), accs);
  }
  function goalAccount(cat) { return S.cfg.goals.find(g => g.category === cat)?.account || savingsAccs()[0] || mainAcc(); }
  function applyDefaults(catOnly) {
    const t = $('f-type').value, c = $('f-cat').value;
    if (catOnly && !(t === 'Épargnes' || t === "Reprise d'épargne")) return;
    const last = U.lastAcc[t];
    let pair;
    if (t === 'Épargnes') pair = [last?.[0] || mainAcc(), goalAccount(c)];
    else if (t === "Reprise d'épargne") pair = [goalAccount(c), last?.[1] || mainAcc()];
    else if (last) pair = last;
    else if (t === 'Revenus' || t === 'Remboursement') pair = ['Externe', mainAcc()];
    else if (t === 'Transfert de fonds') pair = [mainAcc(), S.cfg.accounts.find(a => a.name !== mainAcc())?.name || 'Externe'];
    else pair = [mainAcc(), 'Externe'];
    $('f-from').value = pair[0]; $('f-to').value = pair[1];
  }
  function resetForm() {
    U.editing = null;
    $('form-title').textContent = 'Nouvelle transaction';
    $('f-submit').textContent = 'Ajouter';
    $('f-cancel').hidden = true;
    const tb = bm(todayStr());
    $('f-date').value = (U.period === 'year' || (U.year === tb.y && +U.period === tb.m)) ? todayStr() : (() => { const [a] = monthRange(U.year, +U.period); return isoOf(a); })();
    $('f-amount').value = ''; $('f-desc').value = ''; $('f-pointed').checked = true; $('f-err').textContent = '';
    if (!$('f-type').value) $('f-type').value = 'Dépenses';
    refreshFormOptions(); applyDefaults();
  }
  function editTx(t) {
    U.editing = t.id;
    $('form-title').textContent = 'Modifier la transaction';
    $('f-submit').textContent = 'Enregistrer';
    $('f-cancel').hidden = false;
    $('f-date').value = t.date; $('f-amount').value = num2.format(t.amount);
    $('f-type').value = t.type; refreshFormOptions();
    if (![...$('f-cat').options].some(o => o.value === t.category)) $('f-cat').append(opt(t.category));
    $('f-cat').value = t.category;
    for (const [id, v] of [['f-from', t.from], ['f-to', t.to]]) { if (![...$(id).options].some(o => o.value === v)) $(id).append(opt(v)); $(id).value = v; }
    $('f-desc').value = t.description || ''; $('f-pointed').checked = !!t.pointed; $('f-err').textContent = ''; $('f-ok').textContent = '';
    $('c-form').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    $('f-amount').focus();
  }
  function onSubmit(e) {
    e.preventDefault();
    const err = $('f-err'); err.textContent = ''; $('f-ok').textContent = '';
    const date = $('f-date').value;
    const amount = r2(parseNum($('f-amount').value));
    const from = $('f-from').value, to = $('f-to').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { err.textContent = 'Indique une date complète.'; return; }
    if (!(amount > 0)) { err.textContent = 'Indique un montant positif, par exemple 12,50.'; return; }
    if (!$('f-cat').value) { err.textContent = 'Choisis une catégorie. Tu peux en créer dans Réglages.'; return; }
    if (from === to) { err.textContent = '« Depuis » et « Vers » doivent être deux comptes différents.'; return; }
    const tx = { id: U.editing || uid(), date, amount, type: $('f-type').value, category: $('f-cat').value, from, to, description: $('f-desc').value.trim(), pointed: $('f-pointed').checked };
    const prevTx = U.editing && S.tx.find(x => x.id === U.editing); if (prevTx?.recurId) tx.recurId = prevTx.recurId;
    const wasEdit = !!U.editing;
    U.lastAcc[tx.type] = [from, to];
    upsertTx(tx);
    const keep = { type: tx.type, cat: tx.category, date };
    resetForm();
    if (!wasEdit) { $('f-type').value = keep.type; refreshFormOptions(); $('f-cat').value = keep.cat; applyDefaults(); $('f-date').value = keep.date; }
    $('f-ok').textContent = wasEdit ? 'Transaction modifiée.' : `${money(amount)} ajoutés en ${tx.category}.`;
    $('f-amount').focus();
  }
  function typeChip(type) {
    const cls = type === 'Revenus' ? 'c-rev' : type === 'Factures' ? 'c-fac' : type === 'Dépenses' ? 'c-dep' : (type === 'Épargnes' || type === "Reprise d'épargne") ? 'c-ep' : 'c-oth';
    const label = type === "Reprise d'épargne" ? 'Reprise' : type === 'Transfert de fonds' ? 'Transfert' : type;
    return h('span', { class: 'chip ' + cls, text: label });
  }
  function renderList() {
    const q = $('q').value.trim().toLowerCase(), ft = $('ft').value, fp = $('fp').value;
    const fa = accNames().includes($('fa').value) ? $('fa').value : '';
    let rows = S.tx.filter(t => inPeriod(t));
    if (fa) rows = rows.filter(t => t.from === fa || t.to === fa);
    // solde du compte après chaque opération (toutes dates, pointées ou non)
    const run = {};
    if (fa) {
      let bal = S.cfg.accounts.find(x => x.name === fa).start;
      for (const t of S.tx.filter(t => t.from === fa || t.to === fa).sort((x, y) => x.date.localeCompare(y.date) || String(x.id).localeCompare(String(y.id)))) {
        if (t.from === fa) bal -= t.amount; if (t.to === fa) bal += t.amount; run[t.id] = r2(bal);
      }
    }
    if (ft) rows = rows.filter(t => t.type === ft);
    if (fp) rows = rows.filter(t => String(+!!t.pointed) === fp);
    if (q) rows = rows.filter(t => [t.category, t.description, t.type, t.from, t.to, money(t.amount), String(t.amount)].join(' ').toLowerCase().includes(q));
    rows.sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
    const unp = rows.filter(t => !t.pointed).length;
    $('list-title').textContent = `Transactions ${U.period === 'year' ? 'de ' + U.year : (/^[aeiouy]/i.test(MONTHS[+U.period - 1]) ? 'd’' : 'de ') + MONTHS[+U.period - 1].toLowerCase() + ' ' + U.year}`;
    $('list-note').textContent = `${rows.length} transaction${rows.length > 1 ? 's' : ''}${unp ? `, dont ${unp} non pointée${unp > 1 ? 's' : ''}` : ''}. Coche pour pointer, « Modifier » pour corriger.`;
    renderReconcile(fa);
    const tb = h('tbody');
    for (const t of rows) {
      const sg = fa ? (t.to === fa ? 1 : -1) : (t.type === 'Revenus' || t.type === 'Remboursement') ? 1 : (t.type === 'Dépenses' || t.type === 'Factures') ? -1 : 0;
      const mainA = t.from !== 'Externe' ? t.from : t.to;
      const cb = h('input', { type: 'checkbox', 'aria-label': 'Pointée', checked: t.pointed });
      cb.addEventListener('change', () => { t.pointed = cb.checked; commit(); });
      const acts = h('div', { class: 'acts' });
      const del = h('button', { class: 'btn small danger a-del', type: 'button', text: 'Supprimer' });
      del.addEventListener('click', () => {
        acts.replaceChildren(h('span', { class: 'mut', style: 'font-size:12px;align-self:center', text: 'Supprimer ?' }),
          h('button', { class: 'btn small danger', type: 'button', text: 'Oui', onclick: () => removeTx(t.id) }),
          h('button', { class: 'btn small', type: 'button', text: 'Non', onclick: () => renderList() }));
      });
      const mk = h('button', { class: 'btn small ghost a-recur', type: 'button', text: '↻', title: t.recurId ? 'Issue d’une récurrente' : 'Rendre récurrente (chaque mois)', 'aria-label': 'Rendre récurrente', disabled: !!t.recurId || null,
        onclick: () => { recurFromTx(t); U.recurOpen = true; U.msg.recur = `« ${t.description || t.category} » ajoutée aux récurrentes (chaque mois le ${+t.date.slice(8, 10)}).`; commit(); setTimeout(() => $('c-recur').scrollIntoView({ behavior: 'smooth' }), 50); } });
      acts.append(mk, h('button', { class: 'btn small a-edit', type: 'button', text: 'Modifier', onclick: () => editTx(t) }), del);
      tb.append(h('tr', { class: (t.pointed ? '' : 'unpointed') + ' acc-row', style: mainA !== 'Externe' ? `--ac:${accColor(mainA)}` : null },
        h('td', { class: 't-cb' }, cb),
        h('td', { class: 'num t-date', text: `${t.date.slice(8, 10)}/${t.date.slice(5, 7)}` }),
        h('td', { class: 't-main' }, h('div', null, typeChip(t.type), ' ', t.category), h('div', { class: 'desc tx-accs' }, ...[t.description ? h('span', { class: 'tx-desc', text: t.description }) : null, accPill(t.from), h('span', { class: 'arr', text: '→' }), accPill(t.to)].filter(Boolean))),
        h('td', { class: 'r num t-amt ' + (sg > 0 ? 'pos' : '') }, ...[(sg > 0 ? '+' : sg < 0 ? '−' : '') + money(t.amount), fa ? h('div', { class: 'run-bal' + (run[t.id] < 0 ? ' neg' : ''), text: 'solde ' + money(run[t.id]) }) : null].filter(Boolean)),
        h('td', { class: 't-acts' }, acts)));
    }
    if (!rows.length) tb.append(h('tr', null, h('td', { colspan: 5, class: 'mut', style: 'text-align:center;padding:24px', text: S.tx.length ? 'Aucune transaction ne correspond sur cette période.' : 'Aucune transaction pour l’instant. Ajoute la première avec le formulaire.' })));
    $('txlist').replaceChildren(h('thead', null, h('tr', null, h('th', { text: '✓' }), h('th', { text: 'Date' }), h('th', { text: 'Catégorie' }), h('th', { class: 'r', text: 'Montant' }), h('th'))), tb);
  }

  /** Rapprochement : comparer le solde calculé à celui affiché par la banque. */
  function renderReconcile(fa) {
    const box = $('reconcile');
    if (!fa) { box.hidden = true; box.replaceChildren(); return; }
    if (box.contains(document.activeElement) && !box.hidden && box.dataset.acc === fa) return;
    box.dataset.acc = fa;
    const acc = S.cfg.accounts.find(x => x.name === fa);
    const { real, fut } = balances();
    const r = real[fa], f = fut[fa];
    const unp = S.tx.filter(t => !t.pointed && (t.from === fa || t.to === fa));
    const inp = h('input', { type: 'text', inputmode: 'decimal', id: 'rec-bank', placeholder: 'Solde affiché par ta banque', 'aria-label': 'Solde affiché par ta banque' });
    const out = h('p', { class: 'hint', style: 'margin:6px 0 0' });
    const fix = h('button', { class: 'btn small', type: 'button', text: 'Recaler' }); fix.hidden = true;
    const check = () => {
      const v = parseNum(inp.value); fix.hidden = true;
      if (!inp.value.trim() || !Number.isFinite(v)) { out.textContent = ''; return; }
      const d = r2(v - r);
      if (Math.abs(d) < 0.005) { out.textContent = 'Parfait, le solde pointé correspond à ta banque.'; return; }
      const same = S.tx.filter(t => (t.from === fa || t.to === fa) && Math.abs(t.amount - Math.abs(d)) < 0.005).slice(-3);
      const pend = unp.reduce((s, t) => s + (t.to === fa ? t.amount : -t.amount), 0);
      let tip = '';
      if (Math.abs(r2(pend) - d) < 0.005) tip = ' C’est exactement le montant des opérations non pointées : pointe-les si elles sont passées.';
      else if (same.length) tip = ` Une opération de ${money(Math.abs(d))} existe déjà (${same.map(t => `${t.date.slice(8, 10)}/${t.date.slice(5, 7)} ${t.description || t.category}`).join(', ')}) : vérifie un doublon, un oubli ou un sens inversé.`;
      else tip = ' Filtre ce compte mois par mois et compare avec tes relevés pour trouver l’opération manquante, ou recale le solde de départ.';
      out.textContent = `Écart de ${sgn(d)} entre ta banque et l’app.${tip}`;
      fix.hidden = false;
      fix.onclick = () => { acc.start = r2(acc.start + d); box.dataset.acc = ''; document.activeElement?.blur(); commit(); toast(`Solde de départ de ${fa} ajusté de ${sgn(d)}. Le solde pointé est maintenant ${money(v)}.`); };
    };
    inp.addEventListener('input', check);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !fix.hidden) fix.click(); });
    box.hidden = false;
    box.style.setProperty('--ac', acc.color);
    box.replaceChildren(
      h('div', { class: 'rec-top' }, ...[accPill(fa),
        h('span', null, 'Pointé ', h('b', { class: 'num' + (r < 0 ? ' neg' : ''), text: money(r) })),
        unp.length ? h('span', { class: 'mut' }, `Avec ${unp.length} non pointée${unp.length > 1 ? 's' : ''} : `, h('b', { class: 'num', text: money(f) })) : null].filter(Boolean)),
      h('div', { class: 'addrow', style: 'margin-top:8px' }, inp, fix), out,
      h('p', { class: 'hint', style: 'margin:6px 0 0', text: 'Recaler modifie le solde de départ du compte : tes statistiques ne bougent pas, seul le solde est corrigé.' }));
  }

  // ---------------------------------------------------------------- opérations récurrentes
  const mIdx = (y, m) => y * 12 + m - 1;
  const ymOf = (i) => ({ y: Math.floor(i / 12), m: (i % 12) + 1 });
  const ymStr = (y, m) => `${y}-${pad2(m)}`;
  const parseYm = (s) => { const [y, m] = s.split('-').map(Number); return mIdx(y, m); };
  const daysIn = (y, m) => new Date(y, m, 0).getDate();
  const monthName = (y, m) => `${MONTHS[m - 1].toLowerCase()} ${y}`;

  function isDue(r, y, m) {
    if (!r.active || !r.start) return false;
    const i = mIdx(y, m), s = parseYm(r.start);
    if (i < s) return false;
    if (r.end && i > parseYm(r.end)) return false;
    return (i - s) % (r.every || 1) === 0;
  }
  /** Date calendaire d'une récurrente pour un mois budgétaire donné (tient compte du jour de début). */
  function recurDate(r, y, m) {
    let first = null;
    for (const d of [0, -1, 1]) {
      const { y: cy, m: cm } = ymOf(mIdx(y, m) + d);
      const date = `${cy}-${pad2(cm)}-${pad2(Math.min(r.day, daysIn(cy, cm)))}`;
      if (!first) first = date;
      const b = bm(date); if (b.y === y && b.m === m) return date;
    }
    return first;
  }
  function recurStatus(y, m) {
    return S.cfg.recurring.filter(r => isDue(r, y, m)).map(r => ({
      r, date: recurDate(r, y, m),
      done: S.tx.some(t => t.recurId === r.id && (() => { const b = bm(t.date); return b.y === y && b.m === m; })())
    }));
  }
  function postRecurring(items, y, m) {
    let n = 0;
    for (const { r, done } of items) {
      if (done) continue;
      S.tx.push({ id: uid(), date: recurDate(r, y, m), amount: r.amount, type: r.type, category: r.category, from: r.from, to: r.to, description: r.label, pointed: r.pointed, recurId: r.id });
      n++;
    }
    return n;
  }
  function recurFromTx(t) {
    const b = bm(t.date);
    const r = { id: uid(), label: t.description || t.category, type: t.type, category: t.category, from: t.from, to: t.to, amount: t.amount, day: +t.date.slice(8, 10), every: 1, start: ymStr(b.y, b.m), end: '', pointed: false, active: true };
    S.cfg.recurring.push(r); t.recurId = r.id;
    return r;
  }
  /** Repère dans l'historique récent les opérations qui reviennent chaque mois et ne sont pas encore des récurrentes. */
  function suggestRecurring() {
    const tb = bm(todayStr()), cur = mIdx(tb.y, tb.m);
    const groups = new Map();
    const keyOf = (t) => {
      if (t.type === 'Remboursement') return null;
      if (t.type === 'Dépenses') return t.description ? `D|${t.category}|${t.description.toLowerCase()}` : null;
      if (t.type === 'Transfert de fonds') return `T|${t.category}|${t.from}|${t.to}`;
      if (t.type === 'Épargnes' || t.type === "Reprise d'épargne") return `${t.type}|${t.category}|${t.from}|${t.to}`;
      return `${t.type}|${t.category}|${t.from}|${t.to}`;
    };
    for (const t of S.tx) {
      const b = bm(t.date), i = mIdx(b.y, b.m);
      if (i < cur - 3 || i > cur) continue;
      const k = keyOf(t); if (!k) continue;
      const g = groups.get(k) || { months: new Set(), last: null, days: [], amounts: [] };
      g.months.add(i); g.days.push(+t.date.slice(8, 10)); g.amounts.push(t.amount);
      if (!g.last || t.date >= g.last.date) g.last = t;
      groups.set(k, g);
    }
    const covered = (t) => S.cfg.recurring.some(r => r.type === t.type && r.category === t.category && r.from === t.from && r.to === t.to);
    const out = [];
    for (const g of groups.values()) {
      if (g.months.size < 2 || Math.max(...g.months) < cur - 1 || covered(g.last)) continue;
      // montants irréguliers sur seulement 2 mois : sans doute des opérations ponctuelles
      if (g.months.size < 3 && Math.max(...g.amounts) > 1.3 * Math.min(...g.amounts)) continue;
      // plusieurs opérations par mois : pas une échéance régulière
      if (g.amounts.length > g.months.size + 1) continue;
      const days = g.days.sort((a, b) => a - b), day = days[Math.floor(days.length / 2)];
      const t = g.last;
      out.push({ label: t.description || t.category, type: t.type, category: t.category, from: t.from, to: t.to, amount: t.amount, day, months: g.months.size });
    }
    return out.sort((a, b) => TYPES.indexOf(a.type) - TYPES.indexOf(b.type) || b.amount - a.amount);
  }
  function addSuggestion(sg) {
    const tb = bm(todayStr());
    const r = { id: uid(), label: sg.label, type: sg.type, category: sg.category, from: sg.from, to: sg.to, amount: sg.amount, day: sg.day, every: 1, start: ymStr(tb.y, tb.m), end: '', pointed: false, active: true };
    S.cfg.recurring.push(r);
    // les opérations déjà saisies ce mois-ci comptent comme reportées
    const match = S.tx.find(t => !t.recurId && t.type === r.type && t.category === r.category && t.from === r.from && t.to === r.to && (() => { const b = bm(t.date); return b.y === tb.y && b.m === tb.m; })());
    if (match) match.recurId = r.id;
  }

  function renderRecurring() {
    const box = $('c-recur');
    const p = U.period === 'year' ? null : +U.period, y = U.year;
    const head = h('div', { class: 'rec-head' }, h('div', null, h('h2', { text: 'Opérations récurrentes' }),
      h('p', { class: 'note', style: 'margin-bottom:0', text: 'Factures, salaire, virements d’épargne… Définis-les une fois, puis reporte-les chaque mois en un clic.' })));
    const parts = [head];
    if (p) {
      const st = recurStatus(y, p), todo = st.filter(x => !x.done);
      if (st.length) {
        const total = todo.reduce((a, x) => a + (x.r.type === 'Revenus' ? x.r.amount : -x.r.amount) * (['Revenus', 'Factures', 'Dépenses'].includes(x.r.type) ? 1 : 0), 0);
        head.append(todo.length
          ? h('button', { class: 'btn primary', type: 'button', id: 'rec-post-all', text: `Reporter les ${todo.length} de ${MONTHS[p - 1].toLowerCase()}`, onclick: () => { const n = postRecurring(todo, y, p); U.msg.recur = `${n} opération${n > 1 ? 's' : ''} reportée${n > 1 ? 's' : ''} en ${monthName(y, p)}, non pointée${n > 1 ? 's' : ''}.`; commit(); } })
          : h('span', { class: 'done', style: 'color:var(--ok);font-size:13px', text: `✓ Tout est reporté pour ${MONTHS[p - 1].toLowerCase()}` }));
        const list = h('div', { class: 'rec-due' });
        for (const x of st) {
          const sign = x.r.type === 'Revenus' ? '+' : ['Factures', 'Dépenses'].includes(x.r.type) ? '−' : '';
          list.append(h('div', null,
            h('div', null, h('div', null, typeChip(x.r.type), ' ', x.r.label || x.r.category), h('div', { class: 'desc', text: `Le ${+x.date.slice(8, 10)}, ${x.r.category}, de ${x.r.from} vers ${x.r.to}` })),
            h('span', { class: 'num' + (sign === '+' ? ' pos' : ''), text: sign + money(x.r.amount) }),
            x.done ? h('span', { class: 'done', text: '✓ reportée' }) : h('button', { class: 'btn small', type: 'button', text: 'Reporter', onclick: () => { postRecurring([x], y, p); commit(); } })));
        }
        parts.push(todo.length ? list : h('details', { class: 'more' }, h('summary', { text: `Voir les ${st.length} opérations de ${MONTHS[p - 1].toLowerCase()}` }), list));
        if (total) parts.push(h('p', { class: 'hint', style: 'margin:8px 0 0', text: `Solde des récurrentes de ${MONTHS[p - 1].toLowerCase()} : ${sgn(r2(total))} (revenus − factures et dépenses).` }));
      } else parts.push(h('p', { class: 'hint', text: S.cfg.recurring.length ? `Aucune récurrente prévue en ${monthName(y, p)}.` : 'Aucune récurrente pour l’instant. Ajoute-en une, transforme une transaction avec le bouton ↻, ou pars des suggestions ci-dessous.' }));
    } else parts.push(h('p', { class: 'hint', text: 'Choisis un mois en haut pour reporter ses opérations récurrentes.' }));
    if (U.msg.recur) parts.push(h('p', { class: 'ok-msg', text: U.msg.recur }));

    // suggestions
    const sugg = suggestRecurring();
    if (sugg.length) {
      const sl = h('div', { class: 'sugg' });
      sugg.forEach((sg, i) => sl.append(h('div', null,
        h('div', null, h('div', null, typeChip(sg.type), ' ', sg.label), h('div', { class: 'desc', text: `Vers le ${sg.day}, vue ${sg.months} mois sur les 4 derniers, de ${sg.from} vers ${sg.to}` })),
        h('span', { class: 'num', text: money(sg.amount) }),
        h('button', { class: 'btn small', type: 'button', id: `sugg-${i}`, text: 'Ajouter', onclick: () => { addSuggestion(sg); commit(); } }))));
      parts.push(h('details', { class: 'more', open: !S.cfg.recurring.length || null },
        h('summary', { text: `Suggestions détectées dans tes transactions (${sugg.length})` }),
        h('div', { class: 'btnrow', style: 'margin:8px 0' }, h('button', { class: 'btn small', type: 'button', text: 'Tout ajouter', onclick: () => { sugg.forEach(addSuggestion); commit(); } })), sl));
    }

    // gestion
    const items = h('div', { class: 'rec-items' });
    S.cfg.recurring.forEach((r, i) => {
      const f = (label, el) => h('label', { class: 'field' }, label, el);
      const inp = (k, attrs, parse) => { const el = h('input', { id: `rec-${k}-${r.id}`, ...attrs }); el.addEventListener('change', () => { const v = parse(el.value); if (v !== null) { r[k] = v; commit(); } }); return el; };
      const sel = (k, values, labels) => { const el = h('select', { id: `rec-${k}-${r.id}` }, ...values.map((v, j) => opt(String(v), labels ? labels[j] : v, String(v) === String(r[k])))); el.addEventListener('change', () => { r[k] = k === 'every' ? +el.value : el.value; if (k === 'type') { r.category = catsFor(r.type)[0] || ''; } commit(); }); return el; };
      const cats = catsFor(r.type); const catVals = cats.includes(r.category) || !r.category ? cats : [r.category, ...cats];
      const accs = ['Externe', ...accNames()];
      const chk = (k, label) => { const el = h('input', { type: 'checkbox', id: `rec-${k}-${r.id}`, checked: r[k] }); el.addEventListener('change', () => { r[k] = el.checked; commit(); }); return h('label', { class: 'field check' }, el, label); };
      items.append(h('div', { class: 'rec-item' + (r.active ? '' : ' off') },
        h('div', { class: 'fields' },
          f('Libellé', inp('label', { type: 'text', value: r.label }, v => v.trim())),
          f('Type', sel('type', TYPES)),
          f('Catégorie', sel('category', catVals)),
          f('Montant', inp('amount', { type: 'text', inputmode: 'decimal', value: num2.format(r.amount) }, v => { const n = r2(parseNum(v)); return n > 0 ? n : null; })),
          f('Depuis', sel('from', accs.includes(r.from) ? accs : [r.from, ...accs])),
          f('Vers', sel('to', accs.includes(r.to) ? accs : [r.to, ...accs])),
          f('Jour du mois', inp('day', { type: 'number', min: 1, max: 31, value: r.day, inputmode: 'numeric' }, v => { const n = parseInt(v, 10); return n >= 1 && n <= 31 ? n : null; })),
          f('Fréquence', sel('every', FREQS.map(x => x[0]), FREQS.map(x => x[1]))),
          f('À partir de', inp('start', { type: 'month', value: r.start }, v => /^\d{4}-\d{2}$/.test(v) ? v : null)),
          f('Jusqu’à (optionnel)', inp('end', { type: 'month', value: r.end }, v => /^\d{4}-\d{2}$/.test(v) || v === '' ? v : null))),
        h('div', { class: 'btnrow', style: 'margin-top:8px' }, chk('active', 'Active'), chk('pointed', 'Reporter déjà pointée'),
          h('button', { class: 'btn small danger', type: 'button', text: 'Supprimer', style: 'margin-left:auto', onclick: () => { S.cfg.recurring.splice(i, 1); S.tx.forEach(t => { if (t.recurId === r.id) delete t.recurId; }); commit(); } }))));
    });
    const auto = h('input', { type: 'checkbox', id: 'rec-auto', checked: S.cfg.autoRecurring });
    auto.addEventListener('change', () => { S.cfg.autoRecurring = auto.checked; commit(); });
    parts.push(h('details', { class: 'more', id: 'rec-manage', open: U.recurOpen || null, ontoggle: (e) => { U.recurOpen = e.target.open; } },
      h('summary', { text: `Gérer les récurrentes (${S.cfg.recurring.length})` }),
      h('label', { class: 'check', style: 'margin:10px 0 0;font-size:13px' }, auto, 'Reporter automatiquement les récurrentes du mois en cours à l’ouverture de l’app'),
      items,
      h('div', { class: 'btnrow', style: 'margin-top:10px' }, h('button', { class: 'btn', type: 'button', text: '+ Nouvelle récurrente', onclick: () => {
        const tb = bm(todayStr());
        S.cfg.recurring.push({ id: uid(), label: 'Nouvelle opération', type: 'Factures', category: S.cfg.categories.Factures[0] || '', from: mainAcc(), to: 'Externe', amount: 10, day: 1, every: 1, start: ymStr(tb.y, tb.m), end: '', pointed: false, active: true });
        U.recurOpen = true; commit();
      } })),
      h('p', { class: 'hint', text: 'Les opérations reportées arrivent non pointées (dans « À venir ») : coche-les quand elles passent sur ton compte. Pour un crédit, indique la dernière échéance dans « Jusqu’à ».' })));
    box.replaceChildren(...parts);
  }
  /** Report automatique pour le mois en cours (option des réglages). */
  function autoPostRecurring() {
    if (!S.cfg.autoRecurring) return;
    const tb = bm(todayStr());
    const n = postRecurring(recurStatus(tb.y, tb.m), tb.y, tb.m);
    if (n) { U.msg.recur = `${n} opération${n > 1 ? 's' : ''} récurrente${n > 1 ? 's' : ''} reportée${n > 1 ? 's' : ''} automatiquement pour ${monthName(tb.y, tb.m)}.`; save(); }
  }

  // ---------------------------------------------------------------- saisie express & « à classer »
  const TO_SORT = 'À classer';
  const normTxt = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const capFirst = (x) => x ? x.charAt(0).toUpperCase() + x.slice(1) : x;
  /** Compte d'où partent le plus souvent les dépenses (90 derniers jours). */
  function usualSpendAccount() {
    const lim = isoOf(new Date(Date.now() - 90 * 864e5)), n = {};
    for (const t of S.tx) if (t.type === 'Dépenses' && t.date >= lim && t.from !== 'Externe') n[t.from] = (n[t.from] || 0) + 1;
    const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
    return best && accNames().includes(best[0]) ? best[0] : mainAcc();
  }
  /** Lit une ligne comme « 12,50 boulangerie », « Essence 45 € hier », « +20 remboursement 12/10 ». */
  function parseExpress(line) {
    let s = String(line || '').replace(/[€$£]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return null;
    let date = todayStr();
    const lower = normTxt(s);
    if (/\bavant hier\b/.test(lower)) { date = isoOf(new Date(Date.now() - 2 * 864e5)); s = s.replace(/avant[- ]hier/i, ' '); }
    else if (/\bhier\b/.test(lower)) { date = isoOf(new Date(Date.now() - 864e5)); s = s.replace(/hier/i, ' '); }
    const dm = s.match(/(^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s|$)/);
    if (dm) { const y = dm[4] ? (dm[4].length === 2 ? '20' + dm[4] : dm[4]) : String(new Date().getFullYear()); date = `${y}-${pad2(dm[3])}-${pad2(dm[2])}`; s = s.replace(dm[0], ' '); }
    const income = /^\s*\+/.test(s);
    const m = s.match(/[+-]?\d{1,3}(?:[   ]\d{3})+(?:[.,]\d{1,2})?|[+-]?\d+(?:[.,]\d{1,2})?/);
    if (!m) return null;
    const amount = r2(Math.abs(parseNum(m[0])));
    if (!(amount > 0)) return null;
    const label = s.replace(m[0], ' ').replace(/\s+/g, ' ').trim();
    return { amount, label, date, income };
  }
  /** Devine type, catégorie et comptes à partir de l'historique. */
  function guessFromHistory(label, income) {
    const L = normTxt(label);
    const pool = S.tx.filter(t => !t.toSort && (income ? ['Revenus', 'Remboursement'].includes(t.type) : ['Dépenses', 'Factures'].includes(t.type))).sort((a, b) => b.date.localeCompare(a.date));
    if (L) {
      let hit = pool.find(t => normTxt(t.description) === L)
        || pool.find(t => normTxt(t.category) === L)
        || (L.length >= 3 && pool.find(t => { const d = normTxt(t.description); return d && (d.startsWith(L) || L.startsWith(d) || d.split(' ').includes(L)); }))
        || (L.length >= 3 && pool.find(t => normTxt(t.category).split(' ').some(w => w.length >= 4 && L.includes(w))));
      if (hit) return { type: hit.type, category: hit.category, from: hit.from, to: hit.to, description: normTxt(hit.description) === L ? hit.description : capFirst(label) };
      // nom de catégorie tapé sans historique
      const grp = income ? 'Revenus' : 'Dépenses';
      const cat = S.cfg.categories[grp].find(c => normTxt(c) === L) || (!income && S.cfg.categories.Factures.find(c => normTxt(c) === L));
      if (cat) {
        const type = income ? 'Revenus' : (S.cfg.categories['Dépenses'].includes(cat) ? 'Dépenses' : 'Factures');
        return income ? { type, category: cat, from: 'Externe', to: mainAcc(), description: '' } : { type, category: cat, from: type === 'Dépenses' ? usualSpendAccount() : mainAcc(), to: 'Externe', description: '' };
      }
    }
    return null;
  }
  function expressToTx(p) {
    const g = guessFromHistory(p.label, p.income);
    if (g) return { id: uid(), date: p.date, amount: p.amount, ...g, description: g.description || capFirst(p.label), pointed: true };
    return { id: uid(), date: p.date, amount: p.amount, type: p.income ? 'Revenus' : 'Dépenses', category: TO_SORT, from: p.income ? 'Externe' : usualSpendAccount(), to: p.income ? mainAcc() : 'Externe', description: capFirst(p.label), pointed: true, toSort: true };
  }
  /** Ajoute une ou plusieurs lignes ; renvoie les transactions créées. */
  function addExpressLines(text) {
    const created = [];
    for (const line of String(text || '').split(/\r?\n|;/)) {
      const p = parseExpress(line); if (!p) continue;
      const tx = expressToTx(p); S.tx.push(tx); created.push(tx);
    }
    if (created.length) commit();
    return created;
  }
  let toastTimer = null;
  function toast(text, undo) {
    const el = $('toast'); if (!el) return;
    el.replaceChildren(...[h('span', { text }), undo ? h('button', { type: 'button', text: 'Annuler', onclick: () => { undo(); el.hidden = true; } }) : null].filter(Boolean));
    el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 6000);
  }
  function announce(created) {
    if (!created.length) return;
    const ids = created.map(t => t.id);
    const undo = () => { S.tx = S.tx.filter(t => !ids.includes(t.id)); commit(); };
    const sorted = created.filter(t => t.toSort).length;
    if (created.length === 1) { const t = created[0]; toast(t.toSort ? `${money(t.amount)} ajoutée dans « À classer »` : `${money(t.amount)} ajoutés en ${t.category} sur ${t.from === 'Externe' ? t.to : t.from}.`, undo); }
    else toast(`${created.length} opérations ajoutées${sorted ? `, dont ${sorted} à classer` : ''}`, undo);
  }
  /** Favoris : les petites dépenses que tu refais souvent (120 derniers jours). */
  function frequentExpenses() {
    const lim = isoOf(new Date(Date.now() - 120 * 864e5)), m = new Map();
    for (const t of S.tx) {
      if (t.type !== 'Dépenses' || t.toSort || !t.description || t.date < lim || t.recurId) continue;
      const k = normTxt(t.description) + '|' + t.amount;
      const o = m.get(k) || { n: 0, t }; o.n++; if (t.date > o.t.date) o.t = t; m.set(k, o);
    }
    return [...m.values()].filter(o => o.n >= 2).sort((a, b) => b.n - a.n).slice(0, 8).map(o => o.t);
  }
  function renderExpress() {
    const box = $('c-express');
    if (box.contains(document.activeElement) && document.activeElement.id === 'ex-in') { updateExpressPreview(); return; }
    const inp = h('input', { type: 'text', id: 'ex-in', placeholder: 'ex. 12,50 boulangerie, 45 essence hier…', autocomplete: 'off', enterkeyhint: 'done', 'aria-label': 'Saisie express' });
    const prev = h('div', { class: 'ex-preview', id: 'ex-prev' });
    inp.addEventListener('input', updateExpressPreview);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const c = addExpressLines(inp.value); if (c.length) { inp.value = ''; announce(c); updateExpressPreview(); } } });
    inp.addEventListener('paste', (e) => {
      const txt = e.clipboardData?.getData('text') || '';
      if (/\r?\n/.test(txt.trim())) { e.preventDefault(); const c = addExpressLines(txt); announce(c); }
    });
    const paste = h('button', { class: 'btn', type: 'button', text: 'Coller', title: 'Ajouter ce qui est dans le presse-papiers', onclick: async () => {
      try { const txt = await navigator.clipboard.readText(); const c = addExpressLines(txt); if (c.length) announce(c); else toast('Rien de lisible dans le presse-papiers : il faut au moins un montant.'); }
      catch (e) { toast('Accès au presse-papiers refusé : colle directement dans le champ (Cmd+V).'); }
    } });
    const add = h('button', { class: 'btn primary', type: 'button', text: 'Ajouter', onclick: () => { const c = addExpressLines(inp.value); if (c.length) { inp.value = ''; announce(c); updateExpressPreview(); inp.focus(); } else toast('Indique au moins un montant, par exemple « 12,50 courses ».'); } });
    const fav = frequentExpenses();
    box.replaceChildren(...[
      h('div', { class: 'rec-head' }, h('div', null, h('h2', { text: 'Saisie express' }), h('p', { class: 'note', style: 'margin-bottom:0', text: 'Un montant et un mot suffisent : l’app reprend la catégorie et le compte de tes saisies passées. Ce qu’elle ne reconnaît pas part dans « À classer ».' }))),
      h('div', { class: 'ex-row' }, inp, paste, add), prev,
      fav.length ? h('div', { class: 'ex-favs' }, h('span', { class: 'hint', text: 'En un tap :' }), ...fav.map(t => h('button', { class: 'chip-btn', type: 'button', onclick: () => {
        const tx = { id: uid(), date: todayStr(), amount: t.amount, type: t.type, category: t.category, from: t.from, to: t.to, description: t.description, pointed: true };
        S.tx.push(tx); commit(); announce([tx]);
      } }, t.description, h('span', { class: 'num', text: ' ' + money(t.amount) })))) : null].filter(Boolean));
    updateExpressPreview();
  }
  function updateExpressPreview() {
    const el = $('ex-prev'), inp = $('ex-in'); if (!el || !inp) return;
    const lines = inp.value.split(/;/).map(parseExpress).filter(Boolean);
    if (!lines.length) { el.textContent = inp.value.trim() ? 'Ajoute un montant, par exemple « 12,50 ».' : ''; return; }
    const tx = expressToTx(lines[0]);
    const when = tx.date === todayStr() ? 'aujourd’hui' : `le ${tx.date.slice(8, 10)}/${tx.date.slice(5, 7)}`;
    el.replaceChildren(typeChip(tx.type), ' ', h('b', { text: tx.toSort ? 'À classer' : tx.category }), `, ${money(tx.amount)} de ${tx.from} vers ${tx.to}, ${when}`, lines.length > 1 ? ` (+${lines.length - 1} autre${lines.length > 2 ? 's' : ''})` : '');
  }
  function renderToSort() {
    const box = $('c-tosort');
    const list = S.tx.filter(t => t.toSort).sort((a, b) => b.date.localeCompare(a.date));
    box.hidden = !list.length;
    if (!list.length) { box.replaceChildren(); return; }
    if (box.contains(document.activeElement)) return;
    const rows = list.map(t => {
      const type = h('select', { 'aria-label': 'Type' }, ...['Dépenses', 'Factures', 'Revenus', 'Remboursement'].map(x => opt(x, x, x === t.type)));
      const cat = h('select', { 'aria-label': 'Catégorie' });
      const fill = () => { const cs = catsFor(type.value); cat.replaceChildren(opt('', 'Choisir…'), ...cs.map(c => opt(c))); };
      fill(); type.addEventListener('change', fill);
      const acc = h('select', { 'aria-label': 'Compte' }, ...accNames().map(a => opt(a, a, a === (t.from === 'Externe' ? t.to : t.from))));
      const desc = h('input', { type: 'text', value: t.description, 'aria-label': 'Description' });
      const ok = h('button', { class: 'btn small primary', type: 'button', text: 'Classer', onclick: () => {
        if (!cat.value) { cat.focus(); return; }
        const inc = ['Revenus', 'Remboursement'].includes(type.value);
        Object.assign(t, { type: type.value, category: cat.value, description: desc.value.trim(), from: inc ? 'Externe' : acc.value, to: inc ? acc.value : 'Externe' });
        delete t.toSort; commit();
        toast(`Classée dans ${t.category}. Les prochaines « ${t.description || t.category} » le seront automatiquement.`);
      } });
      const del = h('button', { class: 'btn small ghost danger', type: 'button', text: '✕', 'aria-label': 'Supprimer', onclick: () => { S.tx = S.tx.filter(x => x !== t); commit(); } });
      return h('div', { class: 'sort-row' },
        h('div', { class: 'sort-what' }, h('span', { class: 'num sort-amt', text: money(t.amount) }), h('span', { class: 'desc', text: `${t.date.slice(8, 10)}/${t.date.slice(5, 7)}` })),
        desc, type, cat, acc, h('div', { class: 'acts' }, ok, del));
    });
    box.replaceChildren(h('h2', { text: `À classer (${list.length})` }),
      h('p', { class: 'note', text: 'Elles comptent déjà dans tes soldes et tes dépenses. Choisis une catégorie : l’app s’en souviendra pour la prochaine fois.' }),
      h('div', { class: 'sort-list' }, ...rows));
  }
  /** Ouverture par lien : ?saisie=12,50%20boulangerie (plusieurs lignes séparées par %0A ou ;). */
  function handleLaunchParams() {
    let q = null;
    try { const u = new URL(location.href); q = u.searchParams.get('saisie') || u.searchParams.get('add'); if (q) { u.searchParams.delete('saisie'); u.searchParams.delete('add'); history.replaceState(null, '', u.pathname + (u.search || '') + '#transactions'); } } catch (e) {}
    if (!q || !S) return;
    const c = addExpressLines(q); U.tab = 'transactions';
    setTimeout(() => announce(c), 300);
  }

  // ---------------------------------------------------------------- prévisionnel
  function renderPlan() {
    const y = U.year;
    const lede = $('plan-lede'); lede.replaceChildren(`Prévisionnel ${y}, mois par mois. Chaque case est enregistrée dès que tu la quittes. Le bouton « Répéter » recopie la valeur de `, h('b', { text: U.period === 'year' ? 'janvier' : MONTHS[+U.period - 1].toLowerCase() }), ' (mois choisi en haut) sur les mois suivants.');
    const prevPlan = S.cfg.plan[y - 1];
    const empty = !S.cfg.plan[y] || !Object.values(S.cfg.plan[y]).some(g => Object.values(g || {}).some(a => (a || []).some(v => +v)));
    if (empty && prevPlan) lede.append(' ', h('button', { class: 'btn small', type: 'button', text: `Copier le prévisionnel ${y - 1}`, onclick: () => { S.cfg.plan[y] = clone(prevPlan); commit(); } }));
    const from = U.period === 'year' ? 0 : +U.period - 1;
    const thead = h('thead', null, h('tr', null, h('th', { text: 'Catégorie' }), ...MSHORT.map(m => h('th', { class: 'r', text: m })), h('th', { class: 'r', text: 'Total' }), h('th')));
    const tb = h('tbody');
    const P = (g, c) => S.cfg.plan[y]?.[g]?.[c] || [];
    const setP = (g, c, arr) => { S.cfg.plan[y] = S.cfg.plan[y] || {}; S.cfg.plan[y][g] = S.cfg.plan[y][g] || {}; S.cfg.plan[y][g][c] = arr; };
    GROUPS.forEach((g, gi) => {
      const sums = MSHORT.map((_, i) => r2(S.cfg.categories[g].reduce((a, c) => a + (+P(g, c)[i] || 0), 0)));
      tb.append(h('tr', { class: 'group' }, h('td', { text: g }), ...sums.map(v => h('td', { class: 'r num', text: fmt0.format(v) })), h('td', { class: 'r num', text: fmt0.format(sums.reduce((a, b) => a + b, 0)) }), h('td')));
      S.cfg.categories[g].forEach((c, ci) => {
        const arr = P(g, c);
        const cells = MSHORT.map((_, i) => {
          const inp = h('input', { type: 'text', inputmode: 'decimal', id: `plan-${gi}-${ci}-${i}`, 'aria-label': `${c}, ${MONTHS[i]}`, value: numIn(+arr[i] || 0) });
          inp.addEventListener('change', () => {
            const n = r2(parseNum(inp.value)) || 0;
            const a = Array.from({ length: 12 }, (_, k) => +P(g, c)[k] || 0); a[i] = n; setP(g, c, a); commit();
          });
          return h('td', null, inp);
        });
        const rep = h('button', { class: 'btn small ghost', type: 'button', title: 'Recopier sur les mois suivants', text: 'Répéter', onclick: () => {
          const a = Array.from({ length: 12 }, (_, k) => +P(g, c)[k] || 0); for (let k = from + 1; k < 12; k++) a[k] = a[from]; setP(g, c, a); commit();
        } });
        tb.append(h('tr', null, h('td', { text: c, title: c }), ...cells, h('td', { class: 'r num mut', text: fmt0.format(arr.reduce((a, b) => a + (+b || 0), 0)) }), h('td', null, rep)));
      });
    });
    $('plan').replaceChildren(thead, tb);
  }

  // ---------------------------------------------------------------- épargne & crédits
  function renderEpargne() {
    const sv = savingsByCat();
    let total = 0, saved = 0, taken = 0;
    const tb = h('tbody');
    for (const g of S.cfg.goals) {
      const x = sv[g.category] || { start: g.start, saved: 0, taken: 0 };
      const tot = r2(x.start + x.saved - x.taken); total += tot; saved += x.saved; taken += x.taken;
      const prog = g.target ? tot / g.target : 0, rest = Math.max(0, r2(g.target - tot));
      tb.append(h('tr', null, h('td', null, h('div', { text: g.category || '—' }), h('div', { class: 'desc', text: g.account })),
        h('td', { class: 'r num', text: money(tot) }), h('td', { class: 'r num mut', text: money(g.target) }), h('td', { class: 'r num mut', text: money(rest) }),
        h('td', { style: 'min-width:140px' }, h('div', { style: 'display:flex;gap:8px;align-items:center' }, h('div', { class: 'bar', style: 'flex:1' }, h('i', { style: `width:${Math.min(100, Math.max(0, prog * 100))}%;background:${prog >= 1 ? 'var(--ok)' : 'var(--plum)'}` })), h('span', { class: 'num', style: 'font-size:12px;min-width:44px;text-align:right', text: pct.format(prog) })))));
    }
    if (!S.cfg.goals.length) tb.append(h('tr', null, h('td', { colspan: 5, class: 'mut', style: 'padding:18px;text-align:center' }, 'Aucun objectif. ', h('button', { class: 'btn small', type: 'button', text: 'Créer un objectif', onclick: () => { U.settingsFocus = 'goals'; showTab('reglages'); } }))));
    $('goals').replaceChildren(h('thead', null, h('tr', null, h('th', { text: 'Catégorie' }), h('th', { class: 'r', text: 'Total' }), h('th', { class: 'r', text: 'Objectif' }), h('th', { class: 'r', text: 'Reste' }), h('th', { text: 'Progression' }))), tb);
    const startTot = S.cfg.goals.reduce((a, g) => a + g.start, 0);
    const l = $('ep-lede'); l.replaceChildren();
    if (S.cfg.goals.length) l.append('Tu as ', h('b', { text: money(r2(total)) }), ' sur tes objectifs, soit ', h('b', { text: sgn(r2(total - startTot)) }), ` depuis le départ (${money(r2(saved))} épargnés, ${money(r2(taken))} repris).`);
    else l.append('Crée des objectifs d’épargne dans Réglages pour suivre leur progression ici.');
    drawEvo(); drawRate();
  }
  function drawEvo() {
    const box = $('ch-evo'); const W = box.clientWidth; if (!W) return;
    if (!S.cfg.goals.length && !S.tx.some(t => t.type === 'Épargnes')) { box.replaceChildren(h('p', { class: 'mut', text: 'Aucune épargne enregistrée pour l’instant.' })); return; }
    const H = 200, m = { t: 14, r: 12, b: 24, l: 0 };
    let start = S.cfg.goals.reduce((a, g) => a + g.start, 0);
    for (const t of S.tx) if (bm(t.date).y < U.year) { if (t.type === 'Épargnes') start += t.amount; if (t.type === "Reprise d'épargne") start -= t.amount; }
    const last = lastActiveMonth(U.year); const pts = [{ i: 0, v: r2(start), lbl: `début ${U.year}` }]; let cum = start;
    for (let i = 1; i <= last; i++) { const b = budget(String(i)).tot; cum += b['Épargnes'] - b.reprises; pts.push({ i, v: r2(cum), lbl: `fin ${MONTHS[i - 1].toLowerCase()}` }); }
    const vmin = Math.min(...pts.map(p => p.v)), vmax = Math.max(...pts.map(p => p.v));
    const step = niceStep(Math.max(1, vmax - vmin) * 1.5 || 1000);
    const lo = Math.floor(vmin / step) * step, hi = Math.max(lo + step, Math.ceil(vmax / step) * step);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Évolution du total épargné' });
    box.replaceChildren(svg);
    const ticks = []; for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
    m.l = measure(svg, ticks.map(v => fmt0.format(v))) + 8;
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = (i) => m.l + (last ? i / last : 0) * iw, y = (v) => m.t + ih - (v - lo) / (hi - lo) * ih;
    for (const v of ticks) { svg.append(s('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: 'var(--line)' })); const t = s('text', { x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end' }); t.textContent = fmt0.format(v); svg.append(t); }
    for (let i = 0; i <= last; i++) { if (W < 420 && i % 2) continue; const t = s('text', { x: x(i), y: H - 6, 'text-anchor': 'middle' }); t.textContent = i === 0 ? 'Déb.' : MSHORT[i - 1]; svg.append(t); }
    const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
    svg.append(s('path', { d: `${d}L${x(last)},${y(lo)}L${x(0)},${y(lo)}Z`, fill: 'var(--plum)', 'fill-opacity': 0.12 }));
    svg.append(s('path', { d, fill: 'none', stroke: 'var(--plum)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    const end = pts[pts.length - 1]; svg.append(s('circle', { cx: x(end.i), cy: y(end.v), r: 4, fill: 'var(--plum)' }));
    const tip = tipFor(box);
    const dot = s('circle', { r: 4, fill: 'var(--panel)', stroke: 'var(--plum)', 'stroke-width': 2, style: 'display:none' }); svg.append(dot);
    const hit = s('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' }); svg.append(hit);
    hit.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect(), sc = r.width / W; const px = (e.clientX - r.left) / sc;
      const k = Math.max(0, Math.min(pts.length - 1, Math.round((px - m.l) / iw * last))); const p = pts[k];
      dot.setAttribute('cx', x(p.i)); dot.setAttribute('cy', y(p.v)); dot.style.display = '';
      tip.replaceChildren(h('div', { class: 'h', text: p.lbl }), h('div', { text: money(p.v) }));
      placeTip(box, tip, x(p.i) * sc, y(p.v) * sc);
    });
    hit.addEventListener('mouseleave', () => { tip.hidden = true; dot.style.display = 'none'; });
    box.append(tip);
  }

  function drawRate() {
    const box = $('ch-rate'); const W = box.clientWidth; if (!W) return;
    const last = lastActiveMonth(U.year);
    const pts = []; for (let m = 1; m <= last; m++) { const b = budget(String(m)).tot; pts.push({ m, v: b.Revenus ? (b['Épargnes'] - b.reprises) / b.Revenus : 0, rev: b.Revenus, net: r2(b['Épargnes'] - b.reprises) }); }
    const H = 190, mg = { t: 10, r: 4, b: 24, l: 0 };
    const lo = Math.min(0, Math.floor(Math.min(...pts.map(p => p.v)) * 10) / 10), hi = Math.max(0.3, Math.ceil(Math.max(...pts.map(p => p.v)) * 10) / 10);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Taux d’épargne mensuel' });
    box.replaceChildren(svg);
    const stepT = (hi - lo) > 0.6 ? 0.2 : 0.1, ticks = []; for (let v = lo; v <= hi + 1e-9; v += stepT) ticks.push(Math.round(v * 100) / 100);
    mg.l = measure(svg, ticks.map(v => pct.format(v))) + 8;
    const iw = W - mg.l - mg.r, ih = H - mg.t - mg.b, bw = iw / 12;
    const y = (v) => mg.t + ih - (v - lo) / (hi - lo) * ih;
    for (const v of ticks) { svg.append(s('line', { x1: mg.l, x2: W - mg.r, y1: y(v), y2: y(v), stroke: 'var(--line)' })); const t = s('text', { x: mg.l - 6, y: y(v) + 4, 'text-anchor': 'end' }); t.textContent = pct.format(v); svg.append(t); }
    svg.append(s('line', { x1: mg.l, x2: W - mg.r, y1: y(0.2), y2: y(0.2), stroke: 'var(--accent)', 'stroke-dasharray': '4 4' }));
    const tip = tipFor(box);
    pts.forEach(p => {
      const x0 = mg.l + (p.m - 1) * bw + bw * 0.2, w = bw * 0.6;
      const top = y(Math.max(0, p.v)), bot = y(Math.min(0, p.v));
      svg.append(s('rect', { x: x0, y: top, width: w, height: Math.max(1, bot - top), rx: Math.min(4, w / 2), fill: p.v < 0 ? 'var(--bad)' : p.v >= 0.2 ? 'var(--plum)' : 'color-mix(in srgb, var(--plum) 55%, var(--sunk))' }));
      const t = s('text', { x: x0 + w / 2, y: H - 6, 'text-anchor': 'middle' }); t.textContent = W < 420 ? MSHORT[p.m - 1].slice(0, 1) : MSHORT[p.m - 1]; svg.append(t);
      const hit = s('rect', { x: mg.l + (p.m - 1) * bw, y: mg.t, width: bw, height: ih, fill: 'transparent' });
      hit.addEventListener('mouseenter', () => { tip.replaceChildren(h('div', { class: 'h', text: `${MONTHS[p.m - 1]} ${U.year}` }), h('div', { text: `${pct.format(p.v)} des revenus` }), h('div', { class: 'h', text: `${money(p.net)} sur ${money(p.rev)}` })); placeTip(box, tip, mg.l + (p.m - 0.5) * bw, top); });
      hit.addEventListener('mouseleave', () => tip.hidden = true); svg.append(hit);
    });
    box.append(tip);
  }

  // ---------------------------------------------------------------- crédits
  const ymLabel = (i, short) => { const { y, m } = ymOf(i); return short ? `${MSHORT[m - 1]} ${String(y).slice(2)}` : `${MONTHS[m - 1].toLowerCase()} ${y}`; };
  function loanInfo(l) {
    const C = l.capital, n = l.months, r = (l.rate || 0) / 1200;
    const M = l.monthly || (n && C ? r2(r ? C * r / (1 - Math.pow(1 + r, -n)) : C / n) : 0);
    const interest = l.interest || (M && n ? Math.max(0, r2(M * n - C)) : 0);
    const total = r2(C + interest);
    const byMonth = new Map(); let tracked = 0;
    const today = todayStr();
    for (const t of S.tx) if (t.type === 'Factures' && t.category && t.category === l.category && t.date <= today) { const b = bm(t.date), i = mIdx(b.y, b.m); byMonth.set(i, (byMonth.get(i) || 0) + t.amount); tracked += t.amount; }
    const paid = r2(l.paidBefore + tracked), rest = Math.max(0, r2(total - paid));
    const tb = bm(todayStr()), cur = mIdx(tb.y, tb.m);
    const firstTx = byMonth.size ? Math.min(...byMonth.keys()) : null;
    const start = l.startDate ? parseYm(l.startDate) : (firstTx ?? cur);
    const plannedEnd = n ? start + n - 1 : null;
    const left = M ? Math.max(rest > 0 ? 1 : 0, Math.ceil(rest / M - 0.05)) : 0;
    const base = byMonth.has(cur) ? cur : cur - 1;
    const projEnd = rest > 0 ? base + left : (byMonth.size ? Math.max(...byMonth.keys()) : cur);
    // série réelle : reste dû après les paiements de chaque mois
    const actual = []; const a0 = firstTx != null ? firstTx - 1 : cur - 1; let rem = total - l.paidBefore;
    actual.push({ i: a0, v: r2(rem) });
    for (let i = a0 + 1; i <= Math.max(a0 + 1, Math.min(cur, byMonth.size ? Math.max(...byMonth.keys()) : cur)); i++) { rem -= byMonth.get(i) || 0; actual.push({ i, v: r2(Math.max(0, rem)) }); }
    const projected = [actual[actual.length - 1]];
    if (M) { let v = projected[0].v, i = projected[0].i; while (v > Math.max(0.005, 0.05 * M) && projected.length < 600) { v = Math.max(0, v - M); i++; projected.push({ i, v: r2(v < 0.05 * M ? 0 : v) }); } }
    // tableau d'amortissement théorique
    const sched = []; let bal = C;
    for (let k = 1; k <= n && M; k++) { const it = r2(bal * r), cp = r2(Math.min(bal, M - it)); bal = Math.max(0, bal - cp); sched.push({ k, i: start + k - 1, interest: it, capital: cp, bal: r2(bal) }); }
    const paidCount = M ? Math.min(n || Infinity, Math.round(paid / M)) : 0;
    const interestPaid = r2(sched.slice(0, paidCount).reduce((a, x) => a + x.interest, 0));
    return { M, interest, total, paid, rest, start, plannedEnd, projEnd, left, actual, projected, sched, paidCount, interestPaid, cur, byMonth };
  }

  function renderCredits() {
    const box = $('p-credits');
    if (!S.cfg.loans.length) {
      box.replaceChildren(h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', { text: 'Aucun crédit enregistré' }),
        h('p', { class: 'note', text: 'Ajoute tes prêts (auto, immobilier, conso…) pour suivre ce qu’il reste à rembourser, la date de fin et ton taux d’endettement.' }),
        h('button', { class: 'btn primary', type: 'button', text: 'Ajouter un crédit', onclick: () => { U.settingsFocus = 'loans'; showTab('reglages'); } })));
      return;
    }
    const infos = S.cfg.loans.map(l => ({ l, x: loanInfo(l) }));
    const restTot = r2(infos.reduce((a, o) => a + o.x.rest, 0));
    const monthly = r2(infos.filter(o => o.x.rest > 0).reduce((a, o) => a + o.x.M, 0));
    const revs = MONTHS.map((_, i) => budget(String(i + 1)).tot.Revenus).filter(v => v > 0);
    const avgRev = revs.length ? revs.reduce((a, b) => a + b, 0) / revs.length : 0;
    const rate = avgRev ? monthly / avgRev : 0;
    const lastEnd = Math.max(...infos.map(o => o.x.projEnd));
    const kpi = (lbl, val, sub, extra, cls) => h('div', { class: 'kpi' }, h('span', { class: 'lbl', text: lbl }), h('span', { class: 'val ' + (cls || ''), text: val }), h('span', { class: 'sub', text: sub }), extra);
    const gauge = h('div', { class: 'gauge', role: 'img', 'aria-label': `Taux d'endettement ${pct.format(rate)} sur un plafond de 35 %` }, h('i', { style: `width:${Math.min(100, rate / 0.5 * 100)}%;background:${rate > 0.35 ? 'var(--bad)' : 'var(--accent)'}` }), h('b', { style: 'left:70%', title: 'Plafond conseillé 35 %' }));
    const parts = [
      h('p', { class: 'lede' }, `Il te reste `, h('b', { text: money(restTot) }), ` à rembourser sur ${infos.length} crédit${infos.length > 1 ? 's' : ''}, avec `, h('b', { text: money(monthly) }), ` de mensualités. ${restTot > 0 ? `Dernière échéance prévue en ${ymLabel(lastEnd)}.` : 'Tout est remboursé.'}`),
      h('div', { class: 'kpis' },
        kpi('Reste dû', money(restTot), 'capital + intérêts restants'),
        kpi('Mensualités', money(monthly), 'par mois, crédits en cours'),
        kpi('Taux d’endettement', pct.format(rate), `sur ${money(r2(avgRev))} de revenu mensuel moyen (${U.year}), plafond 35 %`, gauge, rate > 0.35 ? 'neg' : ''),
        kpi('Fin prévue', restTot > 0 ? ymLabel(lastEnd) : '—', restTot > 0 ? `dans ${lastEnd - infos[0].x.cur} mois` : 'aucune échéance restante'))
    ];
    const draws = [];
    infos.forEach(({ l, x }, li) => {
      const sub = [l.capital ? `${fmt0.format(l.capital)} empruntés` : '', l.rate ? `à ${num2.format(l.rate)} %` : '', l.months ? `sur ${l.months} mois` : '', `depuis ${ymLabel(x.start)}`].filter(Boolean).join(', ');
      const prog = x.total ? x.paid / x.total : 0;
      const kv = (k, v, cls) => h('div', null, h('span', { text: k }), h('span', { class: 'num ' + (cls || ''), text: v }));
      const nextIdx = x.byMonth.has(x.cur) ? x.cur + 1 : x.cur;
      parts.push(h('div', { class: 'card', style: 'margin-top:12px', id: `loan-${l.id}` },
        h('h2', { text: l.name }), h('p', { class: 'note', text: sub }),
        h('div', { class: 'loan-grid' },
          h('div', null, h('h3', { text: 'Avancement' }),
            h('div', { class: 'donut-wrap' }, donut(prog, money(x.rest)),
              h('div', { class: 'kv' },
                kv('Remboursé', money(x.paid), 'pos'), kv('Reste dû', money(x.rest)),
                kv('Échéances', x.M ? `${x.paidCount} / ${l.months || x.paidCount + x.left}` : '—'),
                kv('Prochaine', x.rest > 0 ? ymLabel(nextIdx) : '—'),
                kv('Fin prévue', x.rest > 0 ? ymLabel(x.projEnd) : 'terminé')))),
          h('div', null, h('h3', { text: 'Coût du crédit' }),
            costBar(l.capital, x.interest),
            h('div', { class: 'kv', style: 'margin-top:10px' },
              kv('Capital', money(l.capital)), kv('Intérêts', money(x.interest), 'neg'), kv('Coût total', money(x.total)),
              kv('Intérêts déjà payés', x.sched.length ? `≈ ${money(x.interestPaid)}` : '—'), kv('Mensualité', money(x.M)))),
          h('div', { style: 'grid-column:1/-1' }, h('h3', { text: 'Reste dû au fil du temps' }), h('p', { class: 'hint', style: 'margin:0 0 6px', text: 'Trait plein : remboursements saisis. Pointillés : projection avec la mensualité actuelle.' }), h('div', { class: 'chart', id: `ch-loan-${li}` })),
          x.sched.length ? h('div', { style: 'grid-column:1/-1' }, h('h3', { text: 'Capital et intérêts par échéance' }), h('p', { class: 'hint', style: 'margin:0 0 6px', text: 'Tableau d’amortissement théorique : la part d’intérêts baisse à chaque échéance. Les échéances payées sont en couleur pleine.' }), h('div', { class: 'chart', id: `ch-amort-${li}` })) : null),
        l.category ? null : h('p', { class: 'warn', text: 'Choisis la catégorie de factures de ce crédit dans Réglages pour compter les remboursements.' })));
      draws.push(() => { drawLoanLine(`ch-loan-${li}`, x); if (x.sched.length) drawAmort(`ch-amort-${li}`, x); });
    });
    parts.push(h('div', { class: 'btnrow', style: 'margin-top:12px' }, h('button', { class: 'btn', type: 'button', text: 'Modifier mes crédits', onclick: () => { U.settingsFocus = 'loans'; showTab('reglages'); } })));
    box.replaceChildren(...parts);
    draws.forEach(f => f());
  }
  function donut(p, center) {
    const R = 52, c = 66, sw = 14, L = 2 * Math.PI * R;
    const svg = s('svg', { viewBox: '0 0 132 132', role: 'img', 'aria-label': `${pct.format(p)} remboursé` });
    svg.append(s('circle', { cx: c, cy: c, r: R, fill: 'none', stroke: 'var(--sunk)', 'stroke-width': sw }));
    svg.append(s('circle', { cx: c, cy: c, r: R, fill: 'none', stroke: 'var(--accent)', 'stroke-width': sw, 'stroke-linecap': p > 0 && p < 1 ? 'round' : 'butt', 'stroke-dasharray': `${L * Math.min(1, p)} ${L}`, transform: `rotate(-90 ${c} ${c})` }));
    const t1 = s('text', { x: c, y: c + 2, 'text-anchor': 'middle', 'font-size': 24 }); t1.textContent = pct.format(Math.min(1, p)).replace(/\s/g, ' ');
    const t2 = s('text', { x: c, y: c + 20, 'text-anchor': 'middle', 'font-size': 10, style: 'fill:var(--muted);font-family:var(--f-body)' }); t2.textContent = 'remboursé';
    svg.append(t1, t2); return svg;
  }
  function costBar(capital, interest) {
    const tot = capital + interest || 1;
    return h('div', null, h('div', { class: 'alloc', role: 'img', 'aria-label': 'Capital et intérêts' },
      h('i', { style: `width:${capital / tot * 100}%;background:var(--accent)`, title: `Capital ${money(capital)}` }),
      h('i', { style: `width:${interest / tot * 100}%;background:var(--bad)`, title: `Intérêts ${money(interest)}` })),
      h('div', { class: 'meter-legend' }, h('span', { text: `Capital ${pct.format(capital / tot)}` }), h('span', { text: `Intérêts ${pct.format(interest / tot)}` })));
  }
  function drawLoanLine(id, x) {
    const box = $(id); if (!box) return; const W = box.clientWidth; if (!W) return;
    const all = [...x.actual, ...x.projected];
    let i0 = Math.min(x.start - 1, ...all.map(p => p.i)), i1 = Math.max(x.plannedEnd ?? 0, ...all.map(p => p.i));
    if (i1 <= i0) i1 = i0 + 1;
    const H = 220, m = { t: 14, r: 12, b: 26, l: 0 };
    const top = Math.max(...all.map(p => p.v), 1), step = niceStep(top), hi = Math.ceil(top / step) * step;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Reste dû au fil du temps' });
    box.replaceChildren(svg);
    const ticks = []; for (let v = 0; v <= hi + 1e-9; v += step) ticks.push(v);
    m.l = measure(svg, ticks.map(v => fmt0.format(v))) + 8;
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const X = (i) => m.l + (i - i0) / (i1 - i0) * iw, Y = (v) => m.t + ih - v / hi * ih;
    for (const v of ticks) { svg.append(s('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), stroke: 'var(--line)' })); const t = s('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }); t.textContent = fmt0.format(v); svg.append(t); }
    const span = i1 - i0, every = Math.max(1, Math.ceil(span / Math.max(2, Math.floor(iw / 64))));
    for (let i = i0; i <= i1; i += every) { const t = s('text', { x: X(i), y: H - 8, 'text-anchor': 'middle' }); t.textContent = ymLabel(i, true); svg.append(t); }
    // zone remboursée
    const a = x.actual;
    svg.append(s('path', { d: a.map((p, k) => `${k ? 'L' : 'M'}${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join('') + `L${X(a[a.length - 1].i)},${Y(0)}L${X(a[0].i)},${Y(0)}Z`, fill: 'var(--accent)', 'fill-opacity': 0.1 }));
    svg.append(s('path', { d: a.map((p, k) => `${k ? 'L' : 'M'}${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(''), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    if (x.projected.length > 1) svg.append(s('path', { d: x.projected.map((p, k) => `${k ? 'L' : 'M'}${X(p.i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(''), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '5 5' }));
    // aujourd'hui
    if (x.cur >= i0 && x.cur <= i1) {
      svg.append(s('line', { x1: X(x.cur), x2: X(x.cur), y1: m.t, y2: m.t + ih, stroke: 'var(--fg)', 'stroke-opacity': 0.35 }));
      const t = s('text', { x: X(x.cur) + 4, y: m.t + 10, style: 'fill:var(--fg)' }); t.textContent = 'aujourd’hui'; svg.append(t);
    }
    const lp = a[a.length - 1]; svg.append(s('circle', { cx: X(lp.i), cy: Y(lp.v), r: 4, fill: 'var(--accent)' }));
    const lab = s('text', { x: Math.min(X(lp.i) + 8, m.l + iw - 4), y: Y(lp.v) - 8, 'text-anchor': X(lp.i) + 120 > m.l + iw ? 'end' : 'start', style: 'fill:var(--fg);font-weight:600' }); lab.textContent = money(lp.v); svg.append(lab);
    if (x.rest > 0) { const pe = x.projected[x.projected.length - 1]; svg.append(s('circle', { cx: X(pe.i), cy: Y(0), r: 3.5, fill: 'var(--muted)' })); const t = s('text', { x: X(pe.i), y: Y(0) - 8, 'text-anchor': 'end' }); t.textContent = `fin ${ymLabel(pe.i, true)}`; svg.append(t); }
    const tip = tipFor(box);
    const pts = [...a, ...x.projected.slice(1)];
    const dot = s('circle', { r: 4, fill: 'var(--panel)', stroke: 'var(--fg)', 'stroke-width': 2, style: 'display:none' }); svg.append(dot);
    const hit = s('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent' }); svg.append(hit);
    hit.addEventListener('mousemove', (e) => {
      const r = svg.getBoundingClientRect(), sc = r.width / W, i = Math.round(i0 + ((e.clientX - r.left) / sc - m.l) / iw * span);
      const p = pts.reduce((b, q) => Math.abs(q.i - i) < Math.abs(b.i - i) ? q : b, pts[0]);
      dot.setAttribute('cx', X(p.i)); dot.setAttribute('cy', Y(p.v)); dot.style.display = '';
      const paidM = x.byMonth.get(p.i);
      tip.replaceChildren(h('div', { class: 'h', text: `fin ${ymLabel(p.i)}${p.i > x.cur ? ' (projection)' : ''}` }), h('div', { text: `Reste dû ${money(p.v)}` }), paidM ? h('div', { class: 'h', text: `Payé ce mois-ci ${money(paidM)}` }) : null);
      placeTip(box, tip, X(p.i) * sc, Y(p.v) * sc);
    });
    hit.addEventListener('mouseleave', () => { tip.hidden = true; dot.style.display = 'none'; });
    box.append(tip);
  }
  function drawAmort(id, x) {
    const box = $(id); if (!box) return; const W = box.clientWidth; if (!W) return;
    let rows = x.sched.map(r => ({ ...r, label: ymLabel(r.i, true), paid: r.k <= x.paidCount }));
    if (rows.length > 60) { // regroupement par année au-delà de 5 ans
      const g = new Map(); for (const r of rows) { const y = ymOf(r.i).y; const o = g.get(y) || { label: String(y), interest: 0, capital: 0, paid: true, k: r.k }; o.interest += r.interest; o.capital += r.capital; o.paid = o.paid && r.paid; g.set(y, o); }
      rows = [...g.values()];
    }
    const H = 200, m = { t: 10, r: 4, b: 26, l: 0 };
    const top = Math.max(...rows.map(r => r.interest + r.capital)), step = niceStep(top), hi = Math.ceil(top / step) * step || 1;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Capital et intérêts par échéance' });
    box.replaceChildren(h('div', { class: 'legend' }, h('span', null, h('i', { class: 'sw', style: 'background:var(--accent)' }), 'Capital'), h('span', null, h('i', { class: 'sw', style: 'background:var(--bad)' }), 'Intérêts'), h('span', null, h('i', { class: 'sw', style: 'background:var(--sunk);outline:1px solid var(--line)' }), 'Échéances à venir (plus claires)')), svg);
    const ticks = []; for (let v = 0; v <= hi + 1e-9; v += step) ticks.push(v);
    m.l = measure(svg, ticks.map(v => fmt0.format(v))) + 8;
    const iw = W - m.l - m.r, ih = H - m.t - m.b, n = rows.length, bw = iw / n, w = Math.max(1, Math.min(18, bw * 0.7));
    const Y = (v) => m.t + ih - v / hi * ih;
    for (const v of ticks) { svg.append(s('line', { x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), stroke: 'var(--line)' })); const t = s('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }); t.textContent = fmt0.format(v); svg.append(t); }
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 56))));
    const tip = tipFor(box);
    rows.forEach((r, k) => {
      const x0 = m.l + k * bw + (bw - w) / 2, op = r.paid ? 1 : 0.35;
      svg.append(s('rect', { x: x0, y: Y(r.capital), width: w, height: Math.max(0.5, Y(0) - Y(r.capital)), fill: 'var(--accent)', 'fill-opacity': op }));
      svg.append(s('rect', { x: x0, y: Y(r.capital + r.interest), width: w, height: Math.max(0.5, Y(r.capital) - Y(r.capital + r.interest)), fill: 'var(--bad)', 'fill-opacity': op }));
      if (k % every === 0) { const t = s('text', { x: x0 + w / 2, y: H - 8, 'text-anchor': 'middle' }); t.textContent = r.label; svg.append(t); }
      const hit = s('rect', { x: m.l + k * bw, y: m.t, width: bw, height: ih, fill: 'transparent' });
      hit.addEventListener('mouseenter', () => { tip.replaceChildren(h('div', { class: 'h', text: `${n === x.sched.length ? `Échéance ${r.k}, ` : ''}${r.label}${r.paid ? ' (payée)' : ''}` }), h('div', null, h('i', { class: 'sw', style: 'background:var(--accent)' }), `Capital ${money(r2(r.capital))}`), h('div', null, h('i', { class: 'sw', style: 'background:var(--bad)' }), `Intérêts ${money(r2(r.interest))}`)); placeTip(box, tip, x0 + w / 2, Y(r.capital + r.interest)); });
      hit.addEventListener('mouseleave', () => tip.hidden = true); svg.append(hit);
    });
    box.append(tip);
  }

  // ---------------------------------------------------------------- éditeurs partagés (accueil + réglages)
  function localeOptions(cfg) {
    let tags = LOCALE_TAGS; try { tags = Intl.NumberFormat.supportedLocalesOf(LOCALE_TAGS); } catch (e) {}
    if (!tags.includes(cfg.locale)) tags = [cfg.locale, ...tags];
    let rn = (x) => x, ln = (x) => x;
    try { const r = new Intl.DisplayNames(['fr'], { type: 'region' }), l = new Intl.DisplayNames(['fr'], { type: 'language' }); rn = (x) => r.of(x) || x; ln = (x) => l.of(x) || x; } catch (e) {}
    const byRegion = {}; for (const tag of tags) { const reg = tag.split('-').pop(); (byRegion[reg] = byRegion[reg] || []).push(tag); }
    const items = tags.map(tag => {
      const [lang, reg] = [tag.split('-')[0], tag.split('-').pop()];
      let sample = '';
      try { sample = new Intl.NumberFormat(tag, { style: 'currency', currency: cfg.currency }).format(-1234567.89); } catch (e) { sample = '?'; }
      let date = ''; try { date = new Date(2026, 2, 31).toLocaleDateString(tag, { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (e) {}
      const country = rn(reg), langLabel = byRegion[reg].length > 1 ? ` (${ln(lang)})` : '';
      return { tag, sort: country + langLabel, label: `${country}${langLabel} : ${sample}, ${date}` };
    }).sort((a, b) => a.sort.localeCompare(b.sort, 'fr'));
    return items.map(i => opt(i.tag, i.label, i.tag === cfg.locale));
  }
  function generalFields(cfg, onChange) {
    const name = h('input', { type: 'text', id: 'g-name', value: cfg.appName === 'Mon budget' ? '' : cfg.appName, placeholder: 'Mon budget', maxlength: 40 });
    name.addEventListener('change', () => { cfg.appName = name.value.trim() || 'Mon budget'; onChange(); });
    const cur = h('select', { id: 'g-cur' });
    const curName = (() => { try { const dn = new Intl.DisplayNames(['fr'], { type: 'currency' }); return (c) => dn.of(c) || c; } catch (e) { return (c) => c; } })();
    let allCur = FALLBACK_CURRENCIES; try { if (Intl.supportedValuesOf) allCur = Intl.supportedValuesOf('currency'); } catch (e) {}
    const curLabel = (c) => { let sym = ''; try { sym = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find(x => x.type === 'currency')?.value || ''; } catch (e) {} return `${c} · ${curName(c)}${sym && sym !== c ? ` (${sym})` : ''}`; };
    cur.append(h('optgroup', { label: 'Courantes' }, ...COMMON_CURRENCIES.map(c => opt(c, curLabel(c), c === cfg.currency))),
      h('optgroup', { label: 'Toutes les devises' }, ...allCur.filter(c => !COMMON_CURRENCIES.includes(c)).map(c => opt(c, curLabel(c), c === cfg.currency))));
    cur.addEventListener('change', () => { cfg.currency = cur.value; onChange(); });
    const loc = h('select', { id: 'g-loc' }, ...localeOptions(cfg));
    loc.addEventListener('change', () => { cfg.locale = loc.value; onChange(); });
    const yr = h('input', { type: 'number', id: 'g-year', min: 1990, max: 2100, value: cfg.year });
    yr.addEventListener('change', () => { const v = parseInt(yr.value, 10); if (v >= 1990 && v <= 2100) { cfg.year = v; onChange(); } });
    if (!$('days-list')) document.body.append(h('datalist', { id: 'days-list' }, ...Array.from({ length: 28 }, (_, i) => opt(String(i + 1)))));
    const day = h('input', { type: 'number', id: 'g-day', min: 1, max: 28, step: 1, inputmode: 'numeric', list: 'days-list', value: cfg.startDay, style: 'width:100%' });
    const dayHint = h('span', { class: 'hint', text: cfg.startDay === 1 ? 'Du 1er à la fin du mois.' : `Du ${cfg.startDay} au ${cfg.startDay - 1} du mois suivant.` });
    day.addEventListener('change', () => { const v = parseInt(day.value, 10); if (v >= 1 && v <= 28) { cfg.startDay = v; onChange(); } else { day.value = cfg.startDay; dayHint.textContent = 'Choisis un jour entre 1 et 28.'; } });
    const early = h('input', { type: 'checkbox', id: 'g-early', checked: cfg.startEarly });
    early.addEventListener('change', () => { cfg.startEarly = early.checked; onChange(); });
    return h('div', { class: 'fields' },
      h('label', { class: 'field' }, 'Nom de l’app', name),
      h('label', { class: 'field' }, 'Devise', cur),
      h('label', { class: 'field', style: 'grid-column:span 2' }, 'Format des nombres et des dates', loc),
      h('label', { class: 'field' }, 'Année de départ', yr),
      h('label', { class: 'field' }, 'Le mois budgétaire commence le (jour 1 à 28)', day, dayHint),
      cfg.startDay > 1 ? h('label', { class: 'field check' }, early, `Le ${cfg.startDay} appartient au mois suivant (ex. le ${cfg.startDay} décembre ouvre le budget de janvier)`) : null);
  }

  function accountsEditor(cfg, onChange, withData) {
    const tb = h('tbody');
    cfg.accounts.forEach((a, i) => {
      const used = withData ? accountUsage(a.name) : 0;
      const name = h('input', { type: 'text', id: `acc-name-${a.id}`, value: a.name, 'aria-label': 'Nom du compte' });
      const msg = h('div', { class: 'warn' });
      name.addEventListener('change', () => {
        const v = name.value.trim();
        if (!v || v === 'Externe' || cfg.accounts.some(o => o !== a && o.name === v)) { msg.textContent = v === 'Externe' ? '« Externe » est réservé.' : 'Choisis un nom unique.'; name.value = a.name; return; }
        renameAccount(cfg, a, v, withData); onChange();
      });
      const start = h('input', { type: 'text', inputmode: 'decimal', class: 'n', id: `acc-start-${a.id}`, value: a.start ? num2.format(a.start) : '', placeholder: '0,00', 'aria-label': 'Solde de départ' });
      start.addEventListener('change', () => { if (!start.value.trim()) { a.start = 0; onChange(); return; } const n = parseNum(start.value); if (Number.isFinite(n)) { a.start = r2(n); onChange(); } else start.value = a.start ? num2.format(a.start) : ''; });
      const sav = h('input', { type: 'checkbox', id: `acc-sav-${a.id}`, checked: a.savings, 'aria-label': 'Compte épargne' });
      sav.addEventListener('change', () => { a.savings = sav.checked; if (a.savings) a.current = false; onChange(); });
      const curr = h('input', { type: 'checkbox', id: `acc-cur-${a.id}`, checked: a.current, 'aria-label': 'Compte courant' });
      curr.addEventListener('change', () => { a.current = curr.checked; if (a.current) a.savings = false; onChange(); });
      const col = h('input', { type: 'color', class: 'acc-color', id: `acc-col-${a.id}`, value: a.color || ACC_COLORS[i % ACC_COLORS.length], 'aria-label': 'Couleur du compte', title: 'Couleur du compte' });
      col.addEventListener('change', () => { a.color = col.value; onChange(); });
      const move = (d) => { const j = i + d; if (j < 0 || j >= cfg.accounts.length) return; [cfg.accounts[i], cfg.accounts[j]] = [cfg.accounts[j], cfg.accounts[i]]; onChange(); };
      const removeAcc = () => { cfg.accounts.splice(i, 1); cfg.goals.forEach(g => { if (g.account === a.name) g.account = ''; }); U.delAcc = null; onChange(); };
      const del = h('button', { class: 'btn small danger', type: 'button', text: 'Supprimer', onclick: () => { if (!used && a.start === 0) removeAcc(); else { U.delAcc = a.id; onChange(); } } });
      tb.append(h('tr', { class: 'acc-edit-row' },
        h('td', { class: 'acc-col-cell' }, col),
        h('td', null, name, msg, used ? h('div', { class: 'hint', text: `${used} transaction${used > 1 ? 's' : ''}` }) : null),
        h('td', { class: 'r acc-start' }, h('span', { class: 'm-lbl', text: 'Solde de départ' }), start),
        h('td', { class: 'acc-flag' }, h('label', null, curr, h('span', { class: 'm-lbl', text: 'Courant' }))),
        h('td', { class: 'acc-flag' }, h('label', null, sav, h('span', { class: 'm-lbl', text: 'Épargne' }))),
        h('td', null, h('div', { class: 'acts' },
          h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Monter', text: '↑', disabled: i === 0, onclick: () => move(-1) }),
          h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Descendre', text: '↓', disabled: i === cfg.accounts.length - 1, onclick: () => move(1) }),
          del))));
      if (U.delAcc === a.id) {
        const others = cfg.accounts.filter(o => o !== a);
        const target = h('select', { id: `acc-move-${a.id}`, 'aria-label': 'Compte de destination' }, ...others.map(o => opt(o.name)));
        const box = h('div', { class: 'banner', style: 'margin:4px 0 8px' },
          h('span', null, used ? `« ${a.name} » a ${used} transaction${used > 1 ? 's' : ''}${a.start ? ` et un solde de départ de ${num2.format(a.start)}` : ''}. Que veux-tu en faire ?` : `« ${a.name} » a un solde de départ de ${num2.format(a.start)}. Le supprimer quand même ?`),
          h('div', { class: 'btnrow' },
            used && others.length ? h('span', { class: 'btnrow' }, 'Les déplacer vers', target, h('button', { class: 'btn small', type: 'button', text: 'Déplacer et supprimer', onclick: () => {
              const dest = cfg.accounts.find(o => o.name === target.value); if (!dest) return;
              for (const t of S.tx) { if (t.from === a.name) t.from = dest.name; if (t.to === a.name) t.to = dest.name; }
              S.tx = S.tx.filter(t => t.from !== t.to);
              dest.start = r2(dest.start + a.start);
              cfg.goals.forEach(g => { if (g.account === a.name) g.account = dest.name; });
              removeAcc();
            } })) : null,
            h('button', { class: 'btn small danger', type: 'button', text: used ? `Supprimer le compte et ses ${used} transaction${used > 1 ? 's' : ''}` : 'Supprimer', onclick: () => { if (S) S.tx = S.tx.filter(t => t.from !== a.name && t.to !== a.name); removeAcc(); } }),
            h('button', { class: 'btn small', type: 'button', text: 'Annuler', onclick: () => { U.delAcc = null; onChange(); } })));
        tb.append(h('tr', null, h('td', { colspan: 6, style: 'border-bottom:0;padding:0' }, box)));
      }
    });
    const add = h('input', { type: 'text', id: 'acc-add', placeholder: 'Nouveau compte, ex. Livret A' });
    const addMsg = h('span', { class: 'warn' });
    const doAdd = () => { const v = add.value.trim(); if (!v) return; if (v === 'Externe' || cfg.accounts.some(a => a.name === v)) { addMsg.textContent = 'Ce nom existe déjà.'; return; } { const sv = /livret|lep|pel|cel|pea|assurance|épargne|epargne|cto|bourse/i.test(v); cfg.accounts.push({ id: uid(), name: v, start: 0, savings: sv, current: !sv, color: nextAccColor(cfg) }); } add.value = ''; onChange(); setTimeout(() => $('acc-add')?.focus(), 10); };
    add.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    return h('div', null,
      h('div', { class: 'scroll' }, h('table', { class: 'edit-table' }, h('thead', null, h('tr', null, h('th', { text: 'Couleur' }), h('th', { text: 'Compte' }), h('th', { class: 'r', text: 'Solde de départ' }), h('th', { style: 'text-align:center', text: 'Courant' }), h('th', { style: 'text-align:center', text: 'Épargne' }), h('th'))), tb)),
      h('div', { class: 'addrow' }, add, h('button', { class: 'btn', type: 'button', text: 'Ajouter', onclick: doAdd })), addMsg,
      h('p', { class: 'hint', text: 'Le solde de départ est celui du compte avant la première transaction saisie. Coche « Courant » pour les comptes du quotidien (ils forment le disponible en haut de l’Aperçu) et « Épargne » pour les livrets, assurance-vie, PEA… Un compte peut n’être ni l’un ni l’autre (compte commun, carte titres-restaurant…). La couleur sert à repérer le compte dans la liste des transactions.' }));
  }

  function categoriesEditor(cfg, onChange, withData) {
    const wrap = h('div', { class: 'cat-groups' });
    CAT_GROUPS.forEach((g, gi) => {
      const list = cfg.categories[g];
      const box = h('div', { class: 'cat-list' });
      list.forEach((c, i) => {
        const used = withData ? categoryUsage(g, c) : 0;
        const inp = h('input', { type: 'text', id: `cat-${gi}-${i}`, value: c, 'aria-label': `Catégorie ${g}` });
        const msg = h('div', { class: 'warn' });
        inp.addEventListener('change', () => {
          const v = inp.value.trim();
          if (!v || list.some((o, k) => k !== i && o === v)) { msg.textContent = 'Nom vide ou déjà utilisé.'; inp.value = c; return; }
          renameCategory(cfg, g, c, v, withData); onChange();
        });
        const move = (d) => { const j = i + d; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; onChange(); };
        box.append(h('div', null, h('div', { class: 'cat-row' }, inp,
          h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Monter', text: '↑', disabled: i === 0, onclick: () => move(-1) }),
          h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Descendre', text: '↓', disabled: i === list.length - 1, onclick: () => move(1) }),
          h('button', { class: 'btn small ghost danger', type: 'button', 'aria-label': 'Supprimer', title: used ? `Utilisée par ${used} transaction(s) : renomme-la plutôt` : 'Supprimer', text: '✕', disabled: used > 0, onclick: () => {
            list.splice(i, 1);
            if (GROUPS.includes(g)) for (const y of Object.keys(cfg.plan)) if (cfg.plan[y][g]) delete cfg.plan[y][g][c];
            onChange();
          } })), msg, used ? h('div', { class: 'hint', text: `${used} transaction${used > 1 ? 's' : ''}` }) : null));
      });
      const add = h('input', { type: 'text', id: `cat-add-${gi}`, placeholder: 'Nouvelle catégorie' });
      const doAdd = () => { const v = add.value.trim(); if (!v || list.includes(v)) return; list.push(v); add.value = ''; onChange(); setTimeout(() => $(`cat-add-${gi}`)?.focus(), 10); };
      add.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
      wrap.append(h('div', { class: 'card', style: 'padding:12px' }, h('h3', { style: 'margin-top:0', text: g }), h('p', { class: 'hint', style: 'margin:0 0 8px', text: GROUP_HELP[g] }), box, h('div', { class: 'addrow' }, add, h('button', { class: 'btn small', type: 'button', text: 'Ajouter', onclick: doAdd }))));
    });
    return wrap;
  }

  function goalsEditor(cfg, onChange) {
    const tb = h('tbody');
    cfg.goals.forEach((g, i) => {
      const cat = h('select', { id: `goal-cat-${g.id}` }, opt('', '— catégorie —'), ...cfg.categories['Épargnes'].map(c => opt(c, c, c === g.category)));
      cat.addEventListener('change', () => { g.category = cat.value; onChange(); });
      const acc = h('select', { id: `goal-acc-${g.id}` }, opt('', '— compte —'), ...cfg.accounts.map(a => opt(a.name, a.name, a.name === g.account)));
      acc.addEventListener('change', () => { g.account = acc.value; onChange(); });
      const num = (k, label) => { const el = h('input', { type: 'text', inputmode: 'decimal', class: 'n', id: `goal-${k}-${g.id}`, value: num2.format(g[k]), 'aria-label': label }); el.addEventListener('change', () => { const n = parseNum(el.value); if (Number.isFinite(n) && n >= 0) { g[k] = r2(n); onChange(); } else el.value = num2.format(g[k]); }); return el; };
      tb.append(h('tr', null, h('td', null, cat), h('td', null, acc), h('td', { class: 'r' }, num('start', 'Montant de départ')), h('td', { class: 'r' }, num('target', 'Objectif')),
        h('td', null, h('button', { class: 'btn small danger', type: 'button', text: 'Supprimer', onclick: () => { cfg.goals.splice(i, 1); onChange(); } }))));
    });
    return h('div', null,
      cfg.goals.length ? h('div', { class: 'scroll' }, h('table', { class: 'edit-table' }, h('thead', null, h('tr', null, h('th', { text: 'Catégorie d’épargne' }), h('th', { text: 'Compte' }), h('th', { class: 'r', text: 'Déjà épargné' }), h('th', { class: 'r', text: 'Objectif' }), h('th'))), tb)) : h('p', { class: 'mut', text: 'Aucun objectif pour l’instant.' }),
      h('div', { class: 'btnrow', style: 'margin-top:8px' }, h('button', { class: 'btn', type: 'button', text: '+ Objectif', onclick: () => { cfg.goals.push({ id: uid(), category: cfg.categories['Épargnes'].find(c => !cfg.goals.some(g => g.category === c)) || '', account: cfg.accounts.find(a => a.savings)?.name || '', start: 0, target: 1000 }); onChange(); } })),
      h('p', { class: 'hint', text: '« Déjà épargné » : ce que tu avais déjà de côté pour ce projet avant de commencer le suivi.' }));
  }

  function loansEditor(cfg, onChange) {
    const list = h('div', { style: 'display:grid;gap:12px' });
    cfg.loans.forEach((l, i) => {
      const txt = (k, label) => { const el = h('input', { type: 'text', id: `loan-${k}-${l.id}`, value: l[k] }); el.addEventListener('change', () => { l[k] = el.value.trim(); onChange(); }); return h('label', { class: 'field' }, label, el); };
      const num = (k, label, intOnly) => { const el = h('input', { type: 'text', inputmode: 'decimal', id: `loan-${k}-${l.id}`, value: intOnly ? String(l[k] || '') : num2.format(l[k]) }); el.addEventListener('change', () => { const n = intOnly ? parseInt(el.value, 10) : parseNum(el.value); if (Number.isFinite(n) && n >= 0) { l[k] = intOnly ? n : r2(n); onChange(); } else el.value = l[k]; }); return h('label', { class: 'field' }, label, el); };
      const cat = h('select', { id: `loan-cat-${l.id}` }, opt('', '— choisir —'), ...cfg.categories.Factures.map(c => opt(c, c, c === l.category)));
      cat.addEventListener('change', () => { l.category = cat.value; onChange(); });
      const calc = h('button', { class: 'btn small', type: 'button', text: 'Calculer la mensualité', onclick: () => {
        const n = l.months, rm = (l.rate || 0) / 100 / 12, C = l.capital; if (!n || !C) return;
        const M = rm ? C * rm / (1 - Math.pow(1 + rm, -n)) : C / n;
        l.monthly = r2(M); l.interest = r2(M * n - C); onChange();
      } });
      list.append(h('div', { class: 'card', style: 'padding:12px' },
        h('div', { class: 'fields' }, txt('name', 'Nom'), h('label', { class: 'field' }, 'Catégorie de factures', cat), num('capital', 'Capital emprunté'), num('rate', 'Taux annuel (%)'), num('months', 'Durée (mois)', true), num('monthly', 'Mensualité'), num('interest', 'Total des intérêts'), num('paidBefore', 'Déjà remboursé avant le suivi'), (() => { const el = h('input', { type: 'month', id: `loan-start-${l.id}`, value: l.startDate }); el.addEventListener('change', () => { if (/^\d{4}-\d{2}$/.test(el.value) || el.value === '') { l.startDate = el.value; onChange(); } }); return h('label', { class: 'field' }, 'Première échéance', el); })()),
        h('div', { class: 'btnrow', style: 'margin-top:10px' }, calc, h('button', { class: 'btn small danger', type: 'button', text: 'Supprimer ce crédit', onclick: () => { cfg.loans.splice(i, 1); onChange(); } }))));
    });
    return h('div', null, cfg.loans.length ? list : h('p', { class: 'mut', text: 'Aucun crédit.' }),
      h('div', { class: 'btnrow', style: 'margin-top:8px' }, h('button', { class: 'btn', type: 'button', text: '+ Crédit', onclick: () => { cfg.loans.push({ id: uid(), name: 'Nouveau crédit', category: '', capital: 0, interest: 0, months: 0, rate: 0, monthly: 0, paidBefore: 0 }); onChange(); } })),
      h('p', { class: 'hint', text: 'Les remboursements comptés sont les factures saisies dans la catégorie choisie. Crée une catégorie dédiée (ex. « Crédit auto ») si besoin.' }));
  }

  function lookEditor(cfg, onChange) {
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Thème' }, ...[['system', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => h('button', { type: 'button', 'aria-pressed': String(cfg.theme === v), text: l, onclick: () => { cfg.theme = v; onChange(); } })));
    const sw = h('div', { class: 'swatches' }, ...ACCENTS.map(([n, c]) => h('button', { type: 'button', class: 'swatch', style: `background:${c}`, 'aria-label': n, title: n, 'aria-pressed': String(cfg.accent.toLowerCase() === c.toLowerCase()), onclick: () => { cfg.accent = c; cfg.accentChosen = true; onChange(); } })));
    const custom = h('input', { type: 'color', id: 'look-color', value: cfg.accent, 'aria-label': 'Couleur personnalisée', style: 'width:40px;height:32px;padding:0;border:1px solid var(--line);border-radius:8px;background:none' });
    custom.addEventListener('change', () => { cfg.accent = custom.value; cfg.accentChosen = true; onChange(); });
    sw.append(custom);
    return h('div', { class: 'fields' }, h('div', { class: 'field' }, 'Thème', seg), h('div', { class: 'field' }, 'Couleur principale', sw));
  }

  // ---------------------------------------------------------------- réglages
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (S && U.tab === 'reglages') renderSoon(); });
  window.addEventListener('appinstalled', () => { installEvt = null; renderSoon(); });

  function shareBox() {
    const url = location.origin + location.pathname.replace(/index\.html$/, '');
    const field = h('input', { type: 'text', readonly: true, value: url, 'aria-label': 'Lien de l’app', onclick: (e) => e.target.select() });
    const copy = h('button', { class: 'btn', type: 'button', text: 'Copier le lien', onclick: async () => { try { await navigator.clipboard.writeText(url); toast('Lien copié.'); } catch (e) { field.select(); toast('Sélectionne le lien et copie-le (Cmd+C).'); } } });
    const share = navigator.share ? h('button', { class: 'btn primary', type: 'button', text: 'Partager…', onclick: () => navigator.share({ title: S.cfg.appName || 'Focale', text: 'Une petite app de budget à essayer :', url }).catch(() => {}) }) : null;
    return h('div', { class: 'addrow' }, ...[field, copy, share].filter(Boolean));
  }
  function renderSettings() {
    const on = () => commit();
    const sec = (id, title, note, body) => h('div', { class: 'card', id }, h('h2', { text: title }), note ? h('p', { class: 'note', text: note }) : null, body);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const install = standalone ? h('p', { class: 'hint', text: 'L’app est installée sur cet appareil.' })
      : installEvt ? h('button', { class: 'btn primary', type: 'button', text: 'Installer l’app', onclick: async () => { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; renderSoon(); } })
      : h('p', { class: 'hint', text: 'iPhone / iPad : bouton Partager de Safari, puis « Sur l’écran d’accueil ». Android : menu de Chrome, puis « Installer l’application ». Ordinateur : icône d’installation dans la barre d’adresse de Chrome ou Edge.' });

    const data = h('div', null,
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn', type: 'button', text: 'Exporter une sauvegarde (.json)', onclick: exportJson }),
        h('button', { class: 'btn', type: 'button', text: 'Restaurer une sauvegarde', onclick: () => $('fileJson').click() }),
        h('button', { class: 'btn', type: 'button', text: 'Exporter les transactions (.csv)', onclick: exportCsv }),
        h('button', { class: 'btn', type: 'button', text: 'Importer des transactions (.csv)', onclick: () => $('fileCsv').click() })),
      U.msg.data ? h('p', { class: U.msg.dataBad ? 'warn' : 'hint', style: 'margin-top:8px', text: U.msg.data }) : null,
      U.pendingImport ? h('div', { class: 'banner' }, h('span', { text: `Remplacer toutes les données de cet appareil par « ${U.pendingImport.name} » (${U.pendingImport.data.tx.length} transactions) ?` }),
        h('div', { class: 'btnrow' }, h('button', { class: 'btn small danger', type: 'button', text: 'Remplacer', onclick: () => { S = U.pendingImport.data; U.pendingImport = null; U.msg.data = 'Sauvegarde restaurée.'; U.msg.dataBad = false; afterLoad(); save(); render(); } }),
          h('button', { class: 'btn small', type: 'button', text: 'Annuler', onclick: () => { U.pendingImport = null; render(); } }))) : null,
      h('p', { class: 'hint', text: 'Tes données restent uniquement dans ce navigateur, sur cet appareil. Exporte une sauvegarde régulièrement, et pour passer d’un appareil à l’autre.' }),
      h('p', { class: 'hint', text: 'CSV attendu (séparateur ; ou ,) : Date ; Montant ; Type ; Catégorie ; Depuis ; Vers ; Description ; Pointée. Les catégories et comptes inconnus sont créés automatiquement.' }),
      U.confirmReset
        ? h('div', { class: 'banner' }, h('span', { text: 'Tout effacer sur cet appareil ? Exporte d’abord une sauvegarde si tu veux garder tes données.' }), h('div', { class: 'btnrow' },
          h('button', { class: 'btn small danger', type: 'button', text: 'Tout effacer', onclick: () => { try { localStorage.removeItem(KEY); } catch (e) {} S = null; U.confirmReset = false; U.onbStep = 0; U.draft = null; render(); } }),
          h('button', { class: 'btn small', type: 'button', text: 'Annuler', onclick: () => { U.confirmReset = false; render(); } })))
        : h('button', { class: 'btn danger', type: 'button', text: 'Tout effacer…', onclick: () => { U.confirmReset = true; render(); } }));

    $('p-reglages').replaceChildren(h('div', { class: 'settings' },
      sec('set-general', 'Général', 'Nom, devise, format et rythme de ton budget.', generalFields(S.cfg, on)),
      sec('set-look', 'Apparence', null, lookEditor(S.cfg, on)),
      sec('set-accounts', 'Comptes', 'Renommer un compte met à jour toutes ses transactions.', accountsEditor(S.cfg, on, true)),
      sec('set-cats', 'Catégories', 'Renommer une catégorie met à jour ses transactions et ton prévisionnel. Une catégorie utilisée ne peut pas être supprimée.', categoriesEditor(S.cfg, on, true)),
      sec('set-goals', 'Objectifs d’épargne', null, goalsEditor(S.cfg, on)),
      sec('set-loans', 'Crédits & dettes', null, loansEditor(S.cfg, on)),
      sec('set-share', 'Faire essayer l’app', 'Envoie ce lien : la personne part d’une app vide, avec ses propres données sur son appareil. Rien de ce que tu as saisi n’est partagé.', shareBox()),
      sec('set-install', 'Installer sur cet appareil', `L’app fonctionne hors ligne une fois installée. Version ${APP_VERSION}.`, install),
      sec('set-data', 'Données & sauvegardes', null, data)));
    if (U.settingsFocus) { const el = $(U.settingsFocus === 'goals' ? 'set-goals' : 'set-loans'); U.settingsFocus = null; setTimeout(() => el?.scrollIntoView({ behavior: 'smooth' }), 30); }
  }

  // ---------------------------------------------------------------- import / export
  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const slug = (x) => (x || 'budget').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'budget';
  function exportJson() { download(`${slug(S.cfg.appName)}-sauvegarde-${todayStr()}.json`, JSON.stringify({ app: 'budget', ...S }, null, 1), 'application/json'); }
  function exportCsv() {
    const esc = (v) => /[";\n,]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    const rows = S.tx.slice().sort((a, b) => a.date.localeCompare(b.date));
    const lines = ['Date;Montant;Type;Catégorie;Depuis;Vers;Description;Pointée', ...rows.map(t => [t.date.split('-').reverse().join('/'), String(t.amount).replace('.', ','), t.type, t.category, t.from, t.to, t.description || '', t.pointed ? 'oui' : 'non'].map(esc).join(';'))];
    download(`${slug(S.cfg.appName)}-transactions-${todayStr()}.csv`, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  }
  function readFile(input, cb) {
    input.addEventListener('change', () => {
      const f = input.files && input.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => { cb(f.name, String(r.result)); input.value = ''; }; r.readAsText(f, 'utf-8');
    });
  }
  function parseBackup(text) {
    const o = JSON.parse(text);
    if (!o || typeof o !== 'object' || !o.cfg || !Array.isArray(o.tx)) throw new Error('format');
    return normalize(o);
  }
  function splitCsvLine(line, sep) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); return out.map(x => x.trim());
  }
  function importCsv(text) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) throw new Error('vide');
    const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
    const head = splitCsvLine(lines[0], sep).map(norm);
    const col = (names) => head.findIndex(x => names.includes(x));
    const ix = { date: col(['date']), amount: col(['montant', 'amount']), type: col(['type']), cat: col(['categorie', 'category']), from: col(['depuis', 'de', 'from', 'source']), to: col(['vers', 'a', 'to', 'destination']), desc: col(['description', 'libelle', 'label']), pt: col(['pointee', 'pointe', 'pointed']) };
    if (ix.date < 0 || ix.amount < 0) throw new Error('colonnes');
    const typeOf = (x) => { const n = norm(x || ''); if (n.startsWith('rev')) return 'Revenus'; if (n.startsWith('fac')) return 'Factures'; if (n.startsWith('dep')) return 'Dépenses'; if (n.startsWith('epa')) return 'Épargnes'; if (n.startsWith('rep')) return "Reprise d'épargne"; if (n.startsWith('tra')) return 'Transfert de fonds'; if (n.startsWith('rem')) return 'Remboursement'; return null; };
    const dateOf = (x) => { x = (x || '').trim(); let m = x.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`; m = x.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${pad2(m[2])}-${pad2(m[1])}`; } return null; };
    let added = 0, skipped = 0; const newCats = new Set(), newAccs = new Set();
    for (const line of lines.slice(1)) {
      const c = splitCsvLine(line, sep);
      const date = dateOf(c[ix.date]); let amount = parseNum(c[ix.amount]);
      let type = ix.type >= 0 ? typeOf(c[ix.type]) : null;
      if (!type) type = amount < 0 ? 'Dépenses' : 'Revenus';
      amount = r2(Math.abs(amount));
      if (!date || !(amount > 0)) { skipped++; continue; }
      const cat = (ix.cat >= 0 && c[ix.cat]) || 'Divers';
      const grp = groupsOfType(type)[type === 'Remboursement' ? 1 : 0];
      if (!catsFor(type).includes(cat)) { S.cfg.categories[grp].push(cat); newCats.add(cat); }
      const defFrom = (type === 'Revenus' || type === 'Remboursement') ? 'Externe' : mainAcc();
      const defTo = (type === 'Revenus' || type === 'Remboursement') ? mainAcc() : 'Externe';
      const from = (ix.from >= 0 && c[ix.from]) || defFrom, to = (ix.to >= 0 && c[ix.to]) || defTo;
      for (const a of [from, to]) if (a !== 'Externe' && !accNames().includes(a)) { S.cfg.accounts.push({ id: uid(), name: a, start: 0, savings: false, current: true, color: nextAccColor(S.cfg) }); newAccs.add(a); }
      const ptRaw = ix.pt >= 0 ? norm(c[ix.pt] || '') : 'oui';
      S.tx.push({ id: uid(), date, amount, type, category: cat, from, to, description: ix.desc >= 0 ? (c[ix.desc] || '') : '', pointed: !['non', 'faux', 'false', 'no', '0'].includes(ptRaw) });
      added++;
    }
    return { added, skipped, newCats: [...newCats], newAccs: [...newAccs] };
  }

  // ---------------------------------------------------------------- données d'exemple
  function sampleState() {
    let seed = 7; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const between = (a, b) => r2(a + rnd() * (b - a));
    const now = new Date(), y = now.getFullYear(), mNow = now.getMonth() + 1, dNow = now.getDate();
    const cfg = defaultCfg(); cfg.appName = 'Budget (exemple)'; cfg.sample = true; cfg.year = y;
    cfg.accounts = [{ id: uid(), name: 'Compte courant', start: 850, savings: false }, { id: uid(), name: 'Livret A', start: 2400, savings: true }, { id: uid(), name: 'Assurance-vie', start: 3000, savings: true }];
    cfg.categories.Factures.push('Crédit auto');
    const rep = (v) => Array(12).fill(v);
    cfg.plan[y] = {
      Revenus: { Salaire: rep(2150) },
      Factures: { 'Loyer / crédit immobilier': rep(640), 'Électricité & gaz': rep(72), 'Internet & téléphone': rep(35), Assurances: rep(48), Abonnements: rep(22), 'Frais bancaires': rep(4), 'Crédit auto': rep(198.75) },
      'Dépenses': { Courses: rep(320), 'Transport & carburant': rep(110), 'Restaurants & sorties': rep(120), Shopping: rep(90), Loisirs: rep(50), 'Santé': rep(25) },
      'Épargnes': { 'Épargne de précaution': rep(200), Investissements: rep(100) }
    };
    cfg.goals = [{ id: uid(), category: 'Épargne de précaution', account: 'Livret A', start: 2400, target: 6000 }, { id: uid(), category: 'Investissements', account: 'Assurance-vie', start: 3000, target: 10000 }];
    cfg.loans = [{ id: uid(), name: 'Crédit auto', category: 'Crédit auto', capital: 9000, interest: 540, months: 48, rate: 2.9, monthly: 198.75, paidBefore: 1987.5 }];
    const tx = []; const add = (m, d, amount, type, category, from, to, description) => {
      if (m === mNow && d > dNow) return;
      const date = `${y}-${pad2(m)}-${pad2(d)}`;
      tx.push({ id: uid(), date, amount: r2(amount), type, category, from, to, description: description || '', pointed: !(m === mNow && d > dNow - 3) });
    };
    const C = 'Compte courant';
    for (let m = 1; m <= mNow; m++) {
      add(m, 1, between(2100, 2200), 'Revenus', 'Salaire', 'Externe', C, 'Salaire');
      add(m, 2, 200, 'Épargnes', 'Épargne de précaution', C, 'Livret A', 'Virement mensuel');
      add(m, 2, 100, 'Épargnes', 'Investissements', C, 'Assurance-vie', 'Versement programmé');
      add(m, 3, 640, 'Factures', 'Loyer / crédit immobilier', C, 'Externe', 'Loyer');
      add(m, 5, 198.75, 'Factures', 'Crédit auto', C, 'Externe', 'Échéance');
      add(m, 5, 4, 'Factures', 'Frais bancaires', C, 'Externe');
      add(m, 8, between(60, 85), 'Factures', 'Électricité & gaz', C, 'Externe');
      add(m, 10, 34.99, 'Factures', 'Internet & téléphone', C, 'Externe', 'Box + mobile');
      add(m, 12, 47.6, 'Factures', 'Assurances', C, 'Externe', 'Auto + habitation');
      add(m, 15, 21.98, 'Factures', 'Abonnements', C, 'Externe', 'Streaming');
      for (let k = 0; k < 5; k++) add(m, 3 + k * 6, between(35, 80), 'Dépenses', 'Courses', C, 'Externe', 'Supermarché');
      for (let k = 0; k < 2; k++) add(m, 6 + k * 12, between(40, 65), 'Dépenses', 'Transport & carburant', C, 'Externe', 'Carburant');
      for (let k = 0, n = 2 + Math.floor(rnd() * 3); k < n; k++) add(m, 4 + k * 7, between(14, 55), 'Dépenses', 'Restaurants & sorties', C, 'Externe');
      if (rnd() > 0.35) add(m, 17, between(25, 140), 'Dépenses', 'Shopping', C, 'Externe');
      if (rnd() > 0.4) add(m, 20, between(10, 60), 'Dépenses', 'Loisirs', C, 'Externe');
      if (rnd() > 0.6) { add(m, 22, 30, 'Dépenses', 'Santé', C, 'Externe', 'Médecin'); add(m, 26, 21, 'Remboursement', 'Santé', 'Externe', C, 'Assurance maladie'); }
    }
    return normalize({ cfg, tx });
  }

  // ---------------------------------------------------------------- accueil
  function renderOnboarding() {
    $('top').hidden = true; $('sampleBanner').hidden = true;
    for (const t of TABS) $('p-' + t).hidden = true;
    const p = $('p-onboarding'); p.hidden = false;
    if (!U.draft) U.draft = defaultCfg();
    const d = U.draft; applyLookDraft(d);
    const re = () => renderSoon();
    const steps = ['Bienvenue', 'Comptes', 'Catégories'];
    const stepsEl = h('div', { class: 'steps' }, ...steps.map((st, i) => h('span', { 'aria-current': i === U.onbStep ? 'step' : null, text: `${i + 1}. ${st}` })));
    let body;
    if (U.onbStep === 0) {
      body = h('div', { style: 'display:grid;gap:12px' },
        (() => { const w = h('div', { class: 'wordmark' }); w.innerHTML = MARK_SVG.replace(/lensg/g, 'lensg2'); w.append('Focale'); return w; })(),
        h('h1', { text: 'Ton budget, net et précis.' }),
        h('p', { class: 'lede', style: 'margin:0', text: 'Suis tes comptes, tes transactions, ton prévisionnel, ton épargne et tes crédits. Tout fonctionne hors ligne et tes données ne quittent jamais cet appareil.' }),
        h('div', { class: 'card' }, h('h2', { text: 'Pour commencer' }), h('p', { class: 'note', text: 'Tout reste modifiable plus tard dans Réglages.' }), generalFields(d, re)),
        h('div', { class: 'card' }, h('h2', { text: 'Déjà une sauvegarde, ou envie de voir avant ?' }),
          h('div', { class: 'btnrow', style: 'margin-top:10px' },
            h('button', { class: 'btn', type: 'button', text: 'Restaurer une sauvegarde (.json)', onclick: () => $('fileJson').click() }),
            h('button', { class: 'btn', type: 'button', text: 'Essayer avec des données d’exemple', onclick: () => { S = sampleState(); afterLoad(); save(); render(); } })),
          U.msg.onb ? h('p', { class: 'warn', text: U.msg.onb }) : null));
    } else if (U.onbStep === 1) {
      body = h('div', { class: 'card' }, h('h2', { text: 'Tes comptes' }), h('p', { class: 'note', text: 'Ajoute chaque compte que tu veux suivre, avec son solde actuel. Les achats, factures et revenus passent de « Externe » vers ces comptes, ou l’inverse.' }), accountsEditor(d, re, false));
    } else {
      body = h('div', null, h('p', { class: 'lede', text: 'Voici des catégories pour démarrer. Renomme, supprime ou ajoute ce que tu veux.' }), categoriesEditor(d, re, false));
    }
    const nav = h('div', { class: 'nav' },
      U.onbStep > 0 ? h('button', { class: 'btn', type: 'button', text: '← Retour', onclick: () => { U.onbStep--; render(); } }) : h('span'),
      U.onbStep < 2
        ? h('button', { class: 'btn primary', type: 'button', text: 'Continuer →', disabled: U.onbStep === 1 && !d.accounts.length, onclick: () => { U.onbStep++; render(); window.scrollTo({ top: 0 }); } })
        : h('button', { class: 'btn primary', type: 'button', text: 'Créer mon budget', onclick: () => { S = normalize({ cfg: d, tx: [] }); U.draft = null; U.onbStep = 0; afterLoad(); U.tab = 'previsionnel'; save(); try { navigator.storage?.persist?.(); } catch (e) {} render(); } }));
    p.replaceChildren(h('div', { class: 'onb' }, stepsEl, body, nav));
  }
  function applyLookDraft(d) {
    const root = document.documentElement; root.removeAttribute('data-theme'); root.style.setProperty('--accent-base', d.accent);
    try { num2 = new Intl.NumberFormat(d.locale, { maximumFractionDigits: 2, useGrouping: false }); } catch (e) { num2 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2, useGrouping: false }); }
  }

  // ---------------------------------------------------------------- démarrage
  function afterLoad() {
    applyLook(S.cfg);
    const tb = bm(todayStr());
    U.year = tb.y >= S.cfg.year ? tb.y : S.cfg.year;
    if (!years().includes(U.year)) U.year = years().slice(-1)[0];
    U.period = U.year === tb.y ? String(tb.m) : '1';
    U.editing = null;
    resetForm();
    autoPostRecurring();
  }

  function init() {
    // contrôles statiques
    $('f-type').replaceChildren(...TYPES.map(t => opt(t)));
    $('ft').replaceChildren(opt('', 'Tous les types'), ...TYPES.map(t => opt(t)));
    
    $('period').addEventListener('change', () => { U.period = $('period').value; if (U.tab === 'transactions' && !U.editing) resetForm(); render(); });
    $('year').addEventListener('change', () => { U.year = +$('year').value; if (U.tab === 'transactions' && !U.editing) resetForm(); render(); });
    document.querySelectorAll('nav.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $('quickAdd').addEventListener('click', () => { showTab('transactions'); setTimeout(() => { const i = $('ex-in'); if (i) { i.focus(); i.scrollIntoView({ block: 'center' }); } }, 30); });
    $('f-type').addEventListener('change', () => { refreshFormOptions(); applyDefaults(); });
    $('f-cat').addEventListener('change', () => applyDefaults(true));
    $('txf').addEventListener('submit', onSubmit);
    $('f-cancel').addEventListener('click', resetForm);
    for (const id of ['q', 'ft', 'fp', 'fa']) $(id).addEventListener('input', renderList);
    $('leaveSample').addEventListener('click', () => { try { localStorage.removeItem(KEY); } catch (e) {} S = null; U.draft = null; U.onbStep = 0; render(); });
    readFile($('fileJson'), (name, text) => {
      let data; try { data = parseBackup(text); } catch (e) {
        if (S) { U.msg.data = 'Ce fichier n’est pas une sauvegarde de cette app.'; U.msg.dataBad = true; } else U.msg.onb = 'Ce fichier n’est pas une sauvegarde de cette app.';
        render(); return;
      }
      if (!S) { S = data; afterLoad(); save(); render(); return; }
      U.pendingImport = { name, data }; render();
    });
    readFile($('fileCsv'), (name, text) => {
      try {
        const r = importCsv(text);
        U.msg.data = `${r.added} transaction${r.added > 1 ? 's' : ''} importée${r.added > 1 ? 's' : ''}${r.skipped ? `, ${r.skipped} ligne(s) ignorée(s) (date ou montant illisible)` : ''}.` + (r.newCats.length ? ` Catégories créées : ${r.newCats.join(', ')}.` : '') + (r.newAccs.length ? ` Comptes créés : ${r.newAccs.join(', ')} (solde de départ à 0, à ajuster).` : '');
        U.msg.dataBad = false; save();
      } catch (e) { U.msg.data = 'Fichier CSV illisible : il faut au moins les colonnes Date et Montant.'; U.msg.dataBad = true; }
      render();
    });
    let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (!S) return; if (U.tab === 'apercu') { drawMonths(); drawSplit(); } if (U.tab === 'apercu') drawWorth(); if (U.tab === 'epargne') { drawEvo(); drawRate(); } if (U.tab === 'credits') renderCredits(); }, 120); }).observe(document.querySelector('.wrap'));
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => S && render());
    window.addEventListener('storage', (e) => { if (e.key === KEY) { S = load(); if (S) afterLoad(); render(); } });

    S = load();
    if (S) {
      afterLoad();
      const hash = location.hash.slice(1);
      if (TABS.includes(hash)) U.tab = hash;
      setStatus('Enregistré sur cet appareil');
      handleLaunchParams();
    }
    render();
  }

  // Pour les tests et le débogage depuis la console.
  window.__budget = { get state() { return S; }, U };
  init();
})();
