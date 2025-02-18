// function takes in object asm file and returns an object of all objects
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

// Define the movement modes
export type MovementMode = "STAY" | "WALK";

// Define static (idle) directions and walking directions
export type StaticDirection = "UP" | "DOWN" | "LEFT" | "RIGHT" | "NONE";
export type WalkingDirection = "UP_DOWN" | "LEFT_RIGHT" | "ANY_DIR";

// Now create a discriminated union for ObjectEvent
export type ObjectEvent =
  | {
      x: number;
      y: number;
      sprite: string;
      movement: "STAY";
      // For STAY, we expect a static facing direction
      direction: StaticDirection;
      textScript: string;
      optionalParam1?: string | number;
      optionalParam2?: string | number;
    }
  | {
      x: number;
      y: number;
      sprite: string;
      movement: "WALK";
      // For WALK, we expect one of the walking directions
      direction: WalkingDirection;
      textScript: string;
      optionalParam1?: string | number;
      optionalParam2?: string | number;
    };

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
            break; // Assuming def_warps_to always comes last.
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
              /object_event\s+(\d+),\s+(\d+),\s+([A-Z_0-9]+),\s+([A-Z_]+),\s+([A-Z_]+|NONE),\s+([A-Z_0-9]+)(?:,\s+([A-Z_0-9]+))?(?:,\s+([A-Z_0-9]+))?/
            );
            if (match) {
              const [, x, y, sprite, movement, direction, textScript, optionalParam1, optionalParam2] = match;
              // Based on the movement string, create the correct object type:
              let objectEvent: ObjectEvent;
              if (movement === "STAY") {
                objectEvent = {
                  x: parseInt(x, 10),
                  y: parseInt(y, 10),
                  sprite,
                  movement: "STAY",
                  direction: direction as StaticDirection,
                  textScript,
                };
              } else if (movement === "WALK") {
                objectEvent = {
                  x: parseInt(x, 10),
                  y: parseInt(y, 10),
                  sprite,
                  movement: "WALK",
                  direction: direction as WalkingDirection,
                  textScript,
                };
              } else {
                // If movement isn't recognized, skip this line or handle the error
                continue;
              }
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