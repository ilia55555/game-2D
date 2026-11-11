# Commander field artwork

Approved transparent 1448 x 1086 sheet. Only the commander uses this asset. The first two rows contain eight overhead directions; the lower row contains dialogue portrait artwork and is not sampled by the gameplay renderer.

`JS/PLAYER/APPEARANCE/commander-renderer.js` uses only the east-facing crop with explicit hat-pivot and muzzle coordinates, rotating it continuously. The muzzle is aligned to the existing weapon light. Other soldiers and zombies retain their current art. No directional frame swapping or movement warping is used; this is not a full walk-cycle sheet.
