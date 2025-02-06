#!/usr/bin/env python3
"""
This script reads a Pokémon map’s block file (.blk) and its associated blockset (.bst)
and outputs a 2D array of base tile ids. (We ignore the actual graphic lookup here –
each number represents an 8×8 tile from the tileset.)

How it works:
  1. The blockset file contains a series of 16-byte blocks. Each block is a 4x4 grid
     of tile indices (each index refers to a tile from the 2bpp tileset image).
  2. The .blk file is a grid of bytes where each byte is an index into the blockset.
  3. Since each block is 4×4 base tiles and the map’s .blk file is given in “blocks” (for
     example, Pallet Town is 10 blocks wide by 9 blocks tall), the full tilemap will be
     (10×4) x (9×4) = 40×36 base-tile entries.
"""

import argparse

def load_blockset(filename):
    """
    Load a blockset file.

    Each block in the blockset is 16 bytes long and represents a 4x4 grid of base tile indices.
    Returns a list of blocks; each block is a list of 4 rows (lists of 4 integers each).
    """
    blocks = []
    with open(filename, "rb") as f:
        data = f.read()
    # Process data in 16-byte chunks:
    for i in range(0, len(data), 16):
        block_data = data[i:i+16]
        # If we get an incomplete block at the end, ignore it.
        if len(block_data) < 16:
            break
        block = []
        for row in range(4):
            row_tiles = []
            for col in range(4):
                index = row * 4 + col
                tile_id = block_data[index]
                row_tiles.append(tile_id)
            block.append(row_tiles)
        blocks.append(block)
    return blocks

def load_blk(filename):
    """
    Load a .blk file, which is simply a sequence of bytes.
    Each byte is an index into the blockset.
    Returns a list of integers.
    """
    with open(filename, "rb") as f:
        data = f.read()
    return list(data)

def assemble_map(blk_data, blocks, blocks_w, blocks_h):
    """
    Assemble the full tile map.

    The .blk file is a grid of block indices (dimensions: blocks_w × blocks_h).
    Each block from the blockset is 4×4 base tiles.
    The final tilemap will therefore have dimensions:
         width  = blocks_w * 4,
         height = blocks_h * 4.
    """
    # Initialize an empty 2D array (list of lists) for the final tile map.
    final_map = [[0 for _ in range(blocks_w * 4)] for _ in range(blocks_h * 4)]
    # Process each block reference in the .blk file:
    for by in range(blocks_h):
        for bx in range(blocks_w):
            # Calculate the index in the blk data
            blk_index = by * blocks_w + bx
            block_index = blk_data[blk_index]
            if block_index >= len(blocks):
                print(f"Warning: Block index {block_index} is out of range; skipping.")
                continue
            block = blocks[block_index]  # This is a 4x4 grid of tile ids.
            # Determine where this block goes in the final map:
            base_y = by * 4
            base_x = bx * 4
            for row in range(4):
                for col in range(4):
                    final_map[base_y + row][base_x + col] = block[row][col]
    return final_map

def print_map(tilemap):
    """
    Print the tilemap to the console. Each tile id is printed in hexadecimal.
    """
    for row in tilemap:
        print(" ".join(f"{tile:02X}" for tile in row))

def main():
    parser = argparse.ArgumentParser(
        description="Read a Pokémon .blk file and its blockset, then output a parent tilemap (2D array of tile ids)."
    )
    parser.add_argument("blk_file", help="Path to the .blk file (e.g. PalletTown.blk)")
    parser.add_argument("blockset_file", help="Path to the blockset file (e.g. overworld.bst)")
    parser.add_argument(
        "--blocks-width",
        type=int,
        default=10,
        help="Map width in blocks (default: 10 for Pallet Town)"
    )
    parser.add_argument(
        "--blocks-height",
        type=int,
        default=9,
        help="Map height in blocks (default: 9 for Pallet Town)"
    )
    args = parser.parse_args()

    blocks = load_blockset(args.blockset_file)
    blk_data = load_blk(args.blk_file)
    expected = args.blocks_width * args.blocks_height
    if len(blk_data) != expected:
        print(f"Warning: .blk file contains {len(blk_data)} bytes but expected {expected} (blocks_w x blocks_h)")

    tilemap = assemble_map(blk_data, blocks, args.blocks_width, args.blocks_height)
    print_map(tilemap)

if __name__ == '__main__':
    main()