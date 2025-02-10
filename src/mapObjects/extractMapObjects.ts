// function takes in  object asm file and returns an object of all objects
export interface MapObjectData {
    warp_events: WarpEvent[];
    bg_events: BgEvent[];
    object_events: ObjectEvent[];
}

export interface WarpEvent {
    x: number;
    y: number;
    targetMap: string;
    warpIndex: number;
    isDebug?: boolean;
}

export interface BgEvent {
    x: number;
    y: number;
    scriptId: string;
}

export interface ObjectEvent {
    x: number;
    y: number;
    sprite: string;
    movement: string;
    facingDirection: string | null;
    textScript: string;
    optionalParam1?: string | number;
    optionalParam2?: string | number;
}

export function extractMapObjects(asmFileContent: string): MapObjectData {
    const lines = asmFileContent.split('\n');

    const warpEvents: WarpEvent[] = [];
    const bgEvents: BgEvent[] = [];
    const objectEvents: ObjectEvent[] = [];

    let inWarpEvents = false;
    let inBgEvents = false;
    let inObjectEvents = false;
    let inDebugSection = false;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine === 'IF DEF(_DEBUG)') {
            inDebugSection = true;
            continue;
        } else if (trimmedLine === 'ENDC') {
            inDebugSection = false;
            continue;
        }

        if (trimmedLine.startsWith('def_warp_events')) {
            inWarpEvents = true;
            inBgEvents = false;
            inObjectEvents = false;
            continue;
        } else if (trimmedLine.startsWith('def_bg_events')) {
            inWarpEvents = false;
            inBgEvents = true;
            inObjectEvents = false;
            continue;
        } else if (trimmedLine.startsWith('def_object_events')) {
            inWarpEvents = false;
            inBgEvents = false;
            inObjectEvents = true;
            continue;
        } else if (trimmedLine.startsWith('def_warps_to')) {
            // section end
            break; // Assuming def_warps_to always comes last.  If not, we'll need more complex logic.
        }


        if (inWarpEvents) {
            const match = trimmedLine.match(/warp_event\s+(\d+),\s+(\d+),\s+([A-Z_0-9]+),\s+(\d+)/);
            if (match) {
                const [, x, y, targetMap, warpIndex] = match;
                warpEvents.push({
                    x: parseInt(x, 10),
                    y: parseInt(y, 10),
                    targetMap,
                    warpIndex: parseInt(warpIndex, 10),
                    isDebug: inDebugSection
                });
            }
        } else if (inBgEvents) {
            const match = trimmedLine.match(/bg_event\s+(\d+),\s+(\d+),\s+([A-Z_0-9]+)/);
            if (match) {
                const [, x, y, scriptId] = match;
                bgEvents.push({
                    x: parseInt(x, 10),
                    y: parseInt(y, 10),
                    scriptId,
                });
            }
        } else if (inObjectEvents) {
            const match = trimmedLine.match(
                /object_event\s+(\d+),\s+(\d+),\s+([A-Z_0-9]+),\s+([A-Z_]+),\s+([A-Z_]+|NONE),\s+([A-Z_0-9]+)(?:,\s+([A-Z_0-9]+))?(?:,\s+([A-Z_0-9]+))?/,
            );
            if (match) {
                const [, x, y, sprite, movement, facingDirection, textScript, optionalParam1, optionalParam2] = match;
                const objectEvent: ObjectEvent = {
                    x: parseInt(x, 10),
                    y: parseInt(y, 10),
                    sprite,
                    movement,
                    facingDirection: facingDirection !== 'NONE' ? facingDirection : null,
                    textScript,
                };

                if (optionalParam1) {
                    objectEvent.optionalParam1 = optionalParam1;
                }
                if (optionalParam2) {
                    objectEvent.optionalParam2 = optionalParam2;
                }
                objectEvents.push(objectEvent);
            }
        }
    }

    return {
        warp_events: warpEvents,
        bg_events: bgEvents,
        object_events: objectEvents,
    };
}

// Example usage (assuming you have the file content in a variable called 'fileContent'):
// const mapData = extractMapObjects(fileContent);
// console.log(mapData);

// You'll need to read the file content into a string.  Here's an example using Node.js fs module:
/*
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, '../../public/pkassets/data/maps/objects/ViridianForest.asm');  // example path

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  const mapData = extractMapObjects(data);
  console.log(mapData);
    console.log(JSON.stringify(mapData, null, 2)); // pretty print
});
*/
