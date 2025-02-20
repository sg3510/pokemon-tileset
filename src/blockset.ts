interface Block {
    // A 4x4 grid of tile IDs.
    tiles: number[][];
  }
  
  interface Blockset {
    blocks: Block[];
  }
  
  /**
   * Loads a blockset file (.bst) in 16-byte chunks.
   * Each block is exactly 16 bytes (read 4 rows of 4 numbers).
   *
   * NOTICE: Instead of copying the bytes with slice(),
   * we simply read them directly (and unroll the 4×4 grid).
   */
  export function loadBlockset(data: Uint8Array): Blockset {
    const numBlocks = (data.length / 16) | 0;
    const blocks = new Array<Block>(numBlocks);
    
    for (let i = 0; i < numBlocks; i++) {
      const base = i * 16;
      // Unroll the fixed 4×4 grid:
      blocks[i] = {
        tiles: [
          [data[base + 0], data[base + 1], data[base + 2], data[base + 3]],
          [data[base + 4], data[base + 5], data[base + 6], data[base + 7]],
          [data[base + 8], data[base + 9], data[base + 10], data[base + 11]],
          [data[base + 12], data[base + 13], data[base + 14], data[base + 15]]
        ]
      };
    }
    return { blocks };
  }
  
  /**
   * Loads a .blk file.
   * We assume that each byte in the Uint8Array represents a block index.
   * (This function's Array.from is typically fast enough, but if you want
   * even more speed you might work directly with the Uint8Array.)
   */
  export function loadBlk(data: Uint8Array): number[] {
    return Array.from(data);
  }
  
  /**
   * Assembles the full tile map from .blk and .bst data.
   * This version handles cases where the .blk file is smaller than the declared dimensions
   * by filling missing tiles with 0.
   */
  export function assembleMap(
    blkData: number[],
    blockset: Blockset,
    blocksW: number,
    blocksH: number
  ): number[][] {
    const totalRows = blocksH * 4;
    const totalCols = blocksW * 4;
    // Preallocate final 2D array:
    const finalMap: number[][] = new Array(totalRows);
    for (let r = 0; r < totalRows; r++) {
      finalMap[r] = new Array(totalCols).fill(0); // Initialize with 0s
    }
    
    const { blocks } = blockset;
    for (let by = 0; by < blocksH; by++) {
      for (let bx = 0; bx < blocksW; bx++) {
        const blkIndex = by * blocksW + bx;
        // Skip if we've run out of block data
        if (blkIndex >= blkData.length) {
          continue;
        }
        const blockIndex = blkData[blkIndex];
        if (blockIndex >= blocks.length) {
          // Out-of-range block index; you might handle this as needed.
          console.warn(`Warning: Block index ${blockIndex} is out of range; skipping.`);
          continue;
        }
        const block = blocks[blockIndex];
        // Compute where this block goes:
        const baseY = by * 4;
        const baseX = bx * 4;
  
        // With a 4×4 fixed grid we can simply "unroll" the inner loops:
        finalMap[baseY + 0][baseX + 0] = block.tiles[0][0];
        finalMap[baseY + 0][baseX + 1] = block.tiles[0][1];
        finalMap[baseY + 0][baseX + 2] = block.tiles[0][2];
        finalMap[baseY + 0][baseX + 3] = block.tiles[0][3];
  
        finalMap[baseY + 1][baseX + 0] = block.tiles[1][0];
        finalMap[baseY + 1][baseX + 1] = block.tiles[1][1];
        finalMap[baseY + 1][baseX + 2] = block.tiles[1][2];
        finalMap[baseY + 1][baseX + 3] = block.tiles[1][3];
  
        finalMap[baseY + 2][baseX + 0] = block.tiles[2][0];
        finalMap[baseY + 2][baseX + 1] = block.tiles[2][1];
        finalMap[baseY + 2][baseX + 2] = block.tiles[2][2];
        finalMap[baseY + 2][baseX + 3] = block.tiles[2][3];
  
        finalMap[baseY + 3][baseX + 0] = block.tiles[3][0];
        finalMap[baseY + 3][baseX + 1] = block.tiles[3][1];
        finalMap[baseY + 3][baseX + 2] = block.tiles[3][2];
        finalMap[baseY + 3][baseX + 3] = block.tiles[3][3];
      }
    }
    
    return finalMap;
  }
  
  /**
   * Prints the tile map to the console, formatting each tile as hex.
   */
  export function printMap(tilemap: number[][]): void {
    for (const row of tilemap) {
      console.log(row.map(tile => tile.toString(16).padStart(2, '0')).join(" "));
    }
  }
  
  /**
   * Combines loading and assembling the map.
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
    if (blkData.length !== expected) {
      console.warn(`Warning: .blk file contains ${blkData.length} bytes but expected ${expected} (blocksW x blocksH)`);
    }
    return assembleMap(blkData, blockset, blocksW, blocksH);
  }
  
  /**
   * Gets a visual representation of the blockset data.
   */
  export function getBlocksetVisual(blocksetFileData: Uint8Array): number[][][] {
    const blockset = loadBlockset(blocksetFileData);
    return blockset.blocks.map(block => block.tiles);
  }