# Unity migration validation

Source baseline: `games` at `0ada12bde98aa8315eef7d629d7afd20d1ed4c2e`.

## Executed in the authoring environment

- Re-exported all five stage layouts and compared the complete resulting JSON with the committed campaign data.
- Verified three checkpoints and three relics per stage; all checkpoint respawn X positions lie on their authored floor.
- Verified 118 authored enemies and 359 gems across the campaign.
- Parsed 18 C# files with tree-sitter-c-sharp: no syntax error nodes.
- Validated JSON/assembly definitions, unique metadata GUIDs and serialized script/catalog references.
- Confirmed the 19 audio file mappings point at the existing repository blobs. Audio files are reused byte for byte.

These are **source checks only**. Unity Editor, C# type checking against Unity assemblies, package resolution, shader import, scene import, actual rendering, PlayMode tests and executable builds were **not run** here. The environment has no Unity installation or licence. No executable artifact is claimed.

## Tests supplied for execution in Unity

Open `Window > General > Test Runner` and run both suites:

- EditMode: five-stage data, checkpoint safety, coordinate conversion, save persistence, best-score retention, corrupt-primary recovery, invalid-version rejection.
- PlayMode: all five stages boot using 3D physics; player stays on Z=0; camera faces the fixed side plane; high-speed projectile hits; Nova does not damage the primary target twice; boss retry resets encounter and returns to checkpoint; stage completion requires the boss gate.

PlayMode tests use an in-memory SaveStore and must not modify real player progress.

CLI (substitute the real editor executable):

```bash
UNITY_EDITOR=/absolute/path/to/Unity
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$PWD/Unity" -runTests -testPlatform EditMode -testResults "$PWD/editmode.xml" -logFile "$PWD/editmode.log"
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$PWD/Unity" -runTests -testPlatform PlayMode -testResults "$PWD/playmode.xml" -logFile "$PWD/playmode.log"
```

Build only after both suites and manual checks pass:

```bash
"$UNITY_EDITOR" -batchmode -quit -projectPath "$PWD/Unity" -executeMethod Velocity.Editor.ProjectSetup.BuildWindows -logFile "$PWD/build.log"
```

The Windows/Linux module must be installed and Unity activated. No CI workflow has been advertised as passing or configured with someone else's licence.

## Manual acceptance still required

1. Import the exact editor version and packages. Console must contain no compile errors or missing references.
2. Complete each stage normally, including the upper relic route, double jump, dash, crouch under a ceiling, moving and one-way platforms, crumble restore, springs, lasers and spikes.
3. Fight all five bosses through phase two. Check warning visibility, ground-slam landing, shield timing and restart mid-attack.
4. Test collision at low and high frame rates: narrow platforms, fast shots, point-blank shots and muzzle next to a wall.
5. Confirm menu, pause, audio levels, touch controls, keyboard and a physical gamepad. Menus currently use mouse/touch rather than controller navigation.
6. Complete a stage, quit/relaunch, confirm unlocked stages and records; test a read-only save destination and recovery message.
7. Import the user's real 3D models, textures, Animator Controllers and clips. Check scale, two facing directions, Muzzle position, colliders and every animation state.
8. Build and run a standalone player to check shader inclusion and audio packaging.

## Outstanding content and intentional differences

- No user-created FBX/GLB/Blend/OBJ assets were present on the inspected `games` tree. Current characters and scenery are temporary 3D primitives, not finished art.
- Stage layout and encounters were ported from the existing authored data; their feel and difficulty in Unity physics need a human playthrough.
- Imported meshes are visual children; runtime-generated authored slabs remain collision geometry. Full custom environment collision authoring is separate work after the actual models arrive.
- Runtime-generated stages are not five independently baked editable Unity scenes.
- Boss recovery is always a shield state. The slam cannot end before landing.
- UI is functional IMGUI, not a final art pass; music uses direct track switching rather than the former crossfade.
- Godot saves are not automatically converted.
