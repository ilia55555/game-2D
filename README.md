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

## Strict AI + collision contract

- **No autonomous soldier movement:** start in HOLD, no default follow, cover search or officer escort. Soldiers move only for explicitly issued player tasks. They do not physically push stationary units out of the way.
- **Fire discipline:** SF and DF start with free fire OFF. They shoot normally only after an explicit Fire, Attack or Clear command. Without it, an uncontrolled soldier fires solely at an unobstructed zombie within 64 world units as emergency self-defense and never chases it.
- **Solid hitboxes:** soldiers use a rotating 78×56 footprint including the rifle; infected use a torso-only rotating 46×52 footprint (64×68 for brutes), with reaching hands intentionally outside. Movement is swept in increments and blocked by walls, world edges, and ALL living actors. Hitbox debug overlay: **B**.
- **Controls:** Q/E held lean; Z grenade; X tactical smoke; R reload; F held formation wheel; V night vision/torch; C crouch (hold: prone). Key rebinding persists across reloads in `delta-bindings-tactical-v4`.

Keep these behaviors in their dedicated AI / PHYSICS / INPUT files, not bundled back into HTML.

## World generation (2026-11)

Levels are seeded asymmetric traversable masks on a 32-unit occupancy grid. Buildings, trees, shelves, and rocks mark exact blocked tiles. Different stages vary map dimensions, silhouette, road turns, cul-de-sacs, indoor structures, and entry/extraction points. Actor positions remain continuous. Press **N** to inspect blocked tiles. The generator and renderer are separate files; never embed gameplay in HTML. The grid is invisible: a cached continuous terrain renderer adds soft ground edges, a joined street network, ground wear, concrete details, irregular rocks and foliage. Each accepted map has at least three reachable mission buildings; buildings stay clear of the spawn area.

## Navigation physics

A floating-point actor travels independently of 32-unit tile centers. The planner first checks a direct line with a clearance buffer, uses A* on grid occupancy if obstructed, shortcuts the polyline, and accepts rounded quadratic corners only after collision sampling. Hitboxes still enforce collision every movement step. The clearance planner samples at 16 units while occupancy remains 32 units. 32-unit tiles are not movement steps; **stationary soldiers are never pushed by routing**.

## Friendly-fire discipline

No shot is spawned if it would cross an allied body. Moving allies also intercept bullets rather than taking damage. Only explicit attack/clear/search travel tasks permit a bounded lateral firing-lane step. HOLD, DEFEND and COVER never abandon their positions to find a shot. A new order cancels previous lane movement; free-fire permission is independent of movement and supports individual selection. Fire-lane AI, ray tests, and shot enforcement remain in separate JS/COMBAT/FRIENDLY-FIRE files.

## Strategy map & free command cursor

**Tab** opens a paused commander map. Clicking a passable point selects a destination; issuing an explicit command to SF, DF, both teams or selected soldiers applies it. Choosing a destination alone does not move soldiers. Middle-click holds a free-moving marker at mouse world coordinates (not the weapon ray), and release issues a squad movement order. Officer switching remains accessible from the pause menu. The map, CSS, and cursor input are independent modules.

## Playability validation

Before accepting a newly seeded irregular world, `JS/MAP/GENERATOR/map-validator.js` tests actual collision-cleared routes from spawn to extraction and **every mission building entry** using the same A* planner as soldiers. An unreachable topology is reseeded instead of trapping the squad. Run `node tests/map-navigation.cjs` to regression-test seeded worlds.


## Tactical overhaul

See [TACTICAL-UPDATE.md](TACTICAL-UPDATE.md) for current controls, changes, validation and art scope. Run:

```sh
node tests/smoke.cjs
node tests/ai-hitbox.cjs
node tests/map-navigation.cjs
node tests/tactical-regression.cjs
```

The effective projectile ranges are MP5 150 m, M4 300 m, M249 400 m and DMR 600 m at 8 world units/metre. Projectiles continue beyond the aim point and field of view until a swept collision, range expiry or the world boundary. Tracer visibility remains restricted by the squad's sight; seeing a tracer fade into darkness does not mean the physical bullet vanished. These are gameplay values, not a complete real-world ballistics simulation.


### Full character footprints

Collision footprints now rotate with the actors. Soldiers include the full weapon; infected reserve only their body core so their reaching arms can reach a soldier at contact. B shows green soldier / red infected footprints without revealing hidden enemies. Navigation clearance, doorway width, spawn spacing, formation spacing and cover allocation account for the larger footprints. Rotation is blocked if it would put the footprint inside a solid object or another character. Melee checks footprint contact, and projectile sweeps include the body-to-muzzle segment, preventing close enemies from becoming immune behind the muzzle. Greed chase speed is 86 world units/s; the brute is 65.

Run `node tests/footprint-contact.cjs` for contact, rotating collision, melee and near-muzzle regression coverage.


### Deployment clearance and individual character files

Maps now start from 2240×2080 world units, with a larger clear deployment apron. Soldiers deploy behind the commander, with wider formation gaps. Regression coverage checks 120 units of unobstructed movement in all four directions for squad sizes 5–12.

The sprite renderer trims transparent margins once, fits the opaque soldier image to its physical rectangle, and uses the same dimensions for collision, crouch/prone and leaning. Weapon-light dots and the controlled-officer ground circle are removed; beam illumination remains.

Separate PNG files can replace each character automatically under `ASSETS/CHARACTERS/INDIVIDUAL/`; see its README for filenames. Missing images use the existing sheet.
