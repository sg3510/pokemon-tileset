// constants.ts
// Constants for rendering
//
export const TILE_SIZE = 8;
export const BLOCK_SIZE = 16;
export const ZOOM_FACTOR = 4;
export const DISPLAY_SCALE = 2; // So a tile on screen is 8*2 = 16 px

// The water tile is always tile number 20 (0x14)
export const WATER_TILE_ID = 20;
// The flower tile is always tile number 3 (0x03)
export const FLOWER_TILE_ID = 3;
// The tileset is assumed to be 16 columns wide.
export const TILES_PER_ROW = 16;

// How often (in ms) the water pixels shift.
export const WATER_ANIMATION_DELAY = 275;