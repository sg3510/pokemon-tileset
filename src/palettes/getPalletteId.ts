import {
  PAL_ROUTE,
  PAL_GRAYMON,
  PAL_CAVE,
  PAL_INDIGO,
  PAL_VERMILION,
  PAL_CELADON,
  PAL_SAFFRON,
  PAL_CERULEAN,
  PAL_CINNABAR,
  PAL_LAVENDER,
  PAL_FUCHSIA,
  PAL_PALLET,
  PAL_VIRIDIAN,
  PAL_PEWTER,
} from "./palettes";

const CEMETERY = 15;
const CAVERN = 17;
const FIRST_INDOOR_MAP = 0x25;
const CERULEAN_CAVE_2F = 0xe2;
const CERULEAN_CAVE_1F = 0xe4;
const LORELEIS_ROOM = 0xf5;
const LANCES_ROOM = 0x69; //Map ID: 105 or in hex 0x69

const BRUNOS_ROOM = 0xf6;
const NUM_CITY_MAPS = 0x0b;
const TRADE_CENTER = 0xef;
const COLOSSEUM = 0xf0;

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
//  5. Finally, the result is the base value plus 1 (since a town's palette ID is its base value + 1).
//
// @param mapId - The current map ID.
// @param tilesetId - The current map's tileset ID.
// @returns The palette ID to use.
export function getPaletteId(mapId: number, tilesetId: number): number {
  let base: number = mapId;
  // VIRIDIAN_FOREST (map id 51) uses palette 2
  if (mapId === 51) {
    return 2;
  }

  // Special case for Lance's Room
  if (mapId === LANCES_ROOM) {
    return PAL_INDIGO;
  }

  //0x59 to 0x68 are PAL_VERMILION
  if (mapId >= 0x59 && mapId <= 0x68) {
    return PAL_VERMILION;
  }
  //VERMILION_CITY extras
  if (mapId === 0xa3 || mapId === 0xc4) {
    return PAL_VERMILION;
  }
  //0x7A to 0x8C is CELADON_CITY as well as 0xC7 to 0xCF
  if ((mapId >= 0x7a && mapId <= 0x8c) || (mapId >= 0xc7 && mapId <= 0xcf)) {
    return PAL_CELADON;
  }
  //0xAF to 0xB7 are SAFFRON_CITY
  if (mapId >= 0xaf && mapId <= 0xb7) {
    return PAL_SAFFRON;
  }
  //0x3E to 0x43 is CERULEAN_CITY
  if (mapId >= 0x3e && mapId <= 0x43) {
    return PAL_CERULEAN;
  }
  //CERULEAN_CITY extras
  if (mapId == 0x45) {
    return PAL_CERULEAN;
  }
  //INDIGO_PLATEAU_LOBBY
  if (mapId === 0xae) {
    return PAL_INDIGO;
  }
  // 0xA5 to 0xAD are CINNABAR_ISLAND
  if (mapId >= 0xa5 && mapId <= 0xad) {
    return PAL_CINNABAR;
  }
  //POKEMON MANSION
  if (mapId === 0x9f || mapId === 0xd6 || mapId === 0xd7 || mapId === 0xd8) {
    return PAL_CINNABAR;
  }

  // 0x8D - 0x97 are LAVENDER_TOWN
  if ((mapId >= 0x95 && mapId <= 0x97) || mapId == 0x8d) {
    return PAL_LAVENDER;
  }
  // 0x98 - 0x9E, 0xA4 are FUCHSIA_CITY
  if ((mapId >= 0x98 && mapId <= 0x9e) || mapId === 0xa4) {
    return PAL_FUCHSIA;
  }
  //0x25 to 0x28 are PALLET_TOWN
  if (mapId >= 0x25 && mapId <= 0x28) {
    return PAL_PALLET;
  }
  //0x29 to 0x2D are VIRIDIAN_CITY
  if (mapId >= 0x29 && mapId <= 0x2d) {
    return PAL_VIRIDIAN;
  }
  //0x34 to 0x3A are PEWTER_CITY
  if (mapId >= 0x34 && mapId <= 0x3a) {
    return PAL_PEWTER;
  }

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
