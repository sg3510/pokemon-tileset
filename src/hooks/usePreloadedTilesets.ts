import { useState, useEffect } from 'react';

export function usePreloadedTilesets(
  imageFiles: string[],
  paletteMode: 'cgb' | 'sgb' = 'cgb'
): Record<string, HTMLImageElement> {
  const [tilesets, setTilesets] = useState<Record<string, HTMLImageElement>>({});
  const [currentMode, setCurrentMode] = useState(paletteMode);

  // Reset tilesets when palette mode changes
  useEffect(() => {
    if (currentMode !== paletteMode) {
      setTilesets({});
      setCurrentMode(paletteMode);
    }
  }, [paletteMode, currentMode]);

  useEffect(() => {
    // Only load if we haven't loaded all images yet
    if (Object.keys(tilesets).length === imageFiles.length) return;

    const cache: Record<string, HTMLImageElement> = {};
    let mounted = true;
    let loadedCount = 0;

    imageFiles.forEach((filename) => {
      const img = new Image();
      img.src = `/pokemon-tileset/pkassets/tilesets/${filename}`;
      img.onload = () => {
        if (!mounted) return;
        loadedCount++;
        cache[filename] = img;
        
        // Only update state once all images are loaded
        if (loadedCount === imageFiles.length) {
          setTilesets(cache);
        }
      };
    });

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [imageFiles, currentMode]); // Add currentMode to dependencies

  return tilesets;
}