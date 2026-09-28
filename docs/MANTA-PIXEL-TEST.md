# Admiral Manta pixel-art test

Open `tests/manta_preview.tscn` in Godot 4.5+ and press **F6** to fight the second boss immediately. This scene disables progress writes for the session. Normal F5 play uses the same new art in world 2.

Only Admiral Manta's presentation and world-selection portrait change. Existing health, hitbox, attack timing, projectiles and movement remain unchanged.

The transparent PNG uses a 4-column, 2-row sheet: four hovering frames (8 fps), anticipation, dash, fire and recovery. Nearest filtering is applied only to this boss. This is an AI-generated pixel-style test atlas, not hand-painted production animation; frame alignment and feel should be evaluated in play.

Asset: `assets/art/bosses/manta_pixel.png`. Created with the built-in image generator. Prompt: simple brass-and-teal mechanical manta, expressive eyes, 1990s cartoon pixel-art platformer style, transparent 4x2 sprite sheet, four flap frames and four combat poses, same centered character, no text or decorations.

The original SVG remains available as source/reference. The smoke suite checks atlas loading, alpha, state-to-frame selection and both facing directions in addition to its existing five-world combat tests.
