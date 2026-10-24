# Neon Comet

Shooter arcade 2D, HTML5 Canvas, zero dependențe. PWA instalabilă, merge 100% offline după prima încărcare.

## Deploy pe Cloudflare Pages (din GitHub, fără build)

1. Creează un repo nou pe GitHub (ex. `neon-comet`) și urcă toate fișierele din acest folder în root.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → alege repo-ul.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(gol)*
   - Build output directory: `/`
4. Save and Deploy. Primești `neon-comet.pages.dev`.
5. Opțional: Custom domains → ex. `play.hulius.website`.

## Update

Modifici `index.html`, schimbi `VERSION` în `sw.js` (ex. `neon-comet-v2`), commit + push. Cloudflare redeployează automat, jucătorii primesc versiunea nouă la următoarea pornire.

## Structură

- `index.html`: jocul complet
- `manifest.webmanifest`: date pentru instalare (nume, iconițe, fullscreen)
- `sw.js`: service worker, cache offline
- `_headers`: cache headers pentru Cloudflare Pages
- `fonts/`: fonturi locale (Chakra Petch, JetBrains Mono, cu diacritice)
- `icons/`: iconițe app (inclusiv maskable pentru Android)

## Test local

Service worker-ul nu merge pe `file://`. Rulează un server local:

```
python -m http.server 8080
```

și deschide `http://localhost:8080`.
