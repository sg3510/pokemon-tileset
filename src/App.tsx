/* App.tsx */
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import "./App.css";
import { loadAndAssembleMap } from "./blockset";
import { usePreloadedTilesets } from "./hooks/usePreloadedTilesets";
import { getPaletteId } from "./palettes/getPalletteId";
import { palettes } from "./palettes/palettes";
import { recolorTileset } from "./palettes/useRecoloredTileset";
import { TILESETS, TileAnimation } from "./tile/tileset-constants";
import { AVAILABLE_HEADERS, TILESET_FILES } from "./constants/const";
import { BgEvent, extractMapObjects, ObjectEvent, WarpEvent } from "./mapObjects/extractMapObjects";
 
//
// Constants for rendering
//
const TILE_SIZE = 8;
const BLOCK_SIZE = 16;
const ZOOM_FACTOR = 4;
const DISPLAY_SCALE = 2; // So a tile on screen is 8*2 = 16 px
 
// The water tile is always tile number 20 (0x14)
const WATER_TILE_ID = 20;
// The flower tile is always tile number 3 (0x03)
const FLOWER_TILE_ID = 3;
// The tileset is assumed to be 16 columns wide.
const TILES_PER_ROW = 16;
 
// How often (in ms) the water pixels shift.
const WATER_ANIMATION_DELAY = 275;
 
//
// Interfaces
//
interface MapHeader {
  name: string;
  sizeConst: string;
  tileset: string;
  width?: number;
  height?: number;
  actualBlockset: string;
}
 
interface MapObjectData {
  warp_events: WarpEvent[];
  bg_events: BgEvent[];
  object_events: ObjectEvent[];
}
 
interface CurrentMapData {
  header: MapHeader;
  tileMap: number[][];
  recoloredTileset: HTMLCanvasElement;
  paletteId: number;
  mapObjects?: MapObjectData;
}
 
interface TileCoordinates {
  x: number;
  y: number;
}
 
interface PaletteDisplayProps {
  paletteId: number;
  paletteMode: 'cgb' | 'sgb';
}
 
