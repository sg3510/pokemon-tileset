// usePreloadedSprites.ts
import { useState, useEffect } from 'react';
import { SPRITE_FILES } from '../constants/const'; // adjust the import path as needed
import { getSpriteType } from '../sprites/spriteHelper';

export type SpriteType = "none" | "facing" | "walk";

export interface PreloadedSprites {
  sprites: Record<string, HTMLImageElement>; // mapping of normalized sprite key to image
  spriteMeta: Record<string, SpriteType>;      // mapping of normalized sprite key to sprite type
  loading: boolean;
}

export function usePreloadedSprites(): PreloadedSprites {
  const [sprites, setSprites] = useState<Record<string, HTMLImageElement>>({});
  const [spriteMeta, setSpriteMeta] = useState<Record<string, SpriteType>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let loadedCount = 0;
    const spriteCache: Record<string, HTMLImageElement> = {};
    const metaCache: Record<string, SpriteType> = {};
    const total = SPRITE_FILES.length;

    SPRITE_FILES.forEach((file) => {
      // Convert "youngster.png" to "SPRITE_YOUNGSTER"
      const spriteKey = "SPRITE_" + file.replace('.png', '').toUpperCase();
      const img = new Image();
      img.src = `/pokemon-tileset/pkassets/gfx/sprites/${file}`;
      img.onload = () => {
        if (!mounted) return;
        loadedCount++;
        spriteCache[spriteKey] = img;
        metaCache[spriteKey] = getSpriteType(img);
        if (loadedCount === total) {
          setSprites(spriteCache);
          setSpriteMeta(metaCache);
          setLoading(false);
        }
      };
      img.onerror = (err) => {
        if (!mounted) return;
        loadedCount++;
        console.error(`Error loading sprite ${file}:`, err);
        // Even on error, we continue so that loading eventually ends.
        if (loadedCount === total) {
          setSprites(spriteCache);
          setSpriteMeta(metaCache);
          setLoading(false);
        }
      };
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { sprites, spriteMeta, loading };
}