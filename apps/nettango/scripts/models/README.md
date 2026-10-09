# Model widget pipeline

Restyles a NetTango player's NetLogo widgets to NetLogo 7 sizes and the Models Library
layout (PER-85). Run from `apps/nettango`. The project JSON (`.ntjson`) is the source;
the player `.html` is regenerated from it.

| Script                                                    | Does                                                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `extract.mjs PLAYER.html [OUT.ntjson]`                    | Writes the project JSON embedded in a player (either tag id), without `storageId`.                    |
| `convert.mjs MODEL.ntjson`                                | Legacy `.nlogo` code only: converts it to NetLogo 7.0.4 `.nlogox` in place.                           |
| `reflow.mjs MODEL.ntjson`                                 | Applies the left-column template in place; prints the before and after extent, warnings and overlaps. |
| `make-player.mjs MODEL.ntjson [OUT.html] [TEMPLATE.html]` | Writes the player from the template (default `fire.html`) with a fresh `storageId`.                   |
| `check.mjs ID... \| --all`                                | Lints the `.ntjson` and `.html` of each model; exits 1 on any problem.                                |

## One model

```sh
M=public/assets/models/wolves-and-sheep
node scripts/models/extract.mjs $M.html   # only if there is no local .ntjson yet
node scripts/models/convert.mjs $M.ntjson # no-op for .nlogox code
node scripts/models/reflow.mjs $M.ntjson
node scripts/models/make-player.mjs $M.ntjson
node scripts/models/check.mjs wolves-and-sheep
```

Then make the `app/data/models.json` entry local so `yarn models:sync` keeps it: set
`project` to `/assets/models/<id>.ntjson`, drop `source` and `editor` (the Builder link is
then derived from the local project), and re-measure `frameHeight` in the browser
(`document.documentElement.scrollHeight` of the player at the model page width).

## All models

```sh
node scripts/models/check.mjs --all
```

`--all` reads the ids from `app/data/models.json`. Models flagged `fit` or `view: patch
size` need a hand layout; `reflow.mjs` warns about the same two cases.

## Template

Left column from x=5, y=10, rows 5 px apart: settings that sit above the first button in
the original, the buttons (95x40, three per row), the remaining settings (sliders 220x50,
choosers and inputs 220x60, switches 115x40 two per row), monitors (100x60, three per
row), plots (340x235), outputs, notes. The view goes 10 px right of the column at
`(max - min + 1) * patchSize + 4`. Widths are minimums; a wider original keeps its width.

## Legacy conversion

`convert.mjs` runs `ConvertLegacy.java`, a Java port of the 7.0.4 step of
`NetLogo/Auto-Converter`, with the Java runtime bundled in NetLogo 7.0.4 (it includes
`jdk.compiler`, so the single-file source launcher works). Needs NetLogo 7.0.4 installed;
override the paths with `NETLOGO_HOME` and `JAVA`.
