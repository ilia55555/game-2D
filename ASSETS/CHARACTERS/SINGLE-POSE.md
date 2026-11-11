# Single-pose overhead atlas

`tactical-overhead-single.png` replaces the old oblique sprites. It contains one east-facing, directly overhead pose per actor. Row 1: commander reference, deputy, SF, DF. Row 2: Greed-inspired, Rage-inspired, Pride-inspired, Envy-inspired skins. The approved commander continues to use its own east-facing crop from the separate commander sheet.

The renderer draws each pose whole and rotates smoothly. Direction and walking do not change the source rectangle; limbs are not sliced or stretched. Dark glossy coating/tendrils and droplets are part of the infected artwork. These are visual skins for the currently implemented enemies, not additional enemy mechanics.

Generated with built-in ImageGen from the approved commander sheet as a camera/style reference.
