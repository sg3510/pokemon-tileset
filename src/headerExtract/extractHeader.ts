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
  
  // Get actual blockset
  const baseBlockset = (
    cachedMappings[tilesetName] || tilesetName.toLowerCase()
  ).replace(/_[1-9]$/, "");
  
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
