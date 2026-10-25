# Fonts used by Neon Comet 3.1

All fonts are bundled locally (woff2) so the game works offline. All are licensed under the
**SIL Open Font License 1.1** (full texts next to this file). OFL allows bundling and embedding in a free
or commercial game; the fonts must not be sold on their own, and the license text plus copyright notice
travel with them (done: OFL-*.txt). CSS exposes them under our own aliases (`NCUI`, `NCPixel`, `NCBody`),
the font files themselves are unmodified (Oxanium) or plain subsets (Silkscreen, Micro 5).

| File | Font | Author / Copyright | License | Source |
|---|---|---|---|---|
| Oxanium-400/600/700/800.woff2 (latin subset) | Oxanium | Copyright 2019 The Oxanium Project Authors (https://github.com/sevmeyer/oxanium) | OFL 1.1 (OFL-Oxanium.txt) | npm `@fontsource/oxanium` 5.3.0 (files/oxanium-latin-*-normal.woff2), from google/fonts |
| Silkscreen-Regular.woff2, Silkscreen-Bold.woff2 | Silkscreen | Copyright 2001 The Silkscreen Project Authors (Jason Kottke) | OFL 1.1 (OFL-Silkscreen.txt) | https://github.com/google/fonts/tree/main/ofl/silkscreen |
| Micro5-Regular.woff2 (no longer used for text in 3.1, kept for old caches) | Micro 5 | Copyright 2023 The Soft Type Project Authors (Sarah Cadigan-Fried) | OFL 1.1 (OFL-Micro5.txt) | https://github.com/google/fonts/tree/main/ofl/micro5 |

## Usage (3.1)
- `NCUI` (Oxanium 400/600/700/800) = every UI text. Font stack: `'NCUI', system-ui, sans-serif`.
- `NCPixel` (Silkscreen Bold) = only the logo-like pixel titles (`.pix-title`, "SECTOR N"). Crisp at 8/16/24... px.
- `NCBody` = legacy alias of Oxanium (old 3.0 rules/canvas code that still says NCBody stay readable).

Oxanium latin subset covers Basic Latin + Latin-1 + common punctuation (· … × – —). Symbols like ◆ ✓ fall back to system-ui.
