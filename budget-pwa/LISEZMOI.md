# Budget, app installable

Suivi de budget personnel : comptes, transactions, prévisionnel, épargne et crédits.
Elle fonctionne hors ligne et les données restent dans le navigateur de chaque appareil. Aucun serveur, aucun compte.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | La page de l'app |
| `app.js` | Toute la logique |
| `styles.css` | L'apparence (thème clair et sombre) |
| `manifest.webmanifest` | Nom, icônes et couleurs pour l'installation |
| `sw.js` | Fonctionnement hors ligne (service worker) |
| `icons/` | Icônes de l'app |

## Mettre l'app en ligne (une fois)

L'installation et le mode hors ligne ont besoin d'une adresse en `https://`. Ouvrir `index.html` en double-cliquant marche pour tester, mais l'app ne pourra pas s'installer.

**Option 1 : GitHub Pages (gratuit)**
1. Crée un compte sur github.com, puis un nouveau dépôt public (par exemple `budget`).
2. « Add file » → « Upload files » : dépose tout le contenu du dossier (avec le dossier `icons`), puis « Commit ».
3. Settings → Pages → Source : « Deploy from a branch », branche `main`, dossier `/ (root)` → Save.
4. Une à deux minutes plus tard, l'app est disponible à `https://<ton-pseudo>.github.io/budget/`.

**Option 2 : Netlify Drop (gratuit, sans compte au départ)**
Va sur app.netlify.com/drop et glisse le dossier entier. Tu obtiens une adresse en `https://` tout de suite.

## Installer l'app

- **iPhone / iPad** : ouvre l'adresse dans Safari → bouton Partager → « Sur l'écran d'accueil ».
- **Android** : ouvre l'adresse dans Chrome → menu ⋮ → « Installer l'application ».
- **Ordinateur** : dans Chrome ou Edge, clique sur l'icône d'installation à droite de la barre d'adresse.

## Tes données

- Elles sont enregistrées dans le navigateur de l'appareil, jamais envoyées ailleurs. Chaque appareil a donc ses propres données.
- **Réglages → Données & sauvegardes** : exporte une sauvegarde `.json` régulièrement. C'est aussi ce qui permet de passer d'un appareil à l'autre (exporter ici, « Restaurer une sauvegarde » là-bas).
- Vider les données du site dans le navigateur efface le budget : garde toujours une sauvegarde récente.
- Import CSV : colonnes `Date ; Montant ; Type ; Catégorie ; Depuis ; Vers ; Description ; Pointée` (séparateur `;` ou `,`). Les colonnes Date et Montant suffisent ; les catégories et comptes inconnus sont créés.

## Publier une mise à jour

Après avoir modifié un fichier, change la valeur `VERSION` en haut de `sw.js` (par exemple `budget-v1.0.1`) puis remets les fichiers en ligne. Les appareils récupèrent la nouvelle version à l'ouverture suivante.

## Partager l'app

Partage simplement l'adresse : chaque personne démarre avec un budget vierge (ou les données d'exemple) et ne voit jamais les données des autres.

## Nouveautés v1.1

- **Opérations récurrentes** (onglet Transactions) : définis tes factures, salaire et virements une fois, puis reporte-les chaque mois en un clic. L'app propose aussi celles qu'elle repère dans ton historique, et peut les reporter automatiquement au début du mois.
- **Onglet Crédits** : avancement, coût du crédit, reste dû au fil du temps avec projection, tableau d'amortissement.
- **Aperçu enrichi** : alertes, évolution par rapport au mois précédent, rythme des dépenses (reste par jour), répartition des revenus, patrimoine, plus grosses dépenses.
- **Épargne** : taux d'épargne mois par mois.
- **Réglages** : jour de début du mois saisissable, tous les formats de nombres et toutes les devises avec un aperçu.
- **Thème sombre** en noir et gris neutres.
