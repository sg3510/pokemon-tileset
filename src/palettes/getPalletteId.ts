const CEMETERY = 15;
const CAVERN = 17;
const FIRST_INDOOR_MAP = 0x25;
const CERULEAN_CAVE_2F = 0xe2;
const CERULEAN_CAVE_1F = 0xe4;
const LORELEIS_ROOM = 0xf5;
const BRUNOS_ROOM = 0xf6;
const NUM_CITY_MAPS = 0x0b;
const TRADE_CENTER = 0xef;
const COLOSSEUM = 0xf0;

const PAL_ROUTE = 0x00;
const PAL_GRAYMON = 0x19;
const PAL_CAVE = 0x23;

// ----------------------------------------------------------------------------
// getPaletteId
//
// This function implements the same branching logic as the assembly routine:
//
//  1. If the tileset is CEMETERY, use PAL_GRAYMON.
//  2. Else if the tileset is CAVERN, use PAL_CAVE.
//  3. Otherwise, load the map ID and:
//
//      a. If mapId is less than FIRST_INDOOR_MAP (i.e. an outdoor map), use the map ID.
//      b. Else (for indoor maps):
//           • If mapId < CERULEAN_CAVE_2F, then normally use lastMap—but here we substitute with PAL_GRAYMON.
//           • Else if mapId < (CERULEAN_CAVE_1F + 1), then use PAL_CAVE.
//           • Else if mapId equals LORELEIS_ROOM, then use 0.
//           • Else if mapId equals BRUNOS_ROOM, then use PAL_CAVE.
//           • Else if mapId equals TRADE_CENTER or COLOSSEUM, then use PAL_GRAYMON.
//           • Otherwise, default to using mapId.
//  4. Then, if the chosen base value is not less than NUM_CITY_MAPS, set it to PAL_ROUTE.
//  5. Finally, the result is the base value plus 1 (since a town’s palette ID is its base value + 1).
//
// @param mapId - The current map ID.
// @param tilesetId - The current map’s tileset ID.
// @returns The palette ID to use.
export function getPaletteId(mapId: number, tilesetId: number): number {
  let base: number = mapId;

  // 1. Town/Route adjustment:
  // If the chosen base is not less than NUM_CITY_MAPS, then use PAL_ROUTE.
  if (base >= NUM_CITY_MAPS) {
    base = PAL_ROUTE - 1;
  }

  // 2. Special tileset cases:
  if (tilesetId === CEMETERY) {
    // Branch .PokemonTowerOrAgatha:
    // Use PAL_GRAYMON - 1 so that after the final increment we get PAL_GRAYMON.
    base = PAL_GRAYMON - 1;
  } else if (tilesetId === CAVERN) {
    // Branch .caveOrBruno:
    base = PAL_CAVE - 1;
  } else {
    // 3. Not a special tileset: use the map ID as a starting point.
    if (mapId < FIRST_INDOOR_MAP) {
      // Outdoor maps (towns/routes): use the mapId.
      base = mapId;
    } else {
      // Indoor maps:
      if (mapId < CERULEAN_CAVE_2F) {
        // .normalDungeonOrBuilding:
        // Normally, we would use wLastMap; instead, we substitute with PAL_GRAYMON.
        base = PAL_GRAYMON - 1;
      } else if (mapId < CERULEAN_CAVE_1F + 1) {
        // .caveOrBruno:
        base = PAL_CAVE - 1;
      } else if (mapId === LORELEIS_ROOM) {
        // .Lorelei:
        base = 0;
      } else if (mapId === BRUNOS_ROOM) {
        // .caveOrBruno:
        base = PAL_CAVE - 1;
      } else if (mapId === TRADE_CENTER || mapId === COLOSSEUM) {
        // .trade_center_colosseum:
        base = PAL_GRAYMON - 1;
      } else {
        // Default: use the map ID.
        base = mapId;
        if (base >= NUM_CITY_MAPS) {
          base = PAL_ROUTE - 1;
        }
      }
    }
  }
  if (mapId >= 0x0b && mapId <= 0x24) {
    base = PAL_ROUTE - 1;
  } 
  // 4. Final adjustment: increment base (a town's palette ID is its base value + 1)
  return base + 1;
}


