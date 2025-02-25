export interface Connection {
    direction: 'north' | 'south' | 'east' | 'west';
    mapName: string;
    mapConst: string;
    offset: number;
  }
  
 export interface MapHeader {
    name: string;
    sizeConst: string;
    tileset: string;
    width?: number;
    height?: number;
    actualBlockset: string;
    connections: Connection[];
  }
export function extractHeader(
  headerText: string,
  cachedConstants: Record<string, { width: number; height: number }>,
  cachedMappings: Record<string, string>
): MapHeader {
  // Parse map_header line
  const headerMatch = headerText.match(/map_header\s+(\w+),\s+(\w+),\s+(\w+)/);
  if (!headerMatch) throw new Error("Failed to parse header file");
  
  const headerName = headerMatch[1];
  const sizeConst = headerMatch[2];
  const tilesetName = headerMatch[3].toUpperCase();
  
  // Get dimensions from constants
  const dimensions = cachedConstants[sizeConst];
  if (!dimensions) throw new Error("Map dimensions not found for " + sizeConst);
  
  // Get actual blockset with improved fallback logic
  let baseBlockset: string = '';
  
  // Try to get from cached mappings first
  if (cachedMappings[tilesetName]) {
    baseBlockset = cachedMappings[tilesetName];
  } 
  // Try smarter fallback using our reverse mappings
  else {
    console.log(`No direct mapping found for tileset: ${tilesetName}. Trying fallbacks...`);
    
    // Access the reverse mapping (blockset -> tilesets)
    const blocksetToTilesets = (cachedMappings as any).__blocksetToTilesets || {};
    
    // Find potential matches using substring/partial matching
    let matched = false;
    
    // 1. Try to find a blockset where one of its tilesets is a substring of our tileset
    // or our tileset is a substring of one of the blockset's tilesets
    for (const [blockset, tilesets] of Object.entries(blocksetToTilesets)) {
      for (const mapping of (tilesets as string[])) {
        // Check if any known tileset is contained within our tileset
        // or if our tileset contains any known tileset
        if (tilesetName.includes(mapping) || mapping.includes(tilesetName)) {
          baseBlockset = blockset;
          console.log(`Found match: ${tilesetName} -> ${mapping} -> ${blockset}`);
          matched = true;
          break;
        }
        
        // Also check individual parts if it's a multi-part name
        if (tilesetName.includes('_')) {
          const parts = tilesetName.split('_');
          for (const part of parts) {
            if (mapping.includes(part) || part === mapping) {
              baseBlockset = blockset;
              console.log(`Found partial match: ${tilesetName} (part: ${part}) -> ${mapping} -> ${blockset}`);
              matched = true;
              break;
            }
          }
        }
      }
      if (matched) break;
    }
    
    // 2. If no match found, try using the last part of multi-part names
    if (!matched && tilesetName.includes('_')) {
      const parts = tilesetName.split('_');
      const lastPart = parts[parts.length - 1];
      baseBlockset = lastPart.toLowerCase();
      console.log(`Falling back to last part of name: ${tilesetName} -> ${baseBlockset}`);
    }
    // 3. Last resort - just use the lowercase tileset name
    else if (!matched) {
      baseBlockset = tilesetName.toLowerCase().replace(/_[1-9]$/, "");
      console.log(`Last resort fallback: ${tilesetName} -> ${baseBlockset}`);
    }
  }
  
  // Parse connection lines
  const connections: Connection[] = [];
  const connectionRegex = /connection\s+(\w+),\s+(\w+),\s+(\w+),\s+(-?\d+)/g;
  let match;
  
  while ((match = connectionRegex.exec(headerText)) !== null) {
    connections.push({
      direction: match[1].toLowerCase() as Connection['direction'],
      mapName: match[2],
      mapConst: match[3],
      offset: parseInt(match[4], 10)
    });
  }
  
  // Create and return the MapHeader object
  return {
    name: headerName,
    sizeConst,
    tileset: tilesetName,
    actualBlockset: baseBlockset,
    width: dimensions.width,
    height: dimensions.height,
    connections
  };
}


// const TEST_HEADER = `	map_header Route1, ROUTE_1, OVERWORLD, NORTH | SOUTH
// 	connection north, ViridianCity, VIRIDIAN_CITY, -5
// 	connection south, PalletTown, PALLET_TOWN, 0
// 	end_map_header
// `;


// const constants = {
//   ROUTE_1: { width: 10, height: 10 },
// };

// const mappings = {
//   OVERWORLD: "overworld",
// };

// const header = extractHeader(TEST_HEADER, constants, mappings);
// console.log(header);
