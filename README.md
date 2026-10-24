# Neon Comet

Shooter arcade 2D în browser, HTML5 Canvas, zero dependențe. PWA instalabilă, merge 100% offline.

## Structură

- `index.html`: ecrane și HUD
- `css/style.css`: stiluri
- `js/data.js`: date (nave, turele, companioni, echipament, cufere, inamici, boși, realizări)
- `js/core.js`: salvare (v3, cu migrare din v2 și backup), audio + muzică procedurală, input (PC / touch / controller)
- `js/game.js`: motorul jocului și randarea
- `js/ui.js`: meniuri, Hangar, cufere, setări, navigare cu controller-ul
- `sw.js`: service worker (offline)
- `_headers`: cache headers pentru Cloudflare Pages

## Deploy

Cloudflare Pages conectat la acest repo: preset None, fără build, output `/`. Orice push pe `main` face deploy automat.

## Release

Schimbă `VERSION` în `sw.js` (ex. `neon-comet-v4`), commit, push. Progresul jucătorilor e în localStorage și nu e atins de update-uri.

## Test local

```
python -m http.server 8080
```

Deschide `http://localhost:8080`. Hook-uri de test: `NC.game.debug` în consolă.
