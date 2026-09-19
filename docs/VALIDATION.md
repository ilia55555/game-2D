# Validation record

Engine: **Godot 4.5 stable**, official Linux x86_64 build `876b29033`.
Renderer used for visual inspection: **Compatibility / OpenGL**, Mesa llvmpipe.

## Final integration result

**132 checks; 0 failures.** No GDScript parse errors or runtime errors were reported by the final import/integration run.

The suite uses actual Godot physics and scene transitions. It covers:

- Title, world selection, settings, controls, pause and resume.
- Card preview bounds in the world selector.
- Grounding, variable jump input, double jump limits, landing, crouch hitbox restoration, dash and damage immunity.
- Damage cooldown, death and checkpoint recovery.
- High-speed projectile collision, thin-wall blocking, **point-blank hits when the muzzle starts inside a target**, energy fallback and relic collection.
- All five mandatory routes with ordinary player movement, jumps and shooting, without teleporting across route gaps.
- Every guardian's attack states, second phase, encounter reset after death and removal of arena barriers/projectiles.
- Every guardian defeated by actual player projectiles; exit portals, result screens, world unlocks and records.
- Save round-trip and safe rejection of malformed JSON, using a separate test save.
- All seven music streams present, longer than twenty seconds and configured to loop.

| World | Critical route physics ticks | Guardian combat physics ticks |
|---|---:|---:|
| Verdant Frontier | 950 | 569 |
| Brass Skyways | 1,041 | 1,172 |
| Prismatic Depths | 1,087 | 916 |
| Ember Engine | 1,166 | 956 |
| Eclipse Citadel | 1,263 | 1,199 |

These tick counts describe deterministic automated scenarios, not a promised player completion time. The route/combat bot uses damage immunity to isolate traversal and attack reachability. Separate checks exercise normal damage and death. This does **not** establish that the difficulty is balanced for a human player.

## Visual and resource checks

- Inspected rendered title screen, all five level starts, all five guardian arenas, world selection and settings at 1280×720.
- Corrected oversized world-card textures, fixed title wrapping and separated the guardian health bar from the weapon HUD.
- Increased the hero's authored texture resolution while preserving logical rig coordinates.
- Validated all 58 SVG files as XML.
- All seven OGG tracks decoded successfully. Peak amplitudes were about 0.50–0.53; no clipping or silent track was found.
- Exported the `Linux` resource pack and launched it with Godot headlessly.
- `git diff --check` passed.

The software graphics environment reports that it cannot control V-Sync. This is a display-driver limitation and did not prevent rendering.

## Repeat locally

```bash
GODOT_BIN=/path/to/godot bash tools/verify.sh

godot --headless --path . --export-pack Linux /tmp/velocity.pck
godot --headless --main-pack /tmp/velocity.pck --quit-after 120 -- --test
```

The GitHub workflow runs the same import, integration and resource-pack checks for `games`.

## Not verified here

- A native Windows executable or native macOS build.
- Physical gamepad behavior, real multitouch devices or every GPU/driver combination.
- Human difficulty/playtime assessment and exhaustive playtesting of every optional route.
- Zero-bug behavior on all systems. The automated suite and visual checks establish the cases above, not an absolute guarantee.
