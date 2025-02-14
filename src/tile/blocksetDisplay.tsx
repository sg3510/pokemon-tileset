import { useEffect, useRef } from "react";
interface BlockDisplayProps {
    block: number[][]; // a 4x4 array of tile IDs
    blockIndex: number;
    tileset: HTMLCanvasElement; // the current recolored tileset
    tileSize: number;
    scale: number;
  }
  
  export const BlockDisplay: React.FC<BlockDisplayProps> = ({
    block,
    blockIndex,
    tileset,
    tileSize,
    scale,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
  
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Calculate how many tiles per row in the tileset image.
      const tilesetCols = Math.floor(tileset.width / tileSize);
      // Set canvas size – here each block is 4 tiles wide & high.
      canvas.width = tileSize * 4 * scale;
      canvas.height = tileSize * 4 * scale;
      ctx.imageSmoothingEnabled = false;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const tileId = block[row][col];
          const srcX = (tileId % tilesetCols) * tileSize;
          const srcY = Math.floor(tileId / tilesetCols) * tileSize;
          ctx.drawImage(
            tileset,
            srcX,
            srcY,
            tileSize,
            tileSize,
            col * tileSize * scale,
            row * tileSize * scale,
            tileSize * scale,
            tileSize * scale
          );
        }
      }
    }, [block, tileset, tileSize, scale]);
  
    return (
      <canvas
        ref={canvasRef}
        onClick={() => alert(`Block ID: ${blockIndex}`)}
        style={{ cursor: "pointer", border: "1px solid #ccc", margin: "2px" }}
      />
    );
  };