# AERO Unity validation — 2026-09-26

## Executed in the development container

- `python tools/build_aero_campaign.py`: regenerated the six-stage reference campaign.
- `python tools/verify_unity_source.py`: PASS. Validates deterministic campaign content, all actor/weapon/environment/layout IDs, safe checkpoint floor coverage, hidden relic support, conservative main-route jump envelopes using the actual motor constants, Unity GUID references, JSON/assembly definitions, audio metadata and C# syntax.
- `git diff --check`: PASS.
- The 19 audio blob IDs match the existing remote repository tree. Binary audio was not changed. Local validation used metadata because this source checkout did not download binary audio; CI uses `--require-audio` and checks actual audio bytes.

| Stage | Enemies | Coins | Checkpoints | Cores |
|---|---:|---:|---:|---:|
| Jungle | 17 | 105 | 3 | 3 |
| Desert | 20 | 120 | 3 | 3 |
| Mountains | 22 | 135 | 3 | 3 |
| Ice | 25 | 140 | 3 | 3 |
| Volcano | 27 | 154 | 3 | 3 |
| Industrial | 30 | 168 | 3 | 3 |
| Total | 141 | 822 | 18 | 18 |

The jump check is a necessary geometric envelope check, not a simulated controller playthrough. C# parsing does not perform Unity type checking or import assets.

## Tests added/updated for the Unity Test Runner

EditMode:

- Six biomes, safe checkpoint placement and final VEXAR configuration.
- All six weapon slots and empty-energy fallback.
- Version 1 save migration preserving settings/unlocks while clearing records for replaced levels.
- Best-run preservation, file backup recovery, final-stage completion and invalid input bounds.
- Editable route prefabs round-trip every authored platform/hazard/item coordinate.
- Animator generation connects imported action clips and keeps Death terminal.

PlayMode:

- Boot every stage with 3D colliders, fixed side camera and a player on Z=0.
- High-speed projectile collision and no duplicate splash damage on the direct target.
- Laser piercing across separate targets and ice freeze.
- Solid walls block a piercing laser.
- Death resets the boss arena and respawns at the checkpoint.
- IRONHORN unlocks the final encounter; VEXAR must pass through all three forms before the exit opens.

## Not executed here

No Unity Editor/compiler/license is installed in this environment. Unity compilation, EditMode/PlayMode execution, visual inspection of imported FBX/Animator assets, platform builds and a human playthrough have **not** been performed. No claim of a successfully compiled executable or tested final artwork is made.

On the user's Windows machine, close the project in the Editor and run:

```powershell
.\tools\test_unity.ps1 -UnityEditor "E:\App\UnityTemp\Editor\Unity.exe"
```

Or open Test Runner and run both suites. Then verify the controller, moving platforms, ice grip, all bosses, pause/retry and weapon muzzle alignment in Play mode. After supplying Blender assets, check their materials, loop settings, orientation and clip timing. `AERO → Build Windows` validates and builds the Main scene.

The source-validation GitHub workflow needs no Unity license. It does not imply the engine tests ran. Saved settings retain the previous Unity product identifier and save filename so existing local saves remain discoverable.
