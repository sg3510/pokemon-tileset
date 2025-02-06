/**
 * This module provides functions to process Pokémon map data, specifically
 * .blk (block) and .bst (blockset) files, and assemble a 2D array of
 * tile IDs representing the map.
 */

interface Block {
  tiles: number[][];
}

interface Blockset {
  blocks: Block[];
}

/**
 * Loads a blockset file (.bst).
 * @param data The file contents as a Uint8Array.
 * @returns A Blockset object.
 */
export function loadBlockset(data: Uint8Array): Blockset {
  const blocks: Block[] = [];
  // Process data in 16-byte chunks:
  for (let i = 0; i < data.length; i += 16) {
    const blockData = data.slice(i, i + 16);
    // If we get an incomplete block at the end, ignore it.
    if (blockData.length < 16) {
      break;
    }
    const block: Block = { tiles: [] };
    for (let row = 0; row < 4; row++) {
      const rowTiles: number[] = [];
      for (let col = 0; col < 4; col++) {
        const index = row * 4 + col;
        const tileId = blockData[index];
        rowTiles.push(tileId);
      }
      block.tiles.push(rowTiles);
    }
    blocks.push(block);
  }
  return { blocks };
}

/**
 * Loads a .blk file.
 * @param data The file contents as a Uint8Array.
 * @returns An array of block indices (numbers).
 */
export function loadBlk(data: Uint8Array): number[] {
  return Array.from(data); // Convert Uint8Array to a regular number array
}

/**
 * Assembles the full tile map from .blk and .bst data.
 * @param blkData Array of block indices from the .blk file.
 * @param blockset The Blockset object.
 * @param blocksW Map width in blocks.
 * @param blocksH Map height in blocks.
 * @returns A 2D array of tile IDs (the assembled map).
 */
export function assembleMap(
  blkData: number[],
  blockset: Blockset,
  blocksW: number,
  blocksH: number
): number[][] {
  const { blocks } = blockset;
  // Initialize an empty 2D array for the final tile map.
  const finalMap: number[][] = Array(blocksH * 4)
    .fill(null)
    .map(() => Array(blocksW * 4).fill(0));

  // Process each block reference in the .blk file:
  for (let by = 0; by < blocksH; by++) {
    for (let bx = 0; bx < blocksW; bx++) {
      // Calculate the index in the blk data
      const blkIndex = by * blocksW + bx;
      const blockIndex = blkData[blkIndex];

      if (blockIndex >= blocks.length) {
        console.warn(`Warning: Block index ${blockIndex} is out of range; skipping.`);
        continue;
      }

      const block = blocks[blockIndex]; // This is a 4x4 grid of tile ids.

      // Determine where this block goes in the final map:
      const baseY = by * 4;
      const baseX = bx * 4;

      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          finalMap[baseY + row][baseX + col] = block.tiles[row][col];
        }
      }
    }
  }

  return finalMap;
}

/**
 * Prints the tilemap to the console.  Each tile ID is formatted in hex.
 * @param tilemap
 */
export function printMap(tilemap: number[][]): void {
    for (const row of tilemap) {
        console.log(row.map(tile => tile.toString(16).padStart(2, '0')).join(" "));
    }
}

/**
 *  Combines loading and assembling the map.
 * @param blkFileData
 * @param blocksetFileData
 * @param blocksW
 * @param blocksH
 */
export function loadAndAssembleMap(
    blkFileData: Uint8Array,
    blocksetFileData: Uint8Array,
    blocksW: number,
    blocksH: number
): number[][] {
    const blockset = loadBlockset(blocksetFileData);
    const blkData = loadBlk(blkFileData);
    const expected = blocksW * blocksH;
    if (blkData.length != expected) {
        console.warn(`Warning: .blk file contains ${blkData.length} bytes but expected ${expected} (blocks_w x blocks_h)`)
    }
    return assembleMap(blkData, blockset, blocksW, blocksH);
}

/**
 * Gets a visual representation of the blockset data.
 * Returns an array where each element represents a block (4x4 grid).
 * @param blocksetFileData The raw blockset file data
 * @returns Array of blocks, where each block is a 4x4 grid of tile IDs
 */
export function getBlocksetVisual(blocksetFileData: Uint8Array): number[][][] {
    const blockset = loadBlockset(blocksetFileData);
    return blockset.blocks.map(block => block.tiles);
} 