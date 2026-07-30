# Terre — Observatoire des crises oubliées

Site de sensibilisation : un **globe 3D interactif** (Three.js) qui cartographie des
crises humanitaires et conflits souvent absents des médias. Ambiance « observatoire
spatial », ton sobre et factuel, données **sourcées** (ONU/OCHA, HCR, OIM, HRW,
Amnesty, B'Tselem…).

## Lancer

```bash
npm install
npm run dev      # serveur local (ouvre le navigateur)
npm run build    # build de production dans dist/
npm run preview  # prévisualise le build
```

## Architecture

```
index.html            Structure (intro, HUD, panneau, modale méthodo)
src/
  main.js             Orchestrateur : scène, caméra, contrôles, raycasting, focus
  intro.js            Écran d'ouverture + compteur animé
  background.js       Champ d'étoiles + lignes « constellation »
  globe.js            Globe de points (terres échantillonnées) + graticule + halo
  points.js           Marqueurs de crise pulsants (ping) + faisceaux
  panel.js            Rendu des fiches crise + page méthodologie
  coords.js           lat/lon -> position 3D (source unique, points ET marqueurs)
  data/crises.json    DONNÉES ÉDITORIALES (voir ci-dessous)
  styles/main.css     Design system
public/
  earth-spec.jpg      Masque terre/mer échantillonné pour semer les points
```

## Ajouter / éditer une crise

Tout se pilote depuis `src/data/crises.json`. Une entrée :

```jsonc
{
  "id": "identifiant-unique",
  "name": "Nom",
  "region": "Sous-région · Continent",
  "lat": 0.0, "lon": 0.0,           // géolocalise le marqueur
  "severity": "major" | "watch",    // rouge-orange | cyan
  "type": "Type de crise",
  "status": "complete" | "stub",    // stub = fiche « en cours de rédaction »
  "keyFigure": { "value": "≈ 7 M", "label": "…" },
  "context": ["paragraphe 1", "paragraphe 2"],   // si status=complete
  "timeline": [{ "year": "2024", "label": "…" }], // si status=complete
  "editorialNote": "…",             // optionnel (sujets sensibles)
  "sources": [{ "name": "OCHA", "url": "https://…" }],
  "moreUrl": "https://…"
}
```

- **`complete`** : RDC (Est) et Soudan sont entièrement rédigées et sourcées.
- **`stub`** : les 8 autres ont chiffre clé, coordonnées et sources ; le contexte
  détaillé reste à écrire (elles s'affichent avec une mention « fiche en cours »).

## Ligne éditoriale

- Distinguer **politiques/acteurs armés** vs **populations civiles** vs **religions**
  (vocabulaire soigné, notamment pour Palestine/Israël).
- **Sourcer systématiquement** et expliciter les incertitudes chiffrées.
- Éviter les simplifications (ex. ne pas réduire la RDC à « Rwanda contre Congo »).
- Page **Méthodologie & sources** intégrée (bouton dans le HUD) pour la transparence.

Les chiffres sont des **ordres de grandeur** d'agences humanitaires, pas des
décomptes exacts, et ne sont pas mis à jour en temps réel.
