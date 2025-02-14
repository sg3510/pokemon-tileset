import { memo } from "react";
import { palettes } from "./palettes";

interface PaletteDisplayProps {
  paletteId: number;
  paletteMode: "cgb" | "sgb";
}

export const PaletteDisplay = memo(({ paletteId, paletteMode }: PaletteDisplayProps) => {
  const palette = palettes[paletteId];
  if (!palette) return null;

  const convertColor = (color: { r: number; g: number; b: number }) => ({
    r: Math.round((color.r / 31) * 255),
    g: Math.round((color.g / 31) * 255),
    b: Math.round((color.b / 31) * 255),
  });

  const currentPalette = paletteMode === "cgb" ? palette.cgb : palette.sgb;

  return (
    <div style={{ padding: "10px" }}>
      <h4 style={{ margin: "5px 0" }}>{paletteMode.toUpperCase()} Palette</h4>
      <div style={{ display: "flex" }}>
        {currentPalette.map((color, index) => (
          <div
            key={`color-${index}`}
            style={{
              width: "30px",
              height: "30px",
              backgroundColor: `rgb(${convertColor(color).r}, ${convertColor(color).g}, ${convertColor(color).b})`,
              border: "1px solid #666",
              margin: "2px",
            }}
            title={`R:${color.r} G:${color.g} B:${color.b}`}
          />
        ))}
      </div>
    </div>
  );
});

export default PaletteDisplay;