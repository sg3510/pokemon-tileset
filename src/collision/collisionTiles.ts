// collision/collisionTiles.ts
// require public/pkassets/data/tilesets/collision_tile_ids.asm as text

import collisionTilesData from "../../public/pkassets/data/tilesets/collision_tile_ids.asm?raw";

export interface CollisionTileMap {
    [key: string]: number[];
}

export const parseCollisionTiles = (): CollisionTileMap => {
    const lines = collisionTilesData.split('\n');
    const tileMap: CollisionTileMap = {};
    let currentKeys: string[] = [];

    for (const line of lines) {
        // Match lines ending with "_Coll::"
        const matchKey = line.match(/^(\w+)_Coll::/);
        if (matchKey) {
            // If line contains a key, add it to current keys
            currentKeys.push(matchKey[1]);
            // If next line also has a key, continue collecting keys
            continue;
        }

        // Match tile IDs in coll_tiles macro
        const matchTiles = line.match(/coll_tiles\s+((?:\$[0-9a-f]{2}(?:,\s*)?)+)/i);
        if (matchTiles && currentKeys.length > 0) {
            // Convert hex strings to numbers
            const tileIds = matchTiles[1]
                .split(',')
                .map(id => parseInt(id.trim().substring(1), 16));
            
            // Create entries for all collected keys
            currentKeys.forEach(key => {
                tileMap[key] = tileIds;
            });
            
            // Reset current keys after processing tile ids
            currentKeys = [];
        }
    }

    return tileMap;
};

