// src/collision/walkability.ts

import { CollisionTileMap } from "./collisionTiles";

/**
 * Normalizes a tileset name so it matches the keys in the collision data.
 * (E.g. "OVERWORLD" becomes "Overworld", "REDS_HOUSE_1" becomes "RedsHouse1".)
 */
export function normalizeTilesetName(tilesetName: string): string {
  // Split by underscore, capitalize each part, and join
  return tilesetName
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Determines if a 16x16 square is walkable.
 *
 * In Pokémon Red/Blue the walkability of a square is determined by the bottom‑left
 * 8×8 tile in a 2×2 group (since each walkable square is 16×16 pixels made of four 8×8 tiles).
 *
 * We assume that the overall map is stored as a 2D array of 8×8 tile IDs (tileMap)
 * where each 16×16 square consists of a 2×2 group. The square coordinates (squareX, squareY)
 * are measured in 16×16 units (with (0,0) at the top‐left).
 *
 * @param squareX The x coordinate (in squares)
 * @param squareY The y coordinate (in squares)
 * @param tileMap 2D array of 8×8 tile IDs
 * @param tilesetName The name of the current tileset (e.g. "OVERWORLD")
 * @param collisionTiles A mapping from tileset names to an array of allowed (walkable) tile IDs.
 * @returns true if the square is walkable, false otherwise.
 */
export function isSquareWalkable(
  squareX: number,
  squareY: number,
  tileMap: number[][],
  tilesetName: string,
  collisionTiles: CollisionTileMap
): boolean {
  // Each walkable square is 2x2 8x8 tiles.
  // In our tileMap (with [0][0] at the top-left), the bottom‑left tile is at:
  //   x = squareX * 2
  //   y = squareY * 2 + 1   (since row 0 is the top row, row 1 is the bottom row of the square)
  const tileX = squareX * 2;
  const tileY = squareY * 2 + 1;

  // Out-of-bounds? Then consider the square non-walkable.
  if (tileY < 0 || tileY >= tileMap.length || tileX < 0 || tileX >= tileMap[0].length) {
    return false;
  }
  const tileId = tileMap[tileY][tileX];

  // Normalize the tileset name so it matches our collision data keys.
  const normalizedName = normalizeTilesetName(tilesetName);
  const allowedTiles = collisionTiles[normalizedName];
  if (!allowedTiles) {
    console.warn(`No collision data for tileset: ${normalizedName}`);
    console.log(tilesetName);
    return false;
  }
  return allowedTiles.includes(tileId);
}