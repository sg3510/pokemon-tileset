import { BLOCK_SIZE } from "../constants";

export function getSpriteFrame(progress: number): "static" | "walking" {
    const mod = progress % BLOCK_SIZE;
    console.log(`getSpriteFrame: progress=${progress}, mod=${mod}`);
    if (mod < 3) return "static";
    else if (mod < 6) return "walking";
    else if (mod < 9) return "static";
    else if (mod < 13) return "walking";
    else return "static";
  }