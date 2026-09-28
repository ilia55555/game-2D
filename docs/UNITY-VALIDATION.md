# AERO Unity validation — 2026-09-27

## Executed in the development container

- `python tools/build_aero_campaign.py`: regenerated six long routes (418–687 metres), with real valleys, climbs, mandatory bridge platforms and two occupied outposts per stage.
- `python tools/verify_unity_source.py`: PASS. Validates deterministic campaign content, all actor/weapon/environment/layout IDs, safe quiet checkpoints, connected upper relic routes, guard/territory references, main-route surface identity, per-stage fall/camera bounds, conservative jump envelopes including worst-case movement and landing margins using the actual motor constants, Unity GUID references, JSON/assembly definitions, audio metadata and C# syntax.
- `git diff --check`: PASS.
- The 19 audio blob IDs match the existing remote repository tree. Binary audio was not changed. Local validation used metadata because this source checkout did not download binary audio; CI uses `--require-audio` and checks actual audio bytes.

| Stage | Metres | Enemies | Coins | Checkpoints | Cores | Outposts |
|---|---:|---:|---:|---:|---:|---:|
| Jungle | 418 | 24 | 180 | 5 | 3 | 2 |
| Desert | 457.4 | 24 | 189 | 5 | 3 | 2 |
| Mountains | 496.8 | 24 | 209 | 5 | 3 | 2 |
| Ice | 536.2 | 24 | 217 | 5 | 3 | 2 |
| Volcano | 575.6 | 24 | 232 | 5 | 3 | 2 |
| Industrial | 687 | 31 | 270 | 5 | 3 | 2 |
| Total | 3171 | 151 | 1297 | 30 | 18 | 12 |

The jump check is a necessary geometric envelope check, not a simulated controller playthrough. All 29 C# files pass tree-sitter syntax parsing. Parsing does not perform Unity type checking or import assets.

## Tests added/updated for the Unity Test Runner

EditMode:

- Six biomes, safe checkpoint placement and final VEXAR configuration.
- All six weapon slots and empty-energy fallback.
- Version 1/2 save migration to version 3 preserving settings/unlocks while clearing records for replaced levels.
- Best-run preservation, file backup recovery, final-stage completion and invalid input bounds.
- Editable route prefabs round-trip every authored platform/hazard/item coordinate, enemy pressure and territory references.
- Mandatory vertical travel, quiet checkpoints and a steadily increasing boss difficulty profile.
- Exhaustive arena pattern constraints across all boss/landing panels and seeds: safe entrance/exit, nonadjacent danger and protected boss support.
- Animator generation connects imported action clips and keeps Death terminal.

PlayMode:

- Boot every stage with 3D colliders, fixed side camera and a player on Z=0.
- High-speed projectile collision and no duplicate splash damage on the direct target.
- Laser piercing across separate targets and ice freeze.
- Solid walls block a piercing laser.
- Death resets the boss arena and respawns at the checkpoint.
- Deep valley survival and vertical camera tracking; death still occurs below the stage-specific kill boundary.
- Ground warns harmlessly, waits for the actual slam impact, physically removes support, rescues a falling player and restores collision.
- Charge keeps ground intact; a rising escape ledge carries the player.
- Defeating the last territory operator cancels the warning and prevents another trap cycle.
- IRONHORN unlocks the final encounter; VEXAR must pass through all three forms before the exit opens.

## Not executed here

No Unity Editor/compiler/license is installed in this environment. Unity compilation, EditMode/PlayMode execution, visual inspection of imported FBX/Animator assets, platform builds and a human playthrough have **not** been performed. No claim of a successfully compiled executable or tested final artwork is made.

On the user's Windows machine, close the project in the Editor and run:

```powershell
.\tools\test_unity.ps1 -UnityEditor "E:\App\UnityTemp\Editor\Unity.exe"
```

Or open Test Runner and run both suites. Then play the entire route of each stage, including valleys, optional cores, every bridge, occupied outposts, moving platforms, ice grip, all bosses, pause/retry and weapon muzzle alignment in Play mode. After supplying Blender assets, check their materials, loop settings, orientation and clip timing. `AERO → Build Windows` validates and builds the Main scene.

The source-validation GitHub workflow needs no Unity license. It does not imply the engine tests ran. Saved settings retain the previous Unity product identifier and save filename so existing local saves remain discoverable.
