// src/sprites/processSprite.ts
import { StaticDirection } from "../mapObjects/extractMapObjects";
/**
 * processSprite
 * ---------------
 * Given a sprite sheet image, this function extracts a 16×16 frame
 * based on both the desired orientation and whether the sprite is walking.
 *
 * The assumed layout is:
 *   - Frame 0: Down still
 *   - Frame 1: Up still
 *   - Frame 2: Left still (mirrored for right)
 *   - Frame 3: Down walking midframe
 *   - Frame 4: Up walking midframe
 *   - Frame 5: Left walking midframe (mirrored for right)
 *
 * @param originalSprite - The full sprite sheet image.
 * @param palette - An object with two palettes (cgb and sgb) where each is an array of colors (0–31 range).
 * @param paletteMode - Either 'cgb' or 'sgb'.
 * @param orientation - One of "down", "up", "left", or "right".
 * @param isWalking - True if the sprite is in its walking (midframe) state.
 *
 * @returns An HTMLCanvasElement containing the processed 16×16 sprite.
 */
export function processSprite(
  originalSprite: HTMLImageElement,
  palette: { cgb: { r: number; g: number; b: number }[]; sgb: { r: number; g: number; b: number }[] },
  paletteMode: 'cgb' | 'sgb' = 'cgb',
  orientation: StaticDirection = 'DOWN',
  isWalking: boolean = false
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  // Determine base frame index from orientation.
  // For still sprites: down=0, up=1, left=2.
  // For walking sprites: down=3, up=4, left=5.
  let baseFrameIndex = 0;
  switch (orientation) {
    case 'UP': baseFrameIndex = 1; break;
    case 'LEFT': baseFrameIndex = 2; break;
    case 'DOWN':
    case 'NONE':  // Added NONE case to match DOWN behavior
    default: baseFrameIndex = 0; break;
  }
  if (isWalking) {
    baseFrameIndex += 3;
  }
  let mirror = false;
  if (orientation === 'RIGHT') {
    // Use left frame and mirror horizontally.
    baseFrameIndex = isWalking ? 5 : 2;
    mirror = true;
  }

  // Draw the 16x16 region from the sprite sheet.
  // Note: The vertical offset is baseFrameIndex * 16.
  if (mirror) {
    ctx.save();
    ctx.scale(-1, 1);
    // When mirroring, draw to x=-16.
    ctx.drawImage(originalSprite, 0, baseFrameIndex * 16, 16, 16, -16, 0, 16, 16);
    ctx.restore();
  } else {
    ctx.drawImage(originalSprite, 0, baseFrameIndex * 16, 16, 16, 0, 0, 16, 16);
  }

  // Process pixel data: make pure white transparent and convert #aaaaaa to white.
  const imageData = ctx.getImageData(0, 0, 16, 16);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
      data[i + 3] = 0; // transparent
    } else if (data[i] === 170 && data[i + 1] === 170 && data[i + 2] === 170) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Palette remapping: define our four base colors (order must match your sprite art).
  const originalColors = [
    { r: 255, g: 255, b: 255 }, // white (transparent)
    { r: 170, g: 170, b: 170 }, // original aaaaaa (now white)
    { r: 85,  g: 85,  b: 85  }, // #555555
    { r: 0,   g: 0,   b: 0   }  // black
  ];
  const scaleColor = (color: { r: number; g: number; b: number }) => ({
    r: Math.round((color.r / 31) * 255),
    g: Math.round((color.g / 31) * 255),
    b: Math.round((color.b / 31) * 255)
  });
  const newColors = palette[paletteMode].map(scaleColor);

  // Remap each pixel's color if it matches one of our base colors.
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (let j = 0; j < originalColors.length; j++) {
      const base = originalColors[j];
      if (data[i] === base.r && data[i + 1] === base.g && data[i + 2] === base.b) {
        const newColor = newColors[j];
        data[i] = newColor.r;
        data[i + 1] = newColor.g;
        data[i + 2] = newColor.b;
        break;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}