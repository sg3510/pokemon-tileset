import { useEffect } from "react";
import { processSprite } from "../sprites/processSprite";
import { palettes } from "../palettes/palettes";
import type { StaticDirection } from "../mapObjects/extractMapObjects";
// This hook will preload (and process) all needed sprite variants.
export function usePreloadMapSprites(
  currentMapData: any, // your proper type here
  paletteMode: "cgb" | "sgb",
  spriteCacheRef: React.MutableRefObject<Map<string, HTMLCanvasElement>>,
  onAllSpritesLoaded: () => void
) {
  useEffect(() => {
    if (!currentMapData?.mapObjects) return;
    const objectEvents = currentMapData.mapObjects.object_events;
    // We want to preload both still and walking for all four directions.
    const orientations: StaticDirection[] = [
      "DOWN",
      "UP",
      "LEFT",
      "RIGHT",
    ];
    const walkingVariants = [false, true]; // false: still, true: walking
    const promises: Promise<void>[] = [];

    objectEvents.forEach((objEvent: any) => {
      orientations.forEach((orientation) => {
        walkingVariants.forEach((isWalking) => {
          // Create a unique cache key for each variant.
          const cacheKey = `${objEvent.sprite}_${orientation}_${
            isWalking ? "walking" : "still"
          }`;
          if (!spriteCacheRef.current.has(cacheKey)) {
            const img = new Image();
            const spriteFileName =
              objEvent.sprite.replace("SPRITE_", "").toLowerCase() + ".png";
            const promise = new Promise<void>((resolve, reject) => {
              img.onload = () => {
                const processed = processSprite(
                  img,
                  palettes[currentMapData.paletteId],
                  paletteMode,
                  orientation,
                  isWalking
                );
                spriteCacheRef.current.set(cacheKey, processed);
                resolve();
              };
              img.onerror = reject;
            });
            img.src = `/pokemon-tileset/pkassets/gfx/sprites/${spriteFileName}`;
            promises.push(promise);
          }
        });
      });
    });

    Promise.all(promises)
      .then(() => {
        onAllSpritesLoaded();
      })
      .catch((err) =>
        console.error("Error preloading sprites for current map:", err)
      );
  }, [currentMapData, paletteMode, spriteCacheRef, onAllSpritesLoaded]);
}