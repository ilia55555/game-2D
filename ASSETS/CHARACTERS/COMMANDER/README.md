# Commander field artwork

Approved transparent 1448 x 1086 sheet. Only the commander uses this asset. The first two rows contain eight overhead directions; the lower row contains dialogue portrait artwork and is not sampled by the gameplay renderer.

`JS/PLAYER/APPEARANCE/commander-renderer.js` defines explicit crop, hat-pivot and muzzle coordinates. The muzzle is aligned to the existing weapon light. Other soldiers and zombies retain their current art. Movement uses a subtle whole-pose sway; this is not a full walk-cycle sheet.
