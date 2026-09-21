# Projectile sprite sheets

Drop the transparent 4x4 / 16-frame PNG files in this folder.

Canonical names:

- `player_pulse_16.png`
- `player_scatter_16.png`
- `player_nova_16.png`
- `enemy_bolt_16.png`
- `boss_bolt_16.png`

Frame contract for every projectile sheet:

- 0..3 — muzzle flash
- 4..7 — travel loop
- 8..11 — impact on actor
- 12..15 — wall impact / explosion

All artwork is authored facing right. Runtime rotation follows the projectile velocity, so one sheet works in every 2D direction. Keep all 16 cells the same size and preserve transparent RGBA background.
