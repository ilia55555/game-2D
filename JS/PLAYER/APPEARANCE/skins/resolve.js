'use strict';
function getSoldierPalette(unit) {
  if (unit.role === 'commander') return COMMANDER_PALETTE;
  if (unit.role === 'deputy') return DEPUTY_PALETTE;
  if (unit.group === 'alpha') return SF_PALETTE;
  return DF_PALETTE;
}
