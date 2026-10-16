/* Budget — app de suivi budgétaire hors ligne.
   Toutes les données restent dans le navigateur (localStorage), avec export/import de sauvegarde. */
(() => {
  'use strict';

  // ---------------------------------------------------------------- constantes
  const KEY = 'budget-app-v1';
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
  const ACCENTS = [['Vert','#2C6A4D'],['Bleu','#2B5C8A'],['Prune','#6D4C8E'],['Brique','#A84B2F'],['Ardoise','#46566B'],['Framboise','#A33D64']];
  const CURRENCIES = [['EUR','Euro (€)'],['CHF','Franc suisse'],['CAD','Dollar canadien'],['USD','Dollar US'],['GBP','Livre sterling'],['MAD','Dirham marocain'],['TND','Dinar tunisien'],['DZD','Dinar algérien'],['XOF','Franc CFA (BCEAO)'],['XAF','Franc CFA (BEAC)']];
  const LOCALES = [['fr-FR','1 234,56 € (France)'],['fr-BE','Belgique'],['fr-CH','Suisse'],['fr-CA','Canada'],['en-GB','1,234.56 (Royaume-Uni)'],['en-US','1,234.56 (États-Unis)'],['de-DE','1.234,56 (Allemagne)']];

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
      categories: clone(DEFAULT_CATS), plan: {}, goals: [], loans: [], sample: false
    };
  }

  function normalize(data) {
    const d = defaultCfg();
    const cfg = Object.assign({}, d, data.cfg || {});
    cfg.startDay = Math.min(28, Math.max(1, parseInt(cfg.startDay, 10) || 1));
    cfg.year = parseInt(cfg.year, 10) || d.year;
    cfg.accounts = (Array.isArray(cfg.accounts) ? cfg.accounts : []).filter(a => a && a.name && a.name !== 'Externe').map(a => ({ id: a.id || uid(), name: String(a.name), start: r2(a.start), savings: !!a.savings }));
    const cats = {};
    for (const g of CAT_GROUPS) cats[g] = Array.isArray(cfg.categories?.[g]) ? [...new Set(cfg.categories[g].map(String).filter(Boolean))] : clone(DEFAULT_CATS[g]);
    cfg.categories = cats;
    cfg.plan = cfg.plan && typeof cfg.plan === 'object' ? cfg.plan : {};
    // ancien format : plan sans année
    if (cfg.plan.Revenus || cfg.plan.Factures || cfg.plan['Dépenses'] || cfg.plan['Épargnes']) cfg.plan = { [cfg.year]: cfg.plan };
    cfg.goals = (Array.isArray(cfg.goals) ? cfg.goals : []).map(g => ({ id: g.id || uid(), category: g.category || '', account: g.account || '', start: r2(g.start), target: r2(g.target) }));
    cfg.loans = (Array.isArray(cfg.loans) ? cfg.loans : []).map(l => ({ id: l.id || uid(), name: l.name || 'Crédit', category: l.category || '', capital: r2(l.capital), interest: r2(l.interest), months: parseInt(l.months, 10) || 0, rate: +l.rate || 0, monthly: r2(l.monthly), paidBefore: r2(l.paidBefore) }));
    const tx = (Array.isArray(data.tx) ? data.tx : []).filter(t => t && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && +t.amount > 0).map(t => ({
      id: t.id || uid(), date: t.date, amount: r2(t.amount), type: TYPES.includes(t.type) ? t.type : 'Dépenses',
      category: String(t.category || ''), from: String(t.from || 'Externe'), to: String(t.to || 'Externe'), description: String(t.description || ''), pointed: t.pointed !== false
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
    document.title = cfg.appName || 'Budget';
    $('appName').textContent = cfg.appName || 'Budget';
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
    $('p-onboarding').hidden = true;
    $('sampleBanner').hidden = !S.cfg.sample;
    // sélecteurs de période
    const ys = years(); if (!ys.includes(U.year)) U.year = ys[ys.length - 1];
    const ysel = $('year'); ysel.replaceChildren(...ys.map(y => opt(String(y), String(y), y === U.year)));
    ysel.hidden = ys.length < 2;
    const ps = $('period'); ps.replaceChildren(...MONTHS.map((m, i) => opt(String(i + 1), ys.length < 2 ? `${m} ${U.year}` : m, String(i + 1) === U.period)), opt('year', ys.length < 2 ? `Année ${U.year}` : 'Année entière', U.period === 'year'));
    document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === U.tab)));
    for (const t of ['apercu', 'transactions', 'previsionnel', 'epargne', 'reglages']) $('p-' + t).hidden = t !== U.tab;
    if (U.tab === 'apercu') renderApercu();
    if (U.tab === 'transactions') { refreshFormOptions(); renderList(); }
    if (U.tab === 'previsionnel') renderPlan();
    if (U.tab === 'epargne') renderEpargne();
    if (U.tab === 'reglages') renderSettings();
  }
  function showTab(tab) {
    if (!['apercu', 'transactions', 'previsionnel', 'epargne', 'reglages'].includes(tab)) tab = 'apercu';
    U.tab = tab;
    try { history.replaceState(null, '', '#' + tab); } catch (e) {}
    render();
    window.scrollTo({ top: 0 });
  }

  // ---------------------------------------------------------------- aperçu
  function renderApercu() {
    const b = budget(), t = b.tot;
    const pRev = plannedTotal('Revenus'), pF = plannedTotal('Factures'), pD = plannedTotal('Dépenses'), pE = plannedTotal('Épargnes');
    const reste = r2(t.Revenus - t.Factures - t['Dépenses']);
    const rate = t.Revenus ? t['Épargnes'] / t.Revenus : 0;
    const overD = r2(t['Dépenses'] - pD);
    const lede = $('lede'); lede.replaceChildren();
    if (U.period !== 'year' && S.cfg.startDay > 1) {
      const [a, z] = monthRange(U.year, +U.period);
      lede.append(h('span', { class: 'mut', text: `Du ${dfmt(a)} au ${dfmt(z)}. ` }));
    }
    if (!S.tx.length) {
      lede.append('Ton budget est prêt. Ajoute ta première transaction avec « + Transaction », puis remplis ton prévisionnel pour comparer prévu et réel.');
    } else {
      lede.append(`Sur ${periodLabel()} : `, h('b', { text: money(reste) }), ` de reste après factures et dépenses, et un taux d'épargne de `, h('b', { text: pct.format(rate) }), '. ');
      if (pD > 0) lede.append(overD > 0 ? `Tes dépenses dépassent le prévu de ${money(overD)}.` : `Tes dépenses restent ${money(-overD)} sous le prévu.`);
    }
    const kpi = (lbl, val, sub, cls) => h('div', { class: 'kpi' }, h('span', { class: 'lbl', text: lbl }), h('span', { class: 'val ' + (cls || ''), text: val }), h('span', { class: 'sub', text: sub }));
    $('kpis').replaceChildren(
      kpi('Revenus', money(t.Revenus), `prévu ${money(pRev)}`),
      kpi('Factures', money(t.Factures), `prévu ${money(pF)}`),
      kpi('Dépenses', money(t['Dépenses']), `prévu ${money(pD)}`, overD > 0.004 && pD > 0 ? 'neg' : ''),
      kpi('Épargné', money(t['Épargnes']), `prévu ${money(pE)} · repris ${money(t.reprises)}`),
      kpi('Reste', money(reste), 'revenus − factures − dépenses', reste < 0 ? 'neg' : '')
    );
    // comptes
    const { real, fut } = balances();
    const acc = h('div', { class: 'acc' }, h('span', { class: 'h', text: 'Compte' }), h('span', { class: 'h', style: 'text-align:right', text: 'Réel' }), h('span', { class: 'h', style: 'text-align:right', text: 'À venir' }));
    const row = (name, a, f, cls) => [h('span', { class: cls || '', text: name }), h('span', { class: 'num ' + (cls || '') + (a < 0 ? ' neg' : ''), style: 'text-align:right', text: money(a) }), h('span', { class: 'num mut ' + (cls || ''), style: 'text-align:right', text: money(f) })];
    let tr = 0, tf = 0;
    for (const [label, list] of [['Comptes courants', S.cfg.accounts.filter(a => !a.savings)], ['Épargne', S.cfg.accounts.filter(a => a.savings)]]) {
      if (!list.length) continue;
      acc.append(h('span', { class: 'sec', text: label }));
      for (const a of list) { acc.append(...row(a.name, real[a.name], fut[a.name])); tr += real[a.name]; tf += fut[a.name]; }
    }
    acc.append(...row('Total', r2(tr), r2(tf), 'tot'));
    $('accounts').replaceChildren(S.cfg.accounts.length ? acc : h('p', { class: 'mut', text: 'Aucun compte. Ajoute-en dans Réglages.' }));
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
        const over = (g === 'Factures' || g === 'Dépenses') && x.r > x.p + 0.005;
        const col = over ? 'var(--bad)' : g === 'Dépenses' ? 'var(--ochre)' : g === 'Épargnes' ? 'var(--plum)' : g === 'Factures' ? 'var(--muted)' : 'var(--accent)';
        tb.append(h('tr', null, h('td', { text: x.c }), h('td', { class: 'r num mut', text: money(x.p) }), h('td', { class: 'r num', text: money(x.r) }),
          h('td', { style: 'width:22%' }, h('div', { class: 'bar' }, h('i', { style: `width:${Math.max(0, w)}%;background:${col}` }))),
          h('td', { class: 'r num ' + (Math.abs(d) < 0.005 ? 'mut' : d < 0 ? 'neg' : 'pos'), text: sgn(d) })));
      }
    }
    $('detail').replaceChildren(h('thead', null, h('tr', null, h('th', { text: 'Catégorie' }), h('th', { class: 'r', text: 'Prévu' }), h('th', { class: 'r', text: 'Réel' }), h('th', { text: 'Consommé' }), h('th', { class: 'r', text: 'Écart' }))), tb);
    $('split-note').textContent = `Factures et dépenses de ${periodLabel()}, par catégorie.`;
    drawMonths(); drawSplit();
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
  function niceStep(max) { const raw = max / 4; const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }

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
          h('div', null, h('i', { class: 'sw', style: 'background:var(--plum)' }), `Épargne ${money(d.ep)}`));
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
    const wasEdit = !!U.editing;
    U.lastAcc[tx.type] = [from, to];
    upsertTx(tx);
    const keep = { type: tx.type, cat: tx.category, date };
    resetForm();
    if (!wasEdit) { $('f-type').value = keep.type; refreshFormOptions(); $('f-cat').value = keep.cat; applyDefaults(); $('f-date').value = keep.date; }
    $('f-ok').textContent = wasEdit ? 'Transaction modifiée.' : `Ajoutée : ${money(amount)} · ${tx.category}`;
    $('f-amount').focus();
  }
  function typeChip(type) {
    const cls = type === 'Revenus' ? 'c-rev' : type === 'Factures' ? 'c-fac' : type === 'Dépenses' ? 'c-dep' : (type === 'Épargnes' || type === "Reprise d'épargne") ? 'c-ep' : 'c-oth';
    const label = type === "Reprise d'épargne" ? 'Reprise' : type === 'Transfert de fonds' ? 'Transfert' : type;
    return h('span', { class: 'chip ' + cls, text: label });
  }
  function renderList() {
    const q = $('q').value.trim().toLowerCase(), ft = $('ft').value, fp = $('fp').value;
    let rows = S.tx.filter(t => inPeriod(t));
    if (ft) rows = rows.filter(t => t.type === ft);
    if (fp) rows = rows.filter(t => String(+!!t.pointed) === fp);
    if (q) rows = rows.filter(t => [t.category, t.description, t.type, t.from, t.to, money(t.amount), String(t.amount)].join(' ').toLowerCase().includes(q));
    rows.sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
    const unp = rows.filter(t => !t.pointed).length;
    $('list-title').textContent = `Transactions · ${U.period === 'year' ? 'année ' + U.year : MONTHS[+U.period - 1] + ' ' + U.year}`;
    $('list-note').textContent = `${rows.length} transaction${rows.length > 1 ? 's' : ''}${unp ? `, dont ${unp} non pointée${unp > 1 ? 's' : ''}` : ''}. Coche pour pointer, « Modifier » pour corriger.`;
    const tb = h('tbody');
    for (const t of rows) {
      const sg = (t.type === 'Revenus' || t.type === 'Remboursement') ? 1 : (t.type === 'Dépenses' || t.type === 'Factures') ? -1 : 0;
      const cb = h('input', { type: 'checkbox', 'aria-label': 'Pointée', checked: t.pointed });
      cb.addEventListener('change', () => { t.pointed = cb.checked; commit(); });
      const acts = h('div', { class: 'acts' });
      const del = h('button', { class: 'btn small danger', type: 'button', text: 'Supprimer' });
      del.addEventListener('click', () => {
        acts.replaceChildren(h('span', { class: 'mut', style: 'font-size:12px;align-self:center', text: 'Supprimer ?' }),
          h('button', { class: 'btn small danger', type: 'button', text: 'Oui', onclick: () => removeTx(t.id) }),
          h('button', { class: 'btn small', type: 'button', text: 'Non', onclick: () => renderList() }));
      });
      acts.append(h('button', { class: 'btn small', type: 'button', text: 'Modifier', onclick: () => editTx(t) }), del);
      tb.append(h('tr', { class: t.pointed ? '' : 'unpointed' },
        h('td', null, cb),
        h('td', { class: 'num', text: `${t.date.slice(8, 10)}/${t.date.slice(5, 7)}` }),
        h('td', null, h('div', null, typeChip(t.type), ' ', t.category), h('div', { class: 'desc', text: [t.description, `${t.from} → ${t.to}`].filter(Boolean).join(' · ') })),
        h('td', { class: 'r num ' + (sg > 0 ? 'pos' : ''), text: (sg > 0 ? '+' : sg < 0 ? '−' : '') + money(t.amount) }),
        h('td', null, acts)));
    }
    if (!rows.length) tb.append(h('tr', null, h('td', { colspan: 5, class: 'mut', style: 'text-align:center;padding:24px', text: S.tx.length ? 'Aucune transaction ne correspond sur cette période.' : 'Aucune transaction pour l’instant. Ajoute la première avec le formulaire.' })));
    $('txlist').replaceChildren(h('thead', null, h('tr', null, h('th', { text: '✓' }), h('th', { text: 'Date' }), h('th', { text: 'Catégorie' }), h('th', { class: 'r', text: 'Montant' }), h('th'))), tb);
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
    // crédits
    const lb = $('loans'); lb.replaceChildren();
    const revs = MONTHS.map((_, i) => budget(String(i + 1)).tot.Revenus).filter(v => v > 0);
    const avgRev = revs.length ? revs.reduce((a, b) => a + b, 0) / revs.length : 0;
    let monthlyTot = 0;
    for (const ln of S.cfg.loans) {
      const total = r2(ln.capital + ln.interest);
      const paid = r2(ln.paidBefore + S.tx.filter(t => t.type === 'Factures' && t.category === ln.category).reduce((a, t) => a + t.amount, 0));
      const rest = Math.max(0, r2(total - paid)), prog = total ? paid / total : 0;
      if (rest > 0) monthlyTot += ln.monthly;
      const left = ln.monthly ? Math.ceil(rest / ln.monthly - 0.001) : 0;
      lb.append(h('div', { style: 'margin-bottom:16px' },
        h('div', { style: 'font-weight:600;margin-bottom:6px', text: [ln.name, ln.capital ? `${fmt0.format(ln.capital)}` : '', ln.rate ? `à ${num2.format(ln.rate)} %` : '', ln.months ? `sur ${ln.months} mois` : ''].filter(Boolean).join(' · ') }),
        h('div', { class: 'statrow' },
          h('div', null, h('span', { class: 'big', text: money(rest) }), h('small', { text: 'reste dû' })),
          h('div', null, h('span', { class: 'big', style: 'font-size:22px', text: money(paid) }), h('small', { text: `remboursé sur ${money(total)}` })),
          ln.monthly ? h('div', null, h('span', { class: 'big', style: 'font-size:22px', text: String(left) }), h('small', { text: `mensualités de ${money(ln.monthly)} restantes` })) : null),
        h('div', { style: 'display:flex;gap:8px;align-items:center' }, h('div', { class: 'bar', style: 'flex:1;height:8px' }, h('i', { style: `width:${Math.min(100, prog * 100)}%` })), h('span', { class: 'num', style: 'font-size:12px', text: pct.format(prog) })),
        ln.category ? null : h('p', { class: 'warn', text: 'Choisis la catégorie de factures de ce crédit dans Réglages pour compter les remboursements.' })));
    }
    if (!S.cfg.loans.length) lb.append(h('p', { class: 'mut' }, 'Aucun crédit enregistré. ', h('button', { class: 'btn small', type: 'button', text: 'Ajouter un crédit', onclick: () => { U.settingsFocus = 'loans'; showTab('reglages'); } })));
    else {
      const rate = avgRev ? monthlyTot / avgRev : 0;
      lb.append(h('p', { class: 'note', style: 'margin:0' }, 'Taux d’endettement : ', h('b', { class: rate > 0.35 ? 'neg' : '', text: pct.format(rate) }), ` de ton revenu mensuel moyen en ${U.year} (${money(r2(avgRev))}), pour un plafond conseillé de 35 %.`));
    }
    drawEvo();
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

  // ---------------------------------------------------------------- éditeurs partagés (accueil + réglages)
  function generalFields(cfg, onChange) {
    const name = h('input', { type: 'text', id: 'g-name', value: cfg.appName, maxlength: 40 });
    name.addEventListener('change', () => { cfg.appName = name.value.trim() || 'Mon budget'; onChange(); });
    const cur = h('select', { id: 'g-cur' }, ...CURRENCIES.map(([c, l]) => opt(c, `${c} · ${l}`, c === cfg.currency)));
    if (!CURRENCIES.some(([c]) => c === cfg.currency)) cur.append(opt(cfg.currency, cfg.currency, true));
    cur.addEventListener('change', () => { cfg.currency = cur.value; onChange(); });
    const loc = h('select', { id: 'g-loc' }, ...LOCALES.map(([c, l]) => opt(c, l, c === cfg.locale)));
    loc.addEventListener('change', () => { cfg.locale = loc.value; onChange(); });
    const yr = h('input', { type: 'number', id: 'g-year', min: 1990, max: 2100, value: cfg.year });
    yr.addEventListener('change', () => { const v = parseInt(yr.value, 10); if (v >= 1990 && v <= 2100) { cfg.year = v; onChange(); } });
    const day = h('select', { id: 'g-day' }, ...Array.from({ length: 28 }, (_, i) => opt(String(i + 1), i === 0 ? '1er du mois' : `le ${i + 1}`, i + 1 === cfg.startDay)));
    day.addEventListener('change', () => { cfg.startDay = +day.value; onChange(); });
    const early = h('input', { type: 'checkbox', id: 'g-early', checked: cfg.startEarly });
    early.addEventListener('change', () => { cfg.startEarly = early.checked; onChange(); });
    return h('div', { class: 'fields' },
      h('label', { class: 'field' }, 'Nom de l’app', name),
      h('label', { class: 'field' }, 'Devise', cur),
      h('label', { class: 'field' }, 'Format des nombres', loc),
      h('label', { class: 'field' }, 'Année de départ', yr),
      h('label', { class: 'field' }, 'Le mois budgétaire commence', day),
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
      const start = h('input', { type: 'text', inputmode: 'decimal', class: 'n', id: `acc-start-${a.id}`, value: num2.format(a.start), 'aria-label': 'Solde de départ' });
      start.addEventListener('change', () => { const n = parseNum(start.value); if (Number.isFinite(n)) { a.start = r2(n); onChange(); } else start.value = num2.format(a.start); });
      const sav = h('input', { type: 'checkbox', id: `acc-sav-${a.id}`, checked: a.savings, 'aria-label': 'Compte épargne' });
      sav.addEventListener('change', () => { a.savings = sav.checked; onChange(); });
      const move = (d) => { const j = i + d; if (j < 0 || j >= cfg.accounts.length) return; [cfg.accounts[i], cfg.accounts[j]] = [cfg.accounts[j], cfg.accounts[i]]; onChange(); };
      const del = h('button', { class: 'btn small danger', type: 'button', text: 'Supprimer', disabled: used > 0, title: used ? `Utilisé par ${used} transaction(s) : renomme-le plutôt` : null, onclick: () => { cfg.accounts.splice(i, 1); onChange(); } });
      tb.append(h('tr', null,
        h('td', null, name, msg, used ? h('div', { class: 'hint', text: `${used} transaction${used > 1 ? 's' : ''}` }) : null),
        h('td', { class: 'r' }, start),
        h('td', { style: 'text-align:center' }, sav),
        h('td', null, h('div', { class: 'acts' },
          h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Monter', text: '↑', disabled: i === 0, onclick: () => move(-1) }),
          h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Descendre', text: '↓', disabled: i === cfg.accounts.length - 1, onclick: () => move(1) }),
          del))));
    });
    const add = h('input', { type: 'text', id: 'acc-add', placeholder: 'Nouveau compte (ex. LEP, PEA, Compte joint)' });
    const addMsg = h('span', { class: 'warn' });
    const doAdd = () => { const v = add.value.trim(); if (!v) return; if (v === 'Externe' || cfg.accounts.some(a => a.name === v)) { addMsg.textContent = 'Ce nom existe déjà.'; return; } cfg.accounts.push({ id: uid(), name: v, start: 0, savings: /livret|lep|pel|cel|pea|assurance|épargne|epargne|cto|bourse/i.test(v) }); add.value = ''; onChange(); setTimeout(() => $('acc-add')?.focus(), 10); };
    add.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    return h('div', null,
      h('div', { class: 'scroll' }, h('table', { class: 'edit-table' }, h('thead', null, h('tr', null, h('th', { text: 'Compte' }), h('th', { class: 'r', text: 'Solde de départ' }), h('th', { style: 'text-align:center', text: 'Épargne' }), h('th'))), tb)),
      h('div', { class: 'addrow' }, add, h('button', { class: 'btn', type: 'button', text: 'Ajouter', onclick: doAdd })), addMsg,
      h('p', { class: 'hint', text: 'Le solde de départ est celui du compte avant la première transaction saisie. Coche « Épargne » pour les livrets, assurance-vie, PEA… ' }));
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
        h('div', { class: 'fields' }, txt('name', 'Nom'), h('label', { class: 'field' }, 'Catégorie de factures', cat), num('capital', 'Capital emprunté'), num('rate', 'Taux annuel (%)'), num('months', 'Durée (mois)', true), num('monthly', 'Mensualité'), num('interest', 'Total des intérêts'), num('paidBefore', 'Déjà remboursé avant le suivi')),
        h('div', { class: 'btnrow', style: 'margin-top:10px' }, calc, h('button', { class: 'btn small danger', type: 'button', text: 'Supprimer ce crédit', onclick: () => { cfg.loans.splice(i, 1); onChange(); } }))));
    });
    return h('div', null, cfg.loans.length ? list : h('p', { class: 'mut', text: 'Aucun crédit.' }),
      h('div', { class: 'btnrow', style: 'margin-top:8px' }, h('button', { class: 'btn', type: 'button', text: '+ Crédit', onclick: () => { cfg.loans.push({ id: uid(), name: 'Nouveau crédit', category: '', capital: 0, interest: 0, months: 0, rate: 0, monthly: 0, paidBefore: 0 }); onChange(); } })),
      h('p', { class: 'hint', text: 'Les remboursements comptés sont les factures saisies dans la catégorie choisie. Crée une catégorie dédiée (ex. « Crédit auto ») si besoin.' }));
  }

  function lookEditor(cfg, onChange) {
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Thème' }, ...[['system', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => h('button', { type: 'button', 'aria-pressed': String(cfg.theme === v), text: l, onclick: () => { cfg.theme = v; onChange(); } })));
    const sw = h('div', { class: 'swatches' }, ...ACCENTS.map(([n, c]) => h('button', { type: 'button', class: 'swatch', style: `background:${c}`, 'aria-label': n, title: n, 'aria-pressed': String(cfg.accent.toLowerCase() === c.toLowerCase()), onclick: () => { cfg.accent = c; onChange(); } })));
    const custom = h('input', { type: 'color', id: 'look-color', value: cfg.accent, 'aria-label': 'Couleur personnalisée', style: 'width:40px;height:32px;padding:0;border:1px solid var(--line);border-radius:8px;background:none' });
    custom.addEventListener('change', () => { cfg.accent = custom.value; onChange(); });
    sw.append(custom);
    return h('div', { class: 'fields' }, h('div', { class: 'field' }, 'Thème', seg), h('div', { class: 'field' }, 'Couleur principale', sw));
  }

  // ---------------------------------------------------------------- réglages
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (S && U.tab === 'reglages') renderSoon(); });
  window.addEventListener('appinstalled', () => { installEvt = null; renderSoon(); });

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
      sec('set-install', 'Installer sur cet appareil', 'L’app fonctionne hors ligne une fois installée.', install),
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
      for (const a of [from, to]) if (a !== 'Externe' && !accNames().includes(a)) { S.cfg.accounts.push({ id: uid(), name: a, start: 0, savings: false }); newAccs.add(a); }
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
    for (const t of ['apercu', 'transactions', 'previsionnel', 'epargne', 'reglages']) $('p-' + t).hidden = true;
    const p = $('p-onboarding'); p.hidden = false;
    if (!U.draft) U.draft = defaultCfg();
    const d = U.draft; applyLookDraft(d);
    const re = () => renderSoon();
    const steps = ['Bienvenue', 'Comptes', 'Catégories'];
    const stepsEl = h('div', { class: 'steps' }, ...steps.map((st, i) => h('span', { 'aria-current': i === U.onbStep ? 'step' : null, text: `${i + 1}. ${st}` })));
    let body;
    if (U.onbStep === 0) {
      body = h('div', { style: 'display:grid;gap:12px' },
        h('h1', { text: 'Ton budget, sur ton appareil.' }),
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
  }

  function init() {
    // contrôles statiques
    $('f-type').replaceChildren(...TYPES.map(t => opt(t)));
    $('ft').replaceChildren(opt('', 'Tous les types'), ...TYPES.map(t => opt(t)));
    $('period').addEventListener('change', () => { U.period = $('period').value; if (U.tab === 'transactions' && !U.editing) resetForm(); render(); });
    $('year').addEventListener('change', () => { U.year = +$('year').value; if (U.tab === 'transactions' && !U.editing) resetForm(); render(); });
    document.querySelectorAll('nav.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $('quickAdd').addEventListener('click', () => { showTab('transactions'); resetForm(); $('f-amount').focus(); });
    $('f-type').addEventListener('change', () => { refreshFormOptions(); applyDefaults(); });
    $('f-cat').addEventListener('change', () => applyDefaults(true));
    $('txf').addEventListener('submit', onSubmit);
    $('f-cancel').addEventListener('click', resetForm);
    for (const id of ['q', 'ft', 'fp']) $(id).addEventListener('input', renderList);
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
    let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (!S) return; if (U.tab === 'apercu') { drawMonths(); drawSplit(); } if (U.tab === 'epargne') drawEvo(); }, 120); }).observe(document.querySelector('.wrap'));
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => S && render());
    window.addEventListener('storage', (e) => { if (e.key === KEY) { S = load(); if (S) afterLoad(); render(); } });

    S = load();
    if (S) {
      afterLoad();
      const hash = location.hash.slice(1);
      if (['apercu', 'transactions', 'previsionnel', 'epargne', 'reglages'].includes(hash)) U.tab = hash;
      setStatus('Enregistré sur cet appareil');
    }
    render();
  }

  // Pour les tests et le débogage depuis la console.
  window.__budget = { get state() { return S; }, U };
  init();
})();
