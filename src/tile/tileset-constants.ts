// this is based on the file data/tilesets/tileset_headers.asm
export enum TileAnimation {
  NONE = 0,
  WATER = 1,
  WATER_FLOWER = 2,
}

export interface Tileset {
  tileset_name: string;
  tileset_id: number;
  counter_tiles: [number | null, number | null, number | null];
  grass_tile: number | null;
  animation: TileAnimation;
}

export const TILESETS: Tileset[] = [
  {
    tileset_name: 'OVERWORLD',
    tileset_id: 0x00,
    counter_tiles: [null, null, null],
    grass_tile: 0x52,
    animation: TileAnimation.WATER_FLOWER,
  },
  {
    tileset_name: 'REDS_HOUSE_1',
    tileset_id: 0x01,
    counter_tiles: [null, null, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'MART',
    tileset_id: 0x02,
    counter_tiles: [0x18, 0x19, 0x1E],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'FOREST',
    tileset_id: 0x03,
    counter_tiles: [null, null, null],
    grass_tile: 0x20,
    animation: TileAnimation.WATER,
  },
  {
    tileset_name: 'REDS_HOUSE_2',
    tileset_id: 0x04,
    counter_tiles: [null, null, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'DOJO',
    tileset_id: 0x05,
    counter_tiles: [0x3A, null, null],
    grass_tile: null,
    animation: TileAnimation.WATER_FLOWER,
  },
  {
    tileset_name: 'POKECENTER',
    tileset_id: 0x06,
    counter_tiles: [0x18, 0x19, 0x1E],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'GYM',
    tileset_id: 0x07,
    counter_tiles: [0x3A, null, null],
    grass_tile: null,
    animation: TileAnimation.WATER_FLOWER,
  },
  {
    tileset_name: 'HOUSE',
    tileset_id: 0x08,
    counter_tiles: [null, null, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'FOREST_GATE',
    tileset_id: 0x09,
    counter_tiles: [0x17, 0x32, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'MUSEUM',
    tileset_id: 0x0A,
    counter_tiles: [0x17, 0x32, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'UNDERGROUND',
    tileset_id: 0x0B,
    counter_tiles: [null, null, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'GATE',
    tileset_id: 0x0C,
    counter_tiles: [0x17, 0x32, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'SHIP',
    tileset_id: 0x0D,
    counter_tiles: [null, null, null],
    grass_tile: null,
    animation: TileAnimation.WATER,
  },
  {
    tileset_name: 'SHIP_PORT',
    tileset_id: 0x0E,
    counter_tiles: [null, null, null],
    grass_tile: null,
    animation: TileAnimation.WATER,
  },
  {
    tileset_name: 'CEMETERY',
    tileset_id: 0x0F,
    counter_tiles: [0x12, null, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'INTERIOR',
    tileset_id: 0x10,
    counter_tiles: [null, null, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'CAVERN',
    tileset_id: 0x11,
    counter_tiles: [null, null, null],
    grass_tile: null,
    animation: TileAnimation.WATER,
  },
  {
    tileset_name: 'LOBBY',
    tileset_id: 0x12,
    counter_tiles: [0x15, 0x36, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'MANSION',
    tileset_id: 0x13,
    counter_tiles: [null, null, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'LAB',
    tileset_id: 0x14,
    counter_tiles: [null, null, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'CLUB',
    tileset_id: 0x15,
    counter_tiles: [0x07, 0x17, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
  {
    tileset_name: 'FACILITY',
    tileset_id: 0x16,
    counter_tiles: [0x12, null, null],
    grass_tile: null,
    animation: TileAnimation.WATER,
  },
  {
    tileset_name: 'PLATEAU',
    tileset_id: 0x17,
    counter_tiles: [null, null, null],
    grass_tile: 0x45,
    animation: TileAnimation.WATER,
  },
  {
    tileset_name: 'BEACH_HOUSE',
    tileset_id: 0x18,
    counter_tiles: [null, null, null],
    grass_tile: null,
    animation: TileAnimation.NONE,
  },
] as const;

// Helper type for getting tileset by name
export type TilesetName = typeof TILESETS[number]['tileset_name']; 