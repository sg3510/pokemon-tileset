import { BLOCK_SIZE } from "../constants";

export function getSpriteFrame(progress: number): "static" | "walking" {
    const mod = progress % BLOCK_SIZE;
    if (mod < 3) return "static";
    else if (mod < 6) return "walking";
    else if (mod < 9) return "static";
    else if (mod < 13) return "walking";
    else return "static";
  }

  export type SpriteType = "none" | "facing" | "walk";

/**
 * getSpriteType
 * -------------
 * Determines the sprite type based on its image dimensions:
 * - "none": a 16×16 sprite (only one static frame)
 * - "facing": a 16×48 sprite (shows different facing directions)
 * - "walk": a 16×96 sprite (shows both facing and walking frames)
 */
export function getSpriteType(img: HTMLImageElement): SpriteType {
  if (img.height === 16) return "none";
  if (img.height === 48) return "facing";
  if (img.height === 96) return "walk";
  return "none"; // fallback
}