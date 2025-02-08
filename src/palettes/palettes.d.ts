// RGB color values in 0-31 range (for SGB/CGB) or 0-255 range (for canvas)
export interface RGB {
    r: number;
    g: number;
    b: number;
  }
  
  // A palette entry containing both SGB and CGB colors
  export interface PaletteEntry {
    index: number;
    sgb: RGB[];  // Colors in 0-31 range
    cgb: RGB[];  // Colors in 0-31 range
  }
  
  // Constants for palette IDs
  export const enum PaletteIds {
    PAL_ROUTE = 0x00,
    PAL_GRAYMON = 0x19,
    PAL_CAVE = 0x23
  }
  
  // Constants for map/tileset IDs
  export const enum MapIds {
    CEMETERY = 15,
    CAVERN = 17,
    FIRST_INDOOR_MAP = 0x25,
    CERULEAN_CAVE_2F = 0xE2,
    CERULEAN_CAVE_1F = 0xE4,
    LORELEIS_ROOM = 0xF5,
    BRUNOS_ROOM = 0xF6,
    NUM_CITY_MAPS = 0x0B,
    TRADE_CENTER = 0xEF,
    COLOSSEUM = 0xF0
  }
  
  // Function signatures
  export interface PaletteModule {
    getPaletteId: (mapId: number, tilesetId: number) => number;
    palettes: PaletteEntry[];
    useRecoloredTileset: (
      originalTileset: HTMLImageElement | undefined,
      palette: Pick<PaletteEntry, 'sgb' | 'cgb'>,
      originalColors?: string[]
    ) => HTMLCanvasElement | null;
  }