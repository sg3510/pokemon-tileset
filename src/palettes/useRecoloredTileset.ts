// useRecoloredTileset.ts
import { useState, useEffect } from 'react';
import { PaletteEntry, RGB } from './palettes.d';
/**
 * useRecoloredTileset
 * @param originalTileset The base tileset image (an HTMLImageElement)
 * @param palette The palette to use (which contains sgb colors in 0–31)
 * @param paletteMode The mode of the palette (either 'cgb' or 'sgb')
 * @param originalColors The 4 original colors in the base tileset (in hex, in 0–255)
 */
export function useRecoloredTileset(
  originalTileset: HTMLImageElement | undefined,
  palette: PaletteEntry,
  paletteMode: 'cgb' | 'sgb' = 'cgb',
  originalColors: string[] = ['#ffffff', '#aaaaaa', '#555555', '#000000']
): HTMLCanvasElement | null {
  const [recoloredCanvas, setRecoloredCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!originalTileset || !originalTileset.complete) return;

    // Create an off-screen canvas the same size as the original image.
    const offCanvas = document.createElement('canvas');
    offCanvas.width = originalTileset.width;
    offCanvas.height = originalTileset.height;
    const ctx = offCanvas.getContext('2d');
    if (!ctx) return;
    
    // Draw the original image onto the off-screen canvas.
    ctx.drawImage(originalTileset, 0, 0);
    const imageData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imageData.data;

    // Helper: convert hex (like "#ffffff") to an RGB object (0–255).
    const hexToRgb = (hex: string): RGB => {
      let cleanHex = hex.replace('#', '');
      if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
      }
      const bigint = parseInt(cleanHex, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
      };
    };

    // The four base colors of the tileset.
    const baseColors = originalColors.map(hexToRgb);

    // Convert the SGB colors from 0–31 to 0–255.
    const scaleColor = (color: RGB): RGB => ({
      r: Math.round((color.r / 31) * 255),
      g: Math.round((color.g / 31) * 255),
      b: Math.round((color.b / 31) * 255)
    });
    const newColors = palette[paletteMode].map(scaleColor);

    // Loop through every pixel in the image data.
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // For each of our 4 base colors, see if this pixel matches.
      for (let j = 0; j < baseColors.length; j++) {
        const base = baseColors[j];
        if (r === base.r && g === base.g && b === base.b) {
          const newColor = newColors[j];
          data[i] = newColor.r;
          data[i + 1] = newColor.g;
          data[i + 2] = newColor.b;
          break; // Found a match; no need to check the rest.
        }
      }
    }

    // Write the modified pixel data back to the off-screen canvas.
    ctx.putImageData(imageData, 0, 0);
    setRecoloredCanvas(offCanvas);
  }, [originalTileset, palette, paletteMode]);

  return recoloredCanvas;
}

export function recolorTileset(
  originalTileset: HTMLImageElement,
  palette: { cgb: { r: number; g: number; b: number }[]; sgb: { r: number; g: number; b: number }[] },
  paletteMode: 'cgb' | 'sgb' = 'cgb',
  originalColors: string[] = ["#ffffff", "#aaaaaa", "#555555", "#000000"]
): HTMLCanvasElement {
  const offCanvas = document.createElement("canvas");
  offCanvas.width = originalTileset.width;
  offCanvas.height = originalTileset.height;
  const ctx = offCanvas.getContext("2d");
  if (!ctx) return offCanvas;
  ctx.drawImage(originalTileset, 0, 0);
  const imageData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
  const data = imageData.data;

  // Helper: Convert a hex string (e.g. "#ffffff") to an RGB object.
  const hexToRgb = (hex: string) => {
    let cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split("").map((c) => c + c).join("");
    }
    const bigint = parseInt(cleanHex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };

  const baseColors = originalColors.map(hexToRgb);
  // Scale a color from the 0–31 range to 0–255.
  const scaleColor = (color: { r: number; g: number; b: number }) => ({
    r: Math.round((color.r / 31) * 255),
    g: Math.round((color.g / 31) * 255),
    b: Math.round((color.b / 31) * 255),
  });
  const newColors = palette[paletteMode].map(scaleColor);

  // Loop through every pixel and replace matching base colors.
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    for (let j = 0; j < baseColors.length; j++) {
      const base = baseColors[j];
      if (r === base.r && g === base.g && b === base.b) {
        const newColor = newColors[j];
        data[i] = newColor.r;
        data[i + 1] = newColor.g;
        data[i + 2] = newColor.b;
        break;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return offCanvas;
}