//
// A simple PaletteDisplay component
//
const PaletteDisplay = memo(({ paletteId, paletteMode }: PaletteDisplayProps) => {
  const palette = palettes[paletteId];
  if (!palette) return null;
 
  const convertColor = (color: { r: number; g: number; b: number }) => ({
    r: Math.round((color.r / 31) * 255),
    g: Math.round((color.g / 31) * 255),
    b: Math.round((color.b / 31) * 255),
  });
 
  const currentPalette = paletteMode === 'cgb' ? palette.cgb : palette.sgb;
 
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
 
//
// Main App Component
//
function App() {
  // -- State and selections --
  const [selectedTile, setSelectedTile] = useState<TileCoordinates | null>(null);
  const [paletteMode, setPaletteMode] = useState<'cgb' | 'sgb'>('cgb');
 
  // Get the current location object
  const location = useLocation();
  // Get the navigate function for updating the URL
  const navigate = useNavigate();
 
  // Read initial values from URL search parameters, provide default values.
  const [selectedHeader, setSelectedHeader] = useState<string>(
    new URLSearchParams(location.search).get('header') || "PalletTown.asm"
  );
  const [currentMapData, setCurrentMapData] = useState<CurrentMapData | null>(null);
 
  // Preload tileset images.
  const preloadedTilesets = usePreloadedTilesets(TILESET_FILES, paletteMode);
 
  // Refs for canvases:
  // canvasRef shows the original (non-animated) tileset preview.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // mapCanvasRef holds the static (full map) image.
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  // waterOverlayCanvasRef is drawn on top of the mapCanvasRef and shows animated water.
  const waterOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  // NEW: eventOverlayCanvasRef is drawn on top of map & water to display clickable markers.
  const eventOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  // previewCanvasRef shows a zoomed-in view of a selected tile.
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
 
  // Cached startup data.
  const [cachedConstants, setCachedConstants] = useState<Record<string, { width: number; height: number }>>({});
  const [cachedMappings, setCachedMappings] = useState<Record<string, string>>({});
  const [mapPointers, setMapPointers] = useState<string[]>([]);
  const [tilesetConstants, setTilesetConstants] = useState<Record<string, number>>({});
 
  // Add new state and useEffect for recolored flower images:
  const [recoloredFlowers, setRecoloredFlowers] = useState<Record<string, HTMLCanvasElement>>({});
 
  // Add state for last map (defaulting to PalletTown.asm)
  const [lastValidMap, setLastValidMap] = useState<string>("PalletTown.asm");

  // Update lastValidMap whenever we successfully change maps
  useEffect(() => {
    if (selectedHeader && selectedHeader !== "LAST_MAP" && selectedHeader !== lastValidMap) {
      const previousMap = lastValidMap;
      setLastValidMap(previousMap);
    }
  }, [selectedHeader, lastValidMap]);

  // Update lastValidMap before changing maps
  const handleMapChange = (newMap: string) => {
    // Only update lastValidMap if current map is outdoor (ID <= 0x24)
    const currentMapId = getMapIdFromHeader(selectedHeader, mapPointers);
    if (newMap !== "LAST_MAP" && newMap !== selectedHeader && currentMapId <= 0x24) {
      setLastValidMap(selectedHeader);
    }
    setSelectedHeader(newMap);
  };
 
  //
  // Helper: Draw grid overlay on a canvas.
  //
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += TILE_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += TILE_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }, []);
 
  //
  // Draw the original (left) tileset image with grid.
  //
  const drawTileset = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    drawGrid(ctx, img.naturalWidth, img.naturalHeight);
  }, [drawGrid]);
 
  //
  // Handle clicks on the tileset preview.
  //
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    setSelectedTile({ x: tileX, y: tileY });
  }, []);
 
  //
  // Load cached constants and mappings (only once)
  //
  useEffect(() => {
    if (Object.keys(cachedConstants).length && Object.keys(cachedMappings).length) return;
    const controller = new AbortController();
    (async function fetchConstantsAndMappings() {
      try {
        const [constRes, mappingRes] = await Promise.all([
          fetch(`/pokemon-tileset/pkassets/constants/map_constants.asm`, { signal: controller.signal }),
          fetch(`/pokemon-tileset/pkassets/gfx/tilesets.asm`, { signal: controller.signal }),
        ]);
        if (!constRes.ok || !mappingRes.ok) {
          throw new Error("Failed to load constants or mappings");
        }
        const constantsText = await constRes.text();
        const mappingsText = await mappingRes.text();
 
        const constants: Record<string, { width: number; height: number }> = {};
        constantsText.split("\n").forEach((line) => {
          const match = line.match(/\s*map_const\s+(\w+),\s*(\d+),\s*(\d+)/);
          if (match) {
            constants[match[1]] = {
              width: parseInt(match[2]),
              height: parseInt(match[3]),
            };
          }
        });
 
        const mappings: Record<string, string> = {};
        const mappingLines = mappingsText.split("\n");
        for (let i = 0; i < mappingLines.length; i++) {
          const gfxMatch = mappingLines[i].match(/(\w+)_GFX::/);
          if (gfxMatch) {
            for (let j = i; j < mappingLines.length; j++) {
              const blocksetMatch = mappingLines[j].match(/INCBIN\s+"gfx\/blocksets\/(\w+)\.bst"/);
              if (blocksetMatch) {
                mappings[gfxMatch[1].toUpperCase()] = blocksetMatch[1];
                break;
              }
            }
          }
        }
        setCachedConstants(constants);
        setCachedMappings(mappings);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error fetching constants/mappings", error);
        }
      }
    })();
    return () => controller.abort();
  }, [cachedConstants, cachedMappings]);
 
  //
  // Load map pointers.
  //
  useEffect(() => {
    async function loadMapPointers() {
      try {
        const response = await fetch("/pokemon-tileset/pkassets/data/maps/map_header_pointers.asm");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const content = await response.text();
        const pointers = content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("dw "));
        setMapPointers(pointers);
      } catch (error) {
        console.error("Error fetching map header pointers:", error);
      }
    }
    loadMapPointers();
  }, []);
 
  //
  // Load tileset constants.
  //
  useEffect(() => {
    async function loadTilesetConstants() {
      try {
        const response = await fetch("/pokemon-tileset/pkassets/constants/tileset_constants.asm");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const content = await response.text();
        const constants: Record<string, number> = {};
        content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("const "))
          .forEach((line, index) => {
            const match = line.match(/const\s+(\w+)/);
            if (match) {
              constants[match[1]] = index;
            }
          });
        setTilesetConstants(constants);
      } catch (error) {
        console.error("Error fetching tileset constants:", error);
      }
    }
    loadTilesetConstants();
  }, []);
 
  //
  // When a new header is selected, load the header, map, blockset, and recolor the tileset.
  //
  const headerRequestIdRef = useRef(0);
  useEffect(() => {
    if (
      !Object.keys(cachedConstants).length ||
      !Object.keys(cachedMappings).length ||
      mapPointers.length === 0 ||
      Object.keys(preloadedTilesets).length === 0 ||
      Object.keys(tilesetConstants).length === 0
    )
      return;
 
    headerRequestIdRef.current++;
    const currentRequestId = headerRequestIdRef.current;
    const controller = new AbortController();
 
    (async function loadMapChain() {
      try {
        // 1. Fetch and parse the header file.
        const headerResponse = await fetch(`/pokemon-tileset/pkassets/data/maps/headers/${selectedHeader}`, {
          signal: controller.signal,
        });
        if (!headerResponse.ok)
          throw new Error(`HTTP error! Status: ${headerResponse.status}`);
        const headerText = await headerResponse.text();
        const headerMatch = headerText.match(/map_header\s+(\w+),\s+(\w+),\s+(\w+)/);
        if (!headerMatch) throw new Error("Failed to parse header file");
        if (currentRequestId !== headerRequestIdRef.current) return;
 
        const headerName = headerMatch[1];
        const sizeConst = headerMatch[2];
        const tilesetName = headerMatch[3].toUpperCase();
        const dimensions = cachedConstants[sizeConst];
        if (!dimensions)
          throw new Error("Map dimensions not found for " + sizeConst);
        const baseBlockset = (cachedMappings[tilesetName] || tilesetName.toLowerCase()).replace(/_[1-9]$/, "");
        const newHeader: MapHeader = {
          name: headerName,
          sizeConst,
          tileset: tilesetName,
          actualBlockset: baseBlockset,
          width: dimensions.width,
          height: dimensions.height,
        };
 
        // 2. Determine file names.
        const newSelectedMap = `${newHeader.name}.blk`;
        const newSelectedBlockset = `${newHeader.actualBlockset}.bst`;
        const newSelectedImage = `${newHeader.actualBlockset}.png`;
        const newSelectedObjectFile = `${newHeader.name}.asm`;
 
        // 3. Ensure the new tileset image is preloaded.
        const originalTileset = preloadedTilesets[newSelectedImage];
        if (!originalTileset)
          throw new Error(`Tileset image ${newSelectedImage} not loaded`);
 
        // 4. Fetch the map and blockset files concurrently.
        const [blkResponse, bstResponse, objResponse] = await Promise.all([
          fetch(`/pokemon-tileset/pkassets/maps/${newSelectedMap}`, { signal: controller.signal }),
          fetch(`/pokemon-tileset/pkassets/blocksets/${newSelectedBlockset}`, { signal: controller.signal }),
          fetch(`/pokemon-tileset/pkassets/data/maps/objects/${newSelectedObjectFile}`, { signal: controller.signal }),
        ]);
        if (!blkResponse.ok || !bstResponse.ok || !objResponse.ok)
          throw new Error("Error loading map, blockset, or object file");
        const blkData = new Uint8Array(await blkResponse.arrayBuffer());
        const blocksetData = new Uint8Array(await bstResponse.arrayBuffer());
        const objectAsmContent = await objResponse.text();
        const map = loadAndAssembleMap(blkData, blocksetData, dimensions.width, dimensions.height);
 
        // 5. Compute map ID and tileset ID then determine the palette ID.
        const mapId = getMapIdFromHeader(selectedHeader, mapPointers);
        const tilesetId = tilesetConstants[newHeader.tileset] || 0;
        const paletteId = getPaletteId(mapId, tilesetId);
 
        // 6. Recolor the tileset image.
        const recoloredTileset = recolorTileset(
          originalTileset,
          palettes[paletteId],
          paletteMode,
          ["#ffffff", "#aaaaaa", "#555555", "#000000"]
        );
 
        // 7. Extract map objects.
        const mapObjects = extractMapObjects(objectAsmContent);
 
        // 8. Update the combined state.
        setCurrentMapData({
          header: newHeader,
          tileMap: map,
          recoloredTileset,
          paletteId,
          mapObjects,
        });
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error in header/map loading chain:", error);
        }
      }
    })();
 
    return () => controller.abort();
  }, [selectedHeader, cachedConstants, cachedMappings, mapPointers, preloadedTilesets, tilesetConstants, paletteMode]);
 
  //
  // Helper: Given a header name and map pointers, compute the map ID.
  //
  function getMapIdFromHeader(headerName: string, pointers: string[]): number {
    const mapName = headerName.replace(".asm", "") + "_h";
    const index = pointers.findIndex((line) => line.includes(mapName));
    return index;
  }
 
  //
  // Draw the original tileset image (for preview).
  //
  useEffect(() => {
    const newImage = currentMapData?.header.actualBlockset + ".png" || "overworld.png";
    const preloadedImage = preloadedTilesets[newImage];
    if (!preloadedImage || !canvasRef.current) return;
    if (preloadedImage.complete) {
      drawTileset(preloadedImage);
    } else {
      preloadedImage.onload = () => drawTileset(preloadedImage);
    }
  }, [currentMapData, preloadedTilesets, drawTileset]);
 
  //
  // Draw the zoomed preview of a selected tile.
  //
  useEffect(() => {
    if (!selectedTile || !previewCanvasRef.current || !canvasRef.current) return;
    const previewCtx = previewCanvasRef.current.getContext("2d");
    if (!previewCtx) return;
    const sourceCanvas = canvasRef.current;
    previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
    previewCtx.imageSmoothingEnabled = false;
    previewCtx.drawImage(
      sourceCanvas,
      selectedTile.x * TILE_SIZE,
      selectedTile.y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0,
      TILE_SIZE * ZOOM_FACTOR,
      TILE_SIZE * ZOOM_FACTOR
    );
  }, [selectedTile]);
 
  //
  // Render the full static map onto a canvas.
  //
  useEffect(() => {
    if (!currentMapData || !mapCanvasRef.current) return;
    const canvas = mapCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { tileMap, recoloredTileset } = currentMapData;
    const rows = tileMap.length;
    const cols = tileMap[0]?.length || 0;
    // Set canvas size.
    canvas.width = cols * TILE_SIZE * DISPLAY_SCALE;
    canvas.height = rows * TILE_SIZE * DISPLAY_SCALE;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const tilesetCols = Math.floor(recoloredTileset.width / TILE_SIZE);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tileId = tileMap[y][x];
        const srcX = (tileId % tilesetCols) * TILE_SIZE;
        const srcY = Math.floor(tileId / tilesetCols) * TILE_SIZE;
        ctx.drawImage(
          recoloredTileset,
          srcX,
          srcY,
          TILE_SIZE,
          TILE_SIZE,
          x * TILE_SIZE * DISPLAY_SCALE,
          y * TILE_SIZE * DISPLAY_SCALE,
          TILE_SIZE * DISPLAY_SCALE,
          TILE_SIZE * DISPLAY_SCALE
        );
      }
    }
  }, [currentMapData, paletteMode]);
 
  //
  // EFFECT: Animate water tiles (only water) on an overlay canvas.
  //
  useEffect(() => {
    if (!currentMapData || !waterOverlayCanvasRef.current || !mapCanvasRef.current) {
      // On header change, clear remaining water overlay.
      if (waterOverlayCanvasRef.current) {
        const ctx = waterOverlayCanvasRef.current.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, waterOverlayCanvasRef.current.width, waterOverlayCanvasRef.current.height);
      }
      return;
    }
    // Check if the current tileset should animate water or water+flower.
    const tsId = tilesetConstants[currentMapData.header.tileset];
    if (tsId === undefined) return;
    const tilesetDef = TILESETS[tsId];
    if (tilesetDef.animation !== TileAnimation.WATER && tilesetDef.animation !== TileAnimation.WATER_FLOWER) {
      return; // no animation needed
    }
 
    // Find all water tile positions in the map.
    const waterPositions: { x: number; y: number }[] = [];
    for (let y = 0; y < currentMapData.tileMap.length; y++) {
      for (let x = 0; x < currentMapData.tileMap[y].length; x++) {
        if (currentMapData.tileMap[y][x] === WATER_TILE_ID) {
          waterPositions.push({ x, y });
        }
      }
    }
    
    // For WATER_FLOWER, also find all flower tile positions.
    let flowerPositions: { x: number; y: number }[] = [];
    if (tilesetDef.animation === TileAnimation.WATER_FLOWER) {
      for (let y = 0; y < currentMapData.tileMap.length; y++) {
        for (let x = 0; x < currentMapData.tileMap[y].length; x++) {
          if (currentMapData.tileMap[y][x] === FLOWER_TILE_ID) {
            flowerPositions.push({ x, y });
          }
        }
      }
    }
 
    // Prepare the water overlay canvas.
    const waterCanvas = waterOverlayCanvasRef.current;
    waterCanvas.width = mapCanvasRef.current.width;
    waterCanvas.height = mapCanvasRef.current.height;
    const waterCtx = waterCanvas.getContext("2d");
    if (!waterCtx) return;
    waterCtx.imageSmoothingEnabled = false;
 
    // Get water tile image data from the recolored tileset.
    const tilesetCtx = currentMapData.recoloredTileset.getContext("2d");
    if (!tilesetCtx) return;
    const waterTileX = (WATER_TILE_ID % TILES_PER_ROW) * TILE_SIZE;
    const waterTileY = Math.floor(WATER_TILE_ID / TILES_PER_ROW) * TILE_SIZE;
    let waterTileImageData = tilesetCtx.getImageData(waterTileX, waterTileY, TILE_SIZE, TILE_SIZE);
 
    const offscreenWaterCanvas = document.createElement("canvas");
    offscreenWaterCanvas.width = TILE_SIZE;
    offscreenWaterCanvas.height = TILE_SIZE;
    const offscreenCtx = offscreenWaterCanvas.getContext("2d");
    if (!offscreenCtx) return;
 
    // Counter for animation frames (for water and to drive flower cycles as well)
    let waterAnimCounter = 0;
 
    const intervalId = setInterval(() => {
      waterAnimCounter = (waterAnimCounter + 1) & 7;
      const direction: 'left' | 'right' = (waterAnimCounter & 4) !== 0 ? 'left' : 'right';
      // Animate water tile image data.
      const animateWaterTileImageData = (imgData: ImageData, dir: 'left' | 'right') => {
        const data = imgData.data;
        const width = imgData.width;
        const height = imgData.height;
        for (let row = 0; row < height; row++) {
          if (dir === 'left') {
            const start = row * width * 4;
            const firstPixel = data.slice(start, start + 4);
            for (let col = 0; col < width - 1; col++) {
              const src = start + (col + 1) * 4;
              const dest = start + col * 4;
              data[dest] = data[src];
              data[dest + 1] = data[src + 1];
              data[dest + 2] = data[src + 2];
              data[dest + 3] = data[src + 3];
            }
            const lastStart = start + (width - 1) * 4;
            data[lastStart] = firstPixel[0];
            data[lastStart + 1] = firstPixel[1];
            data[lastStart + 2] = firstPixel[2];
            data[lastStart + 3] = firstPixel[3];
          } else {
            const start = row * width * 4;
            const lastPixel = data.slice(start + (width - 1) * 4, start + width * 4);
            for (let col = width - 1; col > 0; col--) {
              const src = start + (col - 1) * 4;
              const dest = start + col * 4;
              data[dest] = data[src];
              data[dest + 1] = data[src + 1];
              data[dest + 2] = data[src + 2];
              data[dest + 3] = data[src + 3];
            }
            data[start] = lastPixel[0];
            data[start + 1] = lastPixel[1];
            data[start + 2] = lastPixel[2];
            data[start + 3] = lastPixel[3];
          }
        }
      };
 
      animateWaterTileImageData(waterTileImageData, direction);
      offscreenCtx.putImageData(waterTileImageData, 0, 0);
      waterCtx.clearRect(0, 0, waterCanvas.width, waterCanvas.height);
 
      // Draw animated water tiles.
      waterPositions.forEach((pos) => {
        waterCtx.drawImage(
          offscreenWaterCanvas,
          0,
          0,
          TILE_SIZE,
          TILE_SIZE,
          pos.x * TILE_SIZE * DISPLAY_SCALE,
          pos.y * TILE_SIZE * DISPLAY_SCALE,
          TILE_SIZE * DISPLAY_SCALE,
          TILE_SIZE * DISPLAY_SCALE
        );
      });
 
      // If using WATER_FLOWER, also update the flower tiles.
      if (tilesetDef.animation === TileAnimation.WATER_FLOWER) {
        const modFlower = waterAnimCounter & 3;
        let flowerKey: string;
        if (modFlower < 2) {
          flowerKey = "flower/flower1.png";
        } else if (modFlower === 2) {
          flowerKey = "flower/flower2.png";
        } else {
          flowerKey = "flower/flower3.png";
        }
        const flowerImage = recoloredFlowers[flowerKey];
        if (flowerImage) {
          flowerPositions.forEach((pos) => {
            waterCtx.drawImage(
              flowerImage,
              0,
              0,
              TILE_SIZE,
              TILE_SIZE,
              pos.x * TILE_SIZE * DISPLAY_SCALE,
              pos.y * TILE_SIZE * DISPLAY_SCALE,
              TILE_SIZE * DISPLAY_SCALE,
              TILE_SIZE * DISPLAY_SCALE
            );
          });
        }
      }
    }, WATER_ANIMATION_DELAY);
 
    return () => {
      clearInterval(intervalId);
      if (waterOverlayCanvasRef.current) {
        const ctx = waterOverlayCanvasRef.current.getContext("2d");
        if (ctx)
          ctx.clearRect(
            0,
            0,
            waterOverlayCanvasRef.current.width,
            waterOverlayCanvasRef.current.height
          );
      }
    };
  }, [currentMapData, tilesetConstants, preloadedTilesets, recoloredFlowers]);
 
  //
  // NEW: Effect to draw warp event markers on an overlay canvas.
  //
  useEffect(() => {
    if (!currentMapData || !currentMapData.mapObjects || !eventOverlayCanvasRef.current || !mapCanvasRef.current) {
      return;
    }
    const canvas = eventOverlayCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Match the overlays' size to the map canvas.
    canvas.width = mapCanvasRef.current.width;
    canvas.height = mapCanvasRef.current.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "red";
    currentMapData.mapObjects.warp_events
      .filter(warp => !warp.isDebug) // Filter out debug warps
      .forEach((warp) => {
        const displayX = warp.x * BLOCK_SIZE * DISPLAY_SCALE;
        const displayY = warp.y * BLOCK_SIZE * DISPLAY_SCALE;
        // Center the "W" inside the 16x16 block.
        ctx.fillText("W", displayX + (BLOCK_SIZE * DISPLAY_SCALE)/2, displayY + (BLOCK_SIZE * DISPLAY_SCALE)/2);
    });
  }, [currentMapData]);
 
  //
  // NEW: Handle clicks on the event overlay canvas.
  //
  const handleEventOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentMapData || !currentMapData.mapObjects) return;
    const rect = eventOverlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const tileWidth = BLOCK_SIZE * DISPLAY_SCALE;
    const tileX = Math.floor(clickX / tileWidth);
    const tileY = Math.floor(clickY / tileWidth);
    const warpEvent = currentMapData.mapObjects.warp_events
      .find(event => !event.isDebug && event.x === tileX && event.y === tileY);
    
    if (warpEvent) {
      // Special handling for LAST_MAP
      if (warpEvent.targetMap === "LAST_MAP") {
        handleMapChange(lastValidMap);
        return;
      }

      // Convert ROUTE_18_GATE_1F to Route18Gate1F.asm
      const targetHeader = warpEvent.targetMap
        .split('_')
        .map((word) => {
          // Keep 1F, 2F, B1F, B2F, etc. uppercase at the end
          if (word.match(/^[B]?[0-9]+F$/)) {
            return word;
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('') + '.asm';

      // Find the matching header, ignoring case
      const matchingHeader = AVAILABLE_HEADERS.find(header => 
        header.toLowerCase() === targetHeader.toLowerCase()
      );

      if (matchingHeader) {
        handleMapChange(matchingHeader);
      } else {
        console.warn(`Target map ${targetHeader} not found in available headers`);
      }
    }
  };
 
  //
  // Update URL whenever selectedHeader or paletteMode changes
  //
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('header', selectedHeader);
    params.set('paletteMode', paletteMode);
    navigate({ search: params.toString() }, { replace: true });
  }, [selectedHeader, paletteMode, navigate]);
 
  //
  // Recoloring the Flowers:
  //
  useEffect(() => {
    if (!currentMapData) return;
    const flowerKeys = ["flower/flower1.png", "flower/flower2.png", "flower/flower3.png"];
    const newCache: Record<string, HTMLCanvasElement> = {};
    const currentPalette = palettes[currentMapData.paletteId];
    flowerKeys.forEach((key) => {
      const rawImg = preloadedTilesets[key];
      if (rawImg) {
        newCache[key] = recolorTileset(
          rawImg,
          currentPalette,
          paletteMode,
          ["#ffffff", "#aaaaaa", "#555555", "#000000"]
        );
      }
    });
    setRecoloredFlowers(newCache);
  }, [currentMapData, paletteMode, preloadedTilesets]);
 
  // Modify this effect to handle scrolling when the map changes
  useEffect(() => {
    if (currentMapData) {
      // Reset window scroll
      window.scrollTo(0, 0);

      // Reset map canvas position
      if (mapCanvasRef.current) {
        mapCanvasRef.current.style.transform = 'translate(0, 0)';
      }
      if (waterOverlayCanvasRef.current) {
        waterOverlayCanvasRef.current.style.transform = 'translate(0, 0)';
      }
      if (eventOverlayCanvasRef.current) {
        eventOverlayCanvasRef.current.style.transform = 'translate(0, 0)';
      }

      // Find the map-display container and ensure it's visible
      const mapDisplay = document.querySelector('.map-display');
      if (mapDisplay) {
        mapDisplay.scrollTo(0, 0);
      }
    }
  }, [currentMapData]);
 
  //
  // Render the component.
  //
  return (
    <div className="app-container">
      <div className="image-selector">
        <div className="selector-group">
          <label htmlFor="header-select">Choose a header:</label>
          <select
            id="header-select"
            value={selectedHeader}
            onChange={(e) => handleMapChange(e.target.value)}
          >
            {AVAILABLE_HEADERS.map((filename) => (
              <option key={filename} value={filename}>
                {filename}
              </option>
            ))}
          </select>
        </div>
        <div className="selector-group">
          <label htmlFor="palette-mode-select">Palette Mode:</label>
          <select
            id="palette-mode-select"
            value={paletteMode}
            onChange={(e) => setPaletteMode(e.target.value as 'cgb' | 'sgb')}
          >
            <option value="cgb">Color Game Boy</option>
            <option value="sgb">Super Game Boy</option>
          </select>
        </div>
        {currentMapData && (
          <div className="map-info" style={{ textAlign: "left" }}>
            <p>Map Name: {currentMapData.header.name}</p>
            <p>Map ID: {getMapIdFromHeader(selectedHeader, mapPointers)}</p>
            <p>Size Constant: {currentMapData.header.sizeConst}</p>
            <p>
              Tileset Animation: {TILESETS[tilesetConstants[currentMapData.header.tileset] || 0].animation}
            </p>
            <p>
              Tileset ID: {tilesetConstants[currentMapData.header.tileset] || 0}
            </p>
            <p>
              Tileset: {currentMapData.header.tileset} → {currentMapData.header.actualBlockset}
            </p>
            <p>Palette ID: {currentMapData.paletteId}</p>
            {currentMapData.header.width !== undefined &&
              currentMapData.header.height !== undefined && (
                <p>
                  Size: {currentMapData.header.width}x{currentMapData.header.height} tiles
                </p>
            )}
            <p>Required Files:</p>
            <ul className="required-files" style={{ textAlign: "left" }}>
              <li>maps/{currentMapData.header.name}.blk</li>
              <li>gfx/blocksets/{currentMapData.header.actualBlockset}.bst</li>
              <li>gfx/tilesets/{currentMapData.header.actualBlockset}.png</li>
            </ul>
            {false && currentMapData?.mapObjects && (
              <>
                <p>Map Objects:</p>
                <pre>{JSON.stringify(currentMapData?.mapObjects, null, 2)}</pre>
              </>
            )}
          </div>
        )}
      </div>
 
      <div className="main-view" style={{ display: "flex", flexDirection: "column" }}>
        <div className="tileset-display">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ cursor: "crosshair", border: "1px solid #000" }}
          />
        </div>
 
        <div className="map-display" style={{ position: "relative", border: "1px solid #000" }}>
          {/* The static map canvas */}
          <canvas ref={mapCanvasRef} />
          {/* The water overlay canvas (positioned absolutely on top) */}
          <canvas
            ref={waterOverlayCanvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              padding: "0px",
              pointerEvents: "none"
            }}
          />
          {/* The event overlay canvas (for clickable 'W' markers) */}
          <canvas
            ref={eventOverlayCanvasRef}
            onClick={handleEventOverlayClick}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              padding: "0px",
              zIndex: 2
            }}
          />
        </div>
 
        <div className="preview-palette-container">
          <div className="tile-preview">
            {selectedTile && (
              <>
                <canvas
                  ref={previewCanvasRef}
                  width={TILE_SIZE * ZOOM_FACTOR}
                  height={TILE_SIZE * ZOOM_FACTOR}
                  style={{ border: "1px solid #000" }}
                />
                <p>
                  Tile Coordinates: ({selectedTile.x}, {selectedTile.y})
                </p>
              </>
            )}
          </div>
 
          {currentMapData && (
            <PaletteDisplay paletteId={currentMapData.paletteId} paletteMode={paletteMode} />
          )}
        </div>
      </div>
    </div>
  );
}
 
export default App;
