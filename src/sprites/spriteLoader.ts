// spriteLoader.ts
import { processSprite } from "./processSprite";
import { palettes } from "../palettes/palettes";
import type { ObjectEvent } from "../mapObjects/extractMapObjects";

// Helper that loads and processes all sprites for a given map’s object events.
export async function loadSpritesForMap(
  objectEvents: ObjectEvent[],
  paletteId: number,
  paletteMode: "cgb" | "sgb"
): Promise<Map<string, HTMLCanvasElement>> {
  const spriteCache = new Map<string, HTMLCanvasElement>();

  // Create an array of promises – one per sprite.
  const promises = objectEvents.map((obj) => {
    return new Promise<void>((resolve) => {
      // Determine orientation (default to "down")
      let orientation: "down" | "up" | "left" | "right" = "down";
      if (obj.facingDirection) {
        const dir = obj.facingDirection.toLowerCase();
        if (dir === "up" || dir === "left" || dir === "right") {
          orientation = dir as "up" | "left" | "right";
        }
      }
      const cacheKey = obj.sprite + "_" + orientation;
      const spriteFileName =
        obj.sprite.replace("SPRITE_", "").toLowerCase() + ".png";

      const img = new Image();
      img.src = `/pokemon-tileset/pkassets/gfx/sprites/${spriteFileName}`;
      img.onload = () => {
        const processedSprite = processSprite(
          img,
          palettes[paletteId],
          paletteMode,
          orientation
        );
        spriteCache.set(cacheKey, processedSprite);
        resolve();
      };
      img.onerror = () => {
        console.error("Failed to load sprite", spriteFileName);
        resolve();
      };
    });
  });

  await Promise.all(promises);
  return spriteCache;
}