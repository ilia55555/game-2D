# DELTA SIX — Tactical Zombie

Branch: `tactical-zombie`. The existing `Ilia` branch is untouched.

## Run

Serve the repository over HTTP (for example `python -m http.server 8000`) and open `http://localhost:8000/HTML/`. The root `index.html` is a lightweight redirect to `HTML/index.html`. No packages or external runtime dependencies.

## Structure

```text
index.html                  # launcher only
HTML/index.html             # HTML DOM skeleton and ordered file manifest
CSS/CORE                    # shared baseline
CSS/UI                      # panels, HUD, responsive, operations
CSS/PLAYER                  # separate SF / DF / commander / deputy styles
JS/CORE                     # runtime state, startup, lifecycle, game loops
JS/PLAYER                   # manual controls, drawing, animations, skins, movement, abilities
JS/TEAM                     # officers, formations and squad relationships
JS/AI/SOLDIERS              # allied AI, cover, path traffic and tactical tasks
JS/ZOMBIES/WALKER           # walker spawn, sight, navigation, walking, AI
JS/ZOMBIES/BRUTE            # special zombie visual variation
JS/COMMANDS                 # orders, wheels, formations and scoped commands
JS/COMBAT                   # weapon firing, reload, impacts and damage
JS/VISION                   # visibility, fog, flashlight and raycasts
JS/MAP                      # map generation, collision, geometry and navigation
JS/ZONES                    # green / yellow / red / black danger levels
JS/EXTRACTION               # blue extraction, helicopter and evacuation
JS/RENDER                   # canvas drawing and overlays
JS/INPUT                    # keyboard, pointer, zoom and camera
JS/UI                       # DOM/menu wiring and roster
JS/AUDIO                    # audio subsystem files go here
ASSETS/ZOMBIES/WALKER       # imported sprite sheet
SOUNDS/WEAPONS              # future gunfire audio
SOUNDS/ZOMBIES              # future enemy audio
SOUNDS/UI                   # future interface audio
SOUNDS/AMBIENCE             # future environment audio
```

## Mandatory architecture rules

1. **One mechanic, one responsibility.** Each input, AI decision, animation, movement routine, attack pattern, navigation system, renderer, and UI component must have its own focused JS/CSS file. Do not build generic 5,000-line files.
2. **Separate zombie types.** Each actual zombie model must have independent files/folders for its behavior and graphics. Seven zombie models require seven sets of files, not one 5,000-line AI. ~700 lines in a file is a reason to refactor further, not a desired size. Share only reusable low-level math, navigation or collision helpers.
3. **Separate teams and officers.** SF, DF, commander and deputy have different appearance files; Canvas soldier colors are controlled in dedicated JS skin modules, with roster CSS in separate files.
4. **HTML is only a skeleton.** No gameplay logic, inline style or base64 assets in HTML. Keep JS under `JS`, CSS under `CSS`, graphics under `ASSETS`, and audio under `SOUNDS`.
5. **Preserve mechanics.** SF enters and clears; DF defends and supports; the commanding officer and deputy operate over both; there are four danger zones green → yellow → red → black, and blue is exclusively extraction (not a fifth danger level).
6. **Protect branch boundaries.** This code must be developed on `tactical-zombie` only unless the user directs otherwise. Do not merge into `Ilia` automatically.
7. **Test each mechanic.** Before committing, verify JavaScript parses, referenced assets load, the game starts, controls react, zombie AI updates, and squads/command wheels operate.
8. **Keep expansion independent.** New sound models, maps and actors must be grouped by subtype under their parent asset/logic directories rather than appended to a giant catch-all file.

## Migration note

The uploaded single-file game had multiple historical override layers. This first migration preserves the **original evaluation order** in ordered `defer` scripts listed inside `HTML/index.html` so gameplay does not break. These legacy overrides and shared globals are temporary compatibility infrastructure. When modifying a subsystem, consolidate its layers behind a small documented API, eliminate obsolete overrides, and cover its behavior with tests rather than adding more overrides. This is an intermediate modularization, not complete code isolation.

No additional sound files or unimplemented zombie types have been generated.

## Play online with GitHub Pages

This site is static HTML/CSS/JS. The root `index.html` opens `HTML/index.html`, whose resources use relative paths, so it can be served from a GitHub Pages project URL without a build step. The root `.nojekyll` file prevents Jekyll processing.

**One-time repository setup (requires repository admin access):**

1. Open [Settings → Pages](https://github.com/ilia55555/game-2D/settings/pages).
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch `tactical-zombie` and directory `/(root)`, then press **Save**.
4. When GitHub reports successful publication, open **https://ilia55555.github.io/game-2D/** (or the actual URL shown under Pages settings).

**Important:** The repository is currently **private**. GitHub Pages for a private repository requires GitHub Pro/Team/Enterprise (according to GitHub's plan rules). On GitHub Free, a public repository is required. Do **not** change repository visibility without owner approval. Even when source repository is private, a GitHub Pages website is typically publicly accessible. A repository has only one Pages website; selecting this branch could replace a previously configured Pages source.

Changes to `Ilia` are not needed. The `tactical-zombie` branch is the only intended publishing source.
