# Fonts used by Neon Comet 3.0

All fonts are bundled locally (woff2, subset to Basic Latin + Latin-1) so the game works offline.
Both are licensed under the **SIL Open Font License 1.1** (full texts next to this file). OFL allows bundling,
embedding and subsetting in a commercial or free game; the fonts must not be sold on their own, and the
license text plus copyright notice travel with them (done: OFL-*.txt). Reserved Font Names are not used
for modified versions: the subset files keep their original family names internally, and CSS exposes
them under our own aliases `NCPixel` / `NCBody`.

| File | Font | Author / Copyright | License | Source |
|---|---|---|---|---|
| Silkscreen-Regular.woff2, Silkscreen-Bold.woff2 | Silkscreen | Copyright 2001 The Silkscreen Project Authors (Jason Kottke) | OFL 1.1 (OFL-Silkscreen.txt) | https://github.com/google/fonts/tree/main/ofl/silkscreen |
| Micro5-Regular.woff2 | Micro 5 | Copyright 2023 The Soft Type Project Authors (Sarah Cadigan-Fried) | OFL 1.1 (OFL-Micro5.txt) | https://github.com/google/fonts/tree/main/ofl/micro5 |

Verified 2026-10-24 from the OFL.txt and METADATA.pb files in the google/fonts repository.

## Pixel grid (keep text crisp)
- Silkscreen: 1 font pixel = 125/1000 em, so crisp at font-size 8, 16, 24... CSS px. The UI uses `font-size: calc(8 * var(--u))`.
- Micro 5: 1 font pixel = 150/1650 em (em = 11 px), crisp at font-size 11, 22, 33... The UI uses `calc(11 * var(--u))`.
`--u` is an integer number of CSS px per UI pixel computed in js/ui/app.js.

Subsetting command (fonttools): `pyftsubset <ttf> --unicodes="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2022,U+2026,U+00D7" --flavor=woff2`.
