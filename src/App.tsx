/* App.tsx */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./App.css";
import { loadAndAssembleMap, getBlocksetVisual } from "./blockset";
import { usePreloadedTilesets } from "./hooks/usePreloadedTilesets";
import { getPaletteId } from "./palettes/getPalletteId";
import { palettes } from "./palettes/palettes";
import { recolorTileset } from "./palettes/useRecoloredTileset";
import { TILESETS, TileAnimation } from "./tile/tileset-constants";
import { AVAILABLE_HEADERS, TILESET_FILES } from "./constants/const";
import {
  BgEvent,
  extractMapObjects,
  StaticDirection,
  WalkingDirection,
  ObjectEvent,
  WarpEvent,
  MovementMode,
} from "./mapObjects/extractMapObjects";
import { processSprite } from "./sprites/processSprite";
import { PaletteDisplay } from "./palettes/PaletteDisplay";
import { parseCollisionTiles } from "./collision/collisionTiles";
import { BlockDisplay } from "./tile/blocksetDisplay";
import { isSquareWalkable } from "./collision/walkability";
import {
  TILE_SIZE,
  BLOCK_SIZE,
  ZOOM_FACTOR,
  DISPLAY_SCALE,
  WATER_TILE_ID,
  FLOWER_TILE_ID,
  TILES_PER_ROW,
  WATER_ANIMATION_DELAY,
  SPRITE_ANIMATION_DELAY,
  INTERACTIVE_ELEMENT_CURSOR,
} from "./constants";
import { getSpriteFrame, SpriteType } from "./sprites/spriteHelper";
import { usePreloadedSprites } from "./hooks/usePreloadedSprites";
import {
  ExtractedText,
  extractScriptTextPointers,
  ScriptTextData,
} from "./text/extractScriptTextPointers";
import { extractTextFromASM } from "./text/extractText";
import { linkTextPointerToText } from "./text/linkTextPointerToText";
import { MapHeader } from "./headerExtract/extractHeader";
import { extractHeader } from "./headerExtract/extractHeader";
//
// Interfaces
//

interface MapObjectData {
  warp_events: WarpEvent[];
  bg_events: BgEvent[];
  object_events: ObjectEvent[];
}

// At the top of App.tsx (or in a helper file)
interface MovingState {
  currentX: number;
  currentY: number;
  initialX: number;
  initialY: number;
  targetX: number;
  targetY: number;
  facing: StaticDirection;
  movementType: WalkingDirection | StaticDirection;
  movementMode: MovementMode;
  waitTime: number;
  justMoved: boolean;
  spriteWalkingCounter: number;
  spriteType: SpriteType;
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

const DEBUG = false;
//
// Main App Component
//
function App() {
  // -- State and selections --
  const [selectedTile, setSelectedTile] = useState<TileCoordinates | null>(
    null
  );
  const [paletteMode, setPaletteMode] = useState<"cgb" | "sgb">("cgb");

  // Get the current location object
  const location = useLocation();
  // Get the navigate function for updating the URL
  const navigate = useNavigate();

  // Read initial values from URL search parameters, provide default values.
  const [selectedHeader, setSelectedHeader] = useState<string>(
    new URLSearchParams(location.search).get("header") || "PalletTown.asm"
  );
  const [currentMapData, setCurrentMapData] = useState<CurrentMapData | null>(
    null
  );

  // Preload tileset images.
  const preloadedTilesets = usePreloadedTilesets(TILESET_FILES, paletteMode);

  // Preload blockset visual.
  const [blocksetVisual, setBlocksetVisual] = useState<number[][][] | null>(
    null
  );
  // ts-ignore
  const [_movingStates, setMovingStates] = useState<
    Record<number, MovingState>
  >({});

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
  //walkabilityCanvasRef shows the walkability of the map.// Refs for canvases:
  const collisionOverlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const spriteMetaCacheRef = useRef<Map<string, SpriteType>>(new Map());

  const linkedTextRef = useRef<ScriptTextData>({});

  // Cached startup data.
  const [cachedConstants, setCachedConstants] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [cachedMappings, setCachedMappings] = useState<Record<string, string>>(
    {}
  );
  const [mapPointers, setMapPointers] = useState<string[]>([]);
  const [tilesetConstants, setTilesetConstants] = useState<
    Record<string, number>
  >({});

  // Add new state and useEffect for recolored flower images:
  const [recoloredFlowers, setRecoloredFlowers] = useState<
    Record<string, HTMLCanvasElement>
  >({});

  // Add state for last map (defaulting to PalletTown.asm)
  const [lastValidMap, setLastValidMap] = useState<string>("PalletTown.asm");

  const {
    sprites: preloadedSprites,
    spriteMeta,
    loading: spritesLoading,
  } = usePreloadedSprites();

  // Create a cache ref for processed sprite canvases.
  const spriteCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const collisionTiles = parseCollisionTiles();
  // console.log(collisionTiles);

  // Add new state for text display
  const [displayText, setDisplayText] = useState<string | null>(null);

  // Add these state variables near the top of the component with other state declarations
  const [mapCanvasWidth, setMapCanvasWidth] = useState(0);
  const [mapCanvasHeight, setMapCanvasHeight] = useState(0);
  const [needsHorizontalScroll, setNeedsHorizontalScroll] = useState(false);

  // Add new state for animation delays and settings panel
  const [waterAnimationDelay, setWaterAnimationDelay] = useState(WATER_ANIMATION_DELAY);
  const [spriteAnimationDelay, setSpriteAnimationDelay] = useState(SPRITE_ANIMATION_DELAY);
  const [showSettings, setShowSettings] = useState(false);

  // Update lastValidMap whenever we successfully change maps
  useEffect(() => {
    if (
      selectedHeader &&
      selectedHeader !== "LAST_MAP" &&
      selectedHeader !== lastValidMap
    ) {
      const previousMap = lastValidMap;
      setLastValidMap(previousMap);
    }
  }, [selectedHeader, lastValidMap]);

  // Handle window resize to recalculate scroll needs
  useEffect(() => {
    const handleResize = () => {
      if (currentMapData) {
        const connectionPanelWidth = BLOCK_SIZE * DISPLAY_SCALE;
        const hasWestConnection = currentMapData.header.connections.some(conn => conn.direction === "west");
        const hasEastConnection = currentMapData.header.connections.some(conn => conn.direction === "east");
        const totalWidth = mapCanvasWidth + 
          (hasWestConnection ? connectionPanelWidth : 0) + 
          (hasEastConnection ? connectionPanelWidth : 0);
        
        const viewportWidth = window.innerWidth - 64;
        setNeedsHorizontalScroll(totalWidth > viewportWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentMapData, mapCanvasWidth]);

  // Update lastValidMap before changing maps
  const handleMapChange = (newMap: string) => {
    // Only update lastValidMap if current map is outdoor (ID <= 0x24)
    const currentMapId = getMapIdFromHeader(selectedHeader, mapPointers);
    if (
      newMap !== "LAST_MAP" &&
      newMap !== selectedHeader &&
      currentMapId <= 0x24
    ) {
      setLastValidMap(selectedHeader);
    }
    setSelectedHeader(newMap);
  };

  //
  // Helper: Draw grid overlay on a canvas.
  //
  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
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
    },
    []
  );

  //
  // Draw the original (left) tileset image with grid.
  //
  const drawTileset = useCallback(
    (img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      drawGrid(ctx, img.naturalWidth, img.naturalHeight);
    },
    [drawGrid]
  );

  //
  // Handle clicks on the tileset preview.
  //
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const tileX = Math.floor(x / TILE_SIZE);
      const tileY = Math.floor(y / TILE_SIZE);
      setSelectedTile({ x: tileX, y: tileY });
    },
    []
  );

  //
  // Load cached constants and mappings (only once)
  //
  useEffect(() => {
    if (
      Object.keys(cachedConstants).length &&
      Object.keys(cachedMappings).length
    )
      return;
    const controller = new AbortController();
    (async function fetchConstantsAndMappings() {
      try {
        const [constRes, mappingRes] = await Promise.all([
          fetch(`/pokemon-tileset/pkassets/constants/map_constants.asm`, {
            signal: controller.signal,
          }),
          fetch(`/pokemon-tileset/pkassets/gfx/tilesets.asm`, {
            signal: controller.signal,
          }),
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
        
        // Keep track of GFX names we've found in consecutive lines
        let currentGfxNames: string[] = [];
        
        // This will store the reverse mapping: blockset -> array of tileset names
        const blocksetToTilesets: Record<string, string[]> = {};
        
        for (let i = 0; i < mappingLines.length; i++) {
          const line = mappingLines[i].trim();
          
          // Check if this line has a GFX definition
          const gfxMatch = line.match(/(\w+)_GFX::/);
          
          if (gfxMatch) {
            // Store this GFX name
            currentGfxNames.push(gfxMatch[1].toUpperCase());
            
            // If this line also contains the blockset inclusion, map all current GFX names and reset
            if (line.includes('INCBIN "gfx/blocksets/')) {
              const blocksetMatch = line.match(/INCBIN\s+"gfx\/blocksets\/(\w+)\.bst"/);
              if (blocksetMatch) {
                const blocksetName = blocksetMatch[1];
                currentGfxNames.forEach(gfxName => {
                  mappings[gfxName] = blocksetName;
                  
                  // Update the reverse mapping
                  if (!blocksetToTilesets[blocksetName]) {
                    blocksetToTilesets[blocksetName] = [];
                  }
                  blocksetToTilesets[blocksetName].push(gfxName);
                });
                currentGfxNames = [];
              }
            }
          } 
          // If this isn't a GFX line but includes a blockset inclusion
          else if (line.includes('INCBIN "gfx/blocksets/')) {
            const blocksetMatch = line.match(/INCBIN\s+"gfx\/blocksets\/(\w+)\.bst"/);
            if (blocksetMatch && currentGfxNames.length > 0) {
              // Map all pending GFX names to this blockset
              const blocksetName = blocksetMatch[1];
              currentGfxNames.forEach(gfxName => {
                mappings[gfxName] = blocksetName;
                
                // Update the reverse mapping
                if (!blocksetToTilesets[blocksetName]) {
                  blocksetToTilesets[blocksetName] = [];
                }
                blocksetToTilesets[blocksetName].push(gfxName);
              });
              currentGfxNames = [];
            }
          }
          // If we find a non-GFX, non-blockset line after collecting GFX names, reset
          else if (!line.endsWith('_Block::') && currentGfxNames.length > 0 && line !== '') {
            currentGfxNames = [];
          }
        }
        
        // Store the reverse mapping as a property of the mappings object
        (mappings as any).__blocksetToTilesets = blocksetToTilesets;
        
        console.log('Generated mappings:', mappings);
        console.log('Reverse mappings:', blocksetToTilesets);
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
        const response = await fetch(
          "/pokemon-tileset/pkassets/data/maps/map_header_pointers.asm"
        );
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
        const response = await fetch(
          "/pokemon-tileset/pkassets/constants/tileset_constants.asm"
        );
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
  // Main function for loading a new map.
  //
  const headerRequestIdRef = useRef(0);
  useEffect(() => {
    console.log("headerRequestIdRef", headerRequestIdRef.current);
    console.log("Pokemon Tileset Version 0.01f");
    if (
      !Object.keys(cachedConstants).length ||
      !Object.keys(cachedMappings).length ||
      mapPointers.length === 0 ||
      Object.keys(preloadedTilesets).length === 0 ||
      Object.keys(tilesetConstants).length === 0 ||
      spritesLoading
    )
      return;

    headerRequestIdRef.current++;
    const currentRequestId = headerRequestIdRef.current;
    const controller = new AbortController();

    (async function loadMapChain() {
      try {
        // 1. Fetch and parse the header file.
        const headerResponse = await fetch(
          `/pokemon-tileset/pkassets/data/maps/headers/${selectedHeader}`,
          { signal: controller.signal }
        );
        if (!headerResponse.ok)
          throw new Error(`HTTP error! Status: ${headerResponse.status}`);
        const headerText = await headerResponse.text();
        if (currentRequestId !== headerRequestIdRef.current) return;

        const newHeader = extractHeader(
          headerText,
          cachedConstants,
          cachedMappings
        );
        console.log("newHeader", newHeader);
        console.log("cachedConstants", cachedConstants);
        console.log("cachedMappings", cachedMappings);
        // 2. Determine file names.
        const newSelectedMap = `${newHeader.name}.blk`;
        const newSelectedBlockset = `${newHeader.actualBlockset}.bst`;
        const newSelectedImage = `${newHeader.actualBlockset}.png`;
        const newSelectedObjectFile = `${newHeader.name}.asm`;

        console.log("Loading assets:", {
          map: newSelectedMap,
          blockset: newSelectedBlockset,
          image: newSelectedImage
        });

        // 3. Ensure the new tileset image is preloaded.
        const originalTileset = preloadedTilesets[newSelectedImage];
        if (!originalTileset)
          throw new Error(`Tileset image ${newSelectedImage} not loaded. Available images: ${Object.keys(preloadedTilesets).join(", ")}`);

        // 4. Fetch the map and blockset files concurrently.
        const [
          blkResponse,
          bstResponse,
          objResponse,
          scriptResponse,
          script2Response,
          script3Response,
          textResponse,
        ] = await Promise.all([
          fetch(`/pokemon-tileset/pkassets/maps/${newSelectedMap}`, {
            signal: controller.signal,
          }),
          fetch(`/pokemon-tileset/pkassets/blocksets/${newSelectedBlockset}`, {
            signal: controller.signal,
          }),
          fetch(
            `/pokemon-tileset/pkassets/data/maps/objects/${newSelectedObjectFile}`,
            { signal: controller.signal }
          ),
          fetch(`/pokemon-tileset/pkassets/scripts/${newHeader.name}.asm`).then(
            (r) => r.text()
          ),
          // Try to fetch _2 file, return null if it doesn't exist
          fetch(`/pokemon-tileset/pkassets/scripts/${newHeader.name}_2.asm`)
            .then((r) => r.text())
            .catch(() => null),
          // Try to fetch _3 file, return null if it doesn't exist
          fetch(`/pokemon-tileset/pkassets/scripts/${newHeader.name}_3.asm`)
            .then((r) => r.text())
            .catch(() => null),
          fetch(`/pokemon-tileset/pkassets/text/${newHeader.name}.asm`).then(
            (r) => r.text()
          ),
        ]);
        if (!blkResponse.ok || !bstResponse.ok || !objResponse.ok)
          throw new Error("Error loading map, blockset, or object file");
        // load text
        // Combine script content if _2 file exists
        const fullScriptText = [
          scriptResponse,
          script2Response,
          script3Response,
        ]
          .filter(Boolean) // Remove null values
          .join("\n");

        // Process text data
        const scriptPointers = extractScriptTextPointers(fullScriptText);
        const extractedText = extractTextFromASM(textResponse);
        const linkedText = linkTextPointerToText(scriptPointers, extractedText);
        linkedTextRef.current = linkedText;

        //
        const blkData = new Uint8Array(await blkResponse.arrayBuffer());
        const blocksetData = new Uint8Array(await bstResponse.arrayBuffer());

        const visual = getBlocksetVisual(blocksetData);
        setBlocksetVisual(visual);

        const objectAsmContent = await objResponse.text();
        const map = loadAndAssembleMap(
          blkData,
          blocksetData,
          newHeader.width || 0,
          newHeader.height || 0
        );

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

        // 9. Load sprites and process their metadata.
        // 9. Instead of fetching sprites here, use the preloaded sprites:
        const spriteLoadPromises: Promise<void>[] = [];
        // Collect sprite movement types from object events.
        const spriteMovementTypes = new Map<string, boolean>();
        mapObjects.object_events.forEach((obj) => {
          const spriteKey = obj.sprite; // e.g. "SPRITE_YOUNGSTER"
          spriteMovementTypes.set(
            spriteKey,
            spriteMovementTypes.get(spriteKey) || obj.movement === "WALK"
          );
        });

        // For each sprite required in the map:
        for (const [spriteKey, needsWalking] of spriteMovementTypes) {
          const baseImg = preloadedSprites[spriteKey];
          if (!baseImg) {
            console.warn(
              `Sprite image for ${spriteKey} not found in preloaded sprites.`
            );
            continue;
          }
          // Use the already computed sprite type if needed:
          const spriteTypeForSprite = spriteMeta[spriteKey] || "none";
          // Optionally update spriteMetaCacheRef here if you want a central ref:
          spriteMetaCacheRef.current.set(spriteKey, spriteTypeForSprite);

          // Process the sprite for each direction.
          const directions: ("UP" | "DOWN" | "LEFT" | "RIGHT")[] = [
            "UP",
            "DOWN",
            "LEFT",
            "RIGHT",
          ];
          directions.forEach((direction) => {
            const processed = processSprite(
              baseImg,
              palettes[paletteId],
              paletteMode,
              direction,
              false
            );
            const key = `${spriteKey}_${direction}`;
            spriteCacheRef.current.set(key, processed);
            if (needsWalking) {
              const processedWalk = processSprite(
                baseImg,
                palettes[paletteId],
                paletteMode,
                direction,
                true
              );
              const keyWalk = `${spriteKey}_${direction}_walk`;
              spriteCacheRef.current.set(keyWalk, processedWalk);
            }
          });
        }

        // Wait for all (if any additional processing is asynchronous).
        await Promise.all(spriteLoadPromises);

        // 10. Create moving states using the fully loaded sprite metadata.
        const newMovingStates: Record<number, MovingState> = {};
        if (mapObjects.object_events) {
          mapObjects.object_events.forEach((obj, idx) => {
            let spriteTypeForMovingState: SpriteType = "none";
            try {
              spriteTypeForMovingState =
                spriteMetaCacheRef.current.get(obj.sprite) || "none";
              // console.log('spriteType', spriteTypeForMovingState, 'for', obj.sprite);
              if (!spriteMetaCacheRef.current.get(obj.sprite)) {
                // console.log(`Sprite type not found for key: ${obj.sprite}`);
                spriteTypeForMovingState = "none" as SpriteType;
              }
              newMovingStates[idx] = {
                currentX: obj.x * BLOCK_SIZE,
                currentY: obj.y * BLOCK_SIZE,
                targetX: obj.x * BLOCK_SIZE,
                targetY: obj.y * BLOCK_SIZE,
                initialX: obj.x * BLOCK_SIZE,
                initialY: obj.y * BLOCK_SIZE,
                facing: obj.direction === "LEFT_RIGHT" ? "RIGHT" : "DOWN",
                movementMode: obj.movement === "WALK" ? "WALK" : "STAY",
                movementType: obj.direction,
                waitTime: 0,
                justMoved: false,
                spriteWalkingCounter: 0,
                spriteType: spriteTypeForMovingState,
              };
            } catch (error) {
              console.error("Error in object event processing:", error);
            }
          });
        }
        setMovingStates(newMovingStates);

        // 11. Display text
        setDisplayText("");

        // 12. Fit the map to the screen
        // Somewhere in your component, after currentMapData is loaded:
        const newWidth = map[0].length * TILE_SIZE * DISPLAY_SCALE;
        const newHeight = map.length * TILE_SIZE * DISPLAY_SCALE;
        setMapCanvasWidth(newWidth);
        setMapCanvasHeight(newHeight);
        
        // Calculate if we need horizontal scrolling
        const connectionPanelWidth = BLOCK_SIZE * DISPLAY_SCALE; // 32px
        const hasWestConnection = newHeader.connections.some(conn => conn.direction === "west");
        const hasEastConnection = newHeader.connections.some(conn => conn.direction === "east");
        const totalWidth = newWidth + 
          (hasWestConnection ? connectionPanelWidth : 0) + 
          (hasEastConnection ? connectionPanelWidth : 0);
        
        // Check if content fits within viewport (accounting for padding)
        const viewportWidth = window.innerWidth - 64; // Subtract padding
        setNeedsHorizontalScroll(totalWidth > viewportWidth);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error in header/map loading chain:", error);
        }
      }
    })();

    return () => controller.abort();
  }, [
    selectedHeader,
    cachedConstants,
    cachedMappings,
    mapPointers,
    preloadedTilesets,
    tilesetConstants,
    paletteMode,
    spritesLoading,
  ]);

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
    const newImage =
      currentMapData?.header.actualBlockset + ".png" || "overworld.png";
    const preloadedImage = preloadedTilesets[newImage];
    if (!preloadedImage || !canvasRef.current) return;
    if (preloadedImage.complete) {
      drawTileset(preloadedImage);
    } else {
      preloadedImage.onload = () => drawTileset(preloadedImage);
    }
  }, [currentMapData, preloadedTilesets, drawTileset]);

  const drawMovingSprites = useCallback(
    (currentMovingStates: Record<number, MovingState>) => {
      if (
        !currentMapData ||
        !currentMapData.mapObjects ||
        !eventOverlayCanvasRef.current ||
        !mapCanvasRef.current
      )
        return;

      const canvas = eventOverlayCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Make sure the overlay canvas matches the map canvas.
      canvas.width = mapCanvasRef.current.width;
      canvas.height = mapCanvasRef.current.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw warp events (unchanged)
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "red";
      ctx.imageSmoothingEnabled = false;
      currentMapData.mapObjects.warp_events
        .filter((warp) => !warp.isDebug)
        .forEach((warp) => {
          const displayX = warp.x * BLOCK_SIZE * DISPLAY_SCALE;
          const displayY = warp.y * BLOCK_SIZE * DISPLAY_SCALE;
          ctx.fillText(
            "W",
            displayX + (BLOCK_SIZE * DISPLAY_SCALE) / 2,
            displayY + (BLOCK_SIZE * DISPLAY_SCALE) / 2
          );
        });

      // Draw object events (using walking/static alternation)
      currentMapData.mapObjects.object_events.forEach((obj, idx) => {
        let posX: number, posY: number;
        let facing: StaticDirection;
        let spriteFrameType: "static" | "walking" = "static";

        if (obj.movement === "WALK") {
          const state = currentMovingStates[idx];
          if (state) {
            posX = state.currentX;
            posY = state.currentY;
            facing = state.facing;
            spriteFrameType = getSpriteFrame(state.spriteWalkingCounter);
          } else {
            posX = obj.x * BLOCK_SIZE;
            posY = obj.y * BLOCK_SIZE;
            facing = obj.direction === "LEFT_RIGHT" ? "RIGHT" : "DOWN";
          }
        }
        // check if obj.
        else if (
          obj.movement === "STAY" &&
          obj.direction === "NONE" &&
          (currentMovingStates[idx].spriteType || "none") !== "none"
        ) {
          // console.log('staying still', obj);
          const state = currentMovingStates[idx];
          // console.log('state', state);
          // posX = obj.x * BLOCK_SIZE;
          // posY = obj.y * BLOCK_SIZE;
          posX = state.currentX;
          posY = state.currentY;
          facing = state.facing;
        } else {
          posX = obj.x * BLOCK_SIZE;
          posY = obj.y * BLOCK_SIZE;
          facing =
            obj.direction === "NONE"
              ? "DOWN"
              : (obj.direction as StaticDirection);
        }

        // Build the cache key.
        let cacheKey = `${obj.sprite}_${facing}`;
        if (obj.movement === "WALK" && spriteFrameType === "walking") {
          cacheKey += "_walk";
        }

        // Retrieve the sprite from the cache...
        const cachedSpriteKey = Array.from(spriteCacheRef.current.keys()).find(
          (key) => key.toLowerCase() === cacheKey.toLowerCase()
        );
        const cachedSprite = cachedSpriteKey
          ? spriteCacheRef.current.get(cachedSpriteKey)
          : undefined;
        if (cachedSprite) {
          ctx.drawImage(
            cachedSprite,
            0,
            0,
            16,
            16,
            posX * DISPLAY_SCALE,
            posY * DISPLAY_SCALE,
            16 * DISPLAY_SCALE,
            16 * DISPLAY_SCALE
          );
        }
      });
    },
    [currentMapData, paletteMode]
  );

  useEffect(() => {
    if (
      !currentMapData ||
      !currentMapData.mapObjects ||
      !eventOverlayCanvasRef.current ||
      !mapCanvasRef.current
    )
      return;

    // Returns a wait time of 16, 32, or 48 frames.
    const getRandomWaitTime = () => {
      const choices = [BLOCK_SIZE, BLOCK_SIZE * 2, BLOCK_SIZE * 3];
      return choices[Math.floor(Math.random() * choices.length)];
    };

    // A forced wait period always lasts one block (16 frames).
    const forcedWaitTime = BLOCK_SIZE;

    let lastFrameTime = 0;
    let animationFrameId: number;

    function animate(timestamp: number) {
      if (!currentMapData) return;
      // Control animation speed using timestamp
      if (timestamp - lastFrameTime >= spriteAnimationDelay) {
        setMovingStates((prev) => {
          const newStates = { ...prev };

          // Loop through each moving state
          Object.keys(newStates).forEach((keyStr) => {
            const key = Number(keyStr);
            const state = newStates[key];

            // Get the corresponding base object from the map's object events.
            const baseObj = currentMapData.mapObjects?.object_events[key];
            if (!baseObj) return;

            // 1. If we're in waiting mode, decrement the wait counter.
            if (state.waitTime > 0) {
              state.waitTime--;
              return;
            }

            // 2. If we're still moving (haven't reached the target), move one pixel.
            if (
              state.currentX !== state.targetX ||
              state.currentY !== state.targetY
            ) {
              state.spriteWalkingCounter++;
              if (state.currentX < state.targetX) state.currentX++;
              else if (state.currentX > state.targetX) state.currentX--;
              if (state.currentY < state.targetY) state.currentY++;
              else if (state.currentY > state.targetY) state.currentY--;
              return;
            }

            // 3. If the sprite just finished moving, force a wait period.
            if (state.justMoved) {
              state.spriteWalkingCounter = 0;
              state.waitTime = forcedWaitTime;
              state.justMoved = false;
              return;
            }

            // 4. Now choose a new action based on movement type.
            if (baseObj.movement === "WALK") {
              // For WALK objects, use the existing options.
              type Option =
                | {
                    type: "move";
                    dx: number;
                    dy: number;
                    facing: StaticDirection;
                  }
                | { type: "wait"; waitTime: number };

              const allOptions: Option[] = [
                { type: "move", dx: BLOCK_SIZE, dy: 0, facing: "RIGHT" },
                { type: "move", dx: -BLOCK_SIZE, dy: 0, facing: "LEFT" },
                { type: "move", dx: 0, dy: BLOCK_SIZE, facing: "DOWN" },
                { type: "move", dx: 0, dy: -BLOCK_SIZE, facing: "UP" },
                { type: "wait", waitTime: getRandomWaitTime() },
              ];

              // First filter options by movementType.
              const optionsByType = allOptions.filter((option) => {
                if (option.type === "wait") return true;
                if (state.movementType === "UP_DOWN" && option.dx !== 0)
                  return false;
                if (state.movementType === "LEFT_RIGHT" && option.dy !== 0)
                  return false;
                return true;
              });

              // Then filter options based on grid conditions.
              const validOptions = optionsByType.filter((option) => {
                if (option.type === "wait") return true;

                // Calculate candidate grid position.
                const candidateX = state.currentX + option.dx;
                const candidateY = state.currentY + option.dy;
                const gridX = Math.round(candidateX / BLOCK_SIZE);
                const gridY = Math.round(candidateY / BLOCK_SIZE);

                if (!currentMapData) return false;

                // Special handling for Seel sprites (e.g. water conditions).
                if (baseObj?.sprite === "SPRITE_SEEL") {
                  const tileX = gridX * 2;
                  const tileY = gridY * 2 + 1;
                  if (
                    tileY < 0 ||
                    tileY >= currentMapData.tileMap.length ||
                    tileX < 0 ||
                    tileX >= currentMapData.tileMap[0].length
                  ) {
                    return false;
                  }
                  return currentMapData.tileMap[tileY][tileX] === WATER_TILE_ID;
                } else {
                  if (
                    !isSquareWalkable(
                      gridX,
                      gridY,
                      currentMapData.tileMap,
                      currentMapData.header.tileset,
                      collisionTiles
                    )
                  ) {
                    return false;
                  }
                }

                // Check if another moving sprite occupies the cell.
                const occupiedByMoving = Object.values(newStates).some(
                  (otherState) => {
                    if (otherState === state) return false;
                    return (
                      Math.round(otherState.currentX / BLOCK_SIZE) === gridX &&
                      Math.round(otherState.currentY / BLOCK_SIZE) === gridY
                    );
                  }
                );
                if (occupiedByMoving) return false;

                // Check if any static (non‑moving) object occupies the cell.
                const occupiedByStatic =
                  currentMapData.mapObjects?.object_events.some((obj) => {
                    if (obj.movement === "WALK") return false;
                    return obj.x === gridX && obj.y === gridY;
                  });
                if (occupiedByStatic) return false;

                // Ensure sprite doesn't move too far from its original cell.
                const tetherRange = 5;
                const distanceX = Math.abs(state.initialX / BLOCK_SIZE - gridX);
                const distanceY = Math.abs(state.initialY / BLOCK_SIZE - gridY);
                if (distanceX > tetherRange || distanceY > tetherRange)
                  return false;

                return true;
              });

              // If no valid move options, stay in place.
              if (validOptions.length === 0) {
                state.targetX = state.currentX;
                state.targetY = state.currentY;
                return;
              }

              // Randomly choose one of the valid options.
              const choice =
                validOptions[Math.floor(Math.random() * validOptions.length)];
              if (choice.type === "wait") {
                state.waitTime = choice.waitTime;
              } else {
                state.targetX = state.currentX + choice.dx;
                state.targetY = state.currentY + choice.dy;
                state.facing = choice.facing;
                state.justMoved = true;
              }
            } else if (
              baseObj.movement === "STAY" &&
              baseObj.direction === "NONE" &&
              (state.spriteType || "none") !== "none"
            ) {
              // For STAY objects, only update the facing direction (or wait).
              type Option =
                | { type: "face"; facing: StaticDirection }
                | { type: "wait"; waitTime: number };

              const faceOptions: Option[] = [
                { type: "face", facing: "LEFT" },
                { type: "face", facing: "RIGHT" },
                { type: "face", facing: "UP" },
                { type: "face", facing: "DOWN" },
                { type: "wait", waitTime: getRandomWaitTime() },
              ];

              const choice =
                faceOptions[Math.floor(Math.random() * faceOptions.length)];
              if (choice.type === "face") {
                state.facing = choice.facing;
                state.justMoved = true; // enforce a forced wait after facing change
              } else {
                state.waitTime = choice.waitTime;
              }
            } else {
              // Fallback for any other cases: simply wait.
              state.waitTime = getRandomWaitTime();
            }
          });

          // Draw the updated states
          drawMovingSprites(newStates);
          return newStates;
        });

        lastFrameTime = timestamp;
      }

      // Request next frame
      animationFrameId = requestAnimationFrame(animate);
    }

    // Start the animation
    animationFrameId = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [currentMapData, drawMovingSprites, spriteAnimationDelay]);
  //
  // Draw the zoomed preview of a selected tile.
  //
  useEffect(() => {
    if (!selectedTile || !previewCanvasRef.current || !canvasRef.current)
      return;
    const previewCtx = previewCanvasRef.current.getContext("2d");
    if (!previewCtx) return;
    const sourceCanvas = canvasRef.current;
    previewCtx.clearRect(
      0,
      0,
      previewCanvasRef.current.width,
      previewCanvasRef.current.height
    );
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
    if (
      !currentMapData ||
      !waterOverlayCanvasRef.current ||
      !mapCanvasRef.current
    ) {
      // On header change, clear remaining water overlay.
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
      return;
    }

    // Check if the current tileset should animate water or water+flower.
    const tsId = tilesetConstants[currentMapData.header.tileset];
    if (tsId === undefined) return;
    const tilesetDef = TILESETS[tsId];
    if (
      tilesetDef.animation !== TileAnimation.WATER &&
      tilesetDef.animation !== TileAnimation.WATER_FLOWER
    ) {
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
    let waterTileImageData = tilesetCtx.getImageData(
      waterTileX,
      waterTileY,
      TILE_SIZE,
      TILE_SIZE
    );

    const offscreenWaterCanvas = document.createElement("canvas");
    offscreenWaterCanvas.width = TILE_SIZE;
    offscreenWaterCanvas.height = TILE_SIZE;
    const offscreenCtx = offscreenWaterCanvas.getContext("2d");
    if (!offscreenCtx) return;

    // Animate water tile image data function
    const animateWaterTileImageData = (
      imgData: ImageData,
      dir: "left" | "right"
    ) => {
      const data = imgData.data;
      const width = imgData.width;
      const height = imgData.height;
      for (let row = 0; row < height; row++) {
        if (dir === "left") {
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
          const lastPixel = data.slice(
            start + (width - 1) * 4,
            start + width * 4
          );
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

    let waterAnimCounter = 0;
    let lastFrameTime = 0;
    let animationFrameId: number;

    function animate(timestamp: number) {
      if (!offscreenCtx || !waterCtx) return;
      // Control animation speed using timestamp
      if (timestamp - lastFrameTime >= waterAnimationDelay) {
        waterAnimCounter = (waterAnimCounter + 1) & 7;
        const direction: "left" | "right" =
          (waterAnimCounter & 4) !== 0 ? "left" : "right";

        // Animate water tile image data
        animateWaterTileImageData(waterTileImageData, direction);
        offscreenCtx.putImageData(waterTileImageData, 0, 0);
        waterCtx.clearRect(0, 0, waterCanvas.width, waterCanvas.height);

        // Draw animated water tiles
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

        // If using WATER_FLOWER, also update the flower tiles
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

        lastFrameTime = timestamp;
      }

      // Request next frame
      animationFrameId = requestAnimationFrame(animate);
    }

    // Start the animation
    animationFrameId = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameId);
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
  }, [currentMapData, tilesetConstants, preloadedTilesets, recoloredFlowers, waterAnimationDelay]);

  // NEW: Effect to draw warp and object event markers on an overlay canvas.

  useEffect(() => {
    if (
      !currentMapData ||
      !currentMapData.mapObjects ||
      !eventOverlayCanvasRef.current ||
      !mapCanvasRef.current
    ) {
      return;
    }
    const canvas = eventOverlayCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    canvas.width = mapCanvasRef.current.width;
    canvas.height = mapCanvasRef.current.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw warp events as before.
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "red";
    currentMapData.mapObjects.warp_events
      .filter((warp) => !warp.isDebug)
      .forEach((warp) => {
        const displayX = warp.x * BLOCK_SIZE * DISPLAY_SCALE;
        const displayY = warp.y * BLOCK_SIZE * DISPLAY_SCALE;
        ctx.fillText(
          "W",
          displayX + (BLOCK_SIZE * DISPLAY_SCALE) / 2,
          displayY + (BLOCK_SIZE * DISPLAY_SCALE) / 2
        );
      });

    // Draw object events as sprites.
    currentMapData.mapObjects.object_events.forEach((objEvent) => {
      // Determine sprite filename.
      // e.g. "SPRITE_YOUNGSTER" becomes "youngster.png"
      const spriteKey = objEvent.sprite;

      // Determine orientation based on movement type.
      let orientation: StaticDirection = "DOWN";
      if (objEvent.movement === "WALK") {
        // For WALK events, if the walking direction is LEFT_RIGHT, default to RIGHT;
        // otherwise (UP_DOWN or ANY_DIR) default to DOWN.
        orientation = objEvent.direction === "LEFT_RIGHT" ? "RIGHT" : "DOWN";
      } else {
        // For STAY events, use the provided static direction.
        // If the static direction is "NONE", default to DOWN.
        orientation =
          objEvent.direction === "NONE"
            ? "DOWN"
            : (objEvent.direction as StaticDirection);
      }

      // Use a cache key that includes orientation.
      const cacheKey = spriteKey + "_" + orientation;
      const cachedSprite = spriteCacheRef.current.get(cacheKey);
      if (cachedSprite) {
        const displayX = objEvent.x * BLOCK_SIZE * DISPLAY_SCALE;
        const displayY = objEvent.y * BLOCK_SIZE * DISPLAY_SCALE;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          cachedSprite,
          0,
          0,
          16,
          16,
          displayX,
          displayY,
          16 * DISPLAY_SCALE,
          16 * DISPLAY_SCALE
        );
      }
    });
  }, [currentMapData, paletteMode]);
  //
  // NEW: Handle clicks on the event overlay canvas.
  //
  // Revised handleEventOverlayClick:
  const handleEventOverlayClick = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (
      !currentMapData ||
      !currentMapData.mapObjects ||
      !eventOverlayCanvasRef.current
    )
      return;

    // Use the container element as the reference.
    // Assuming the overlay canvas is wrapped in a scrollable container.
    const container = eventOverlayCanvasRef.current.parentElement;
    if (!container) return;

    // Get the container's bounding rectangle.
    const rect = container.getBoundingClientRect();

    // Get the client coordinates from mouse or touch event.
    let clientX: number, clientY: number;
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    // Account for container scroll offsets.
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    // Compute the offset within the container.
    const offsetX = clientX - rect.left + scrollLeft;
    const offsetY = clientY - rect.top + scrollTop;

    // Adjust for any scaling that was applied (fit-to-screen mode).
    // If fitToScreen is false, effectiveScale is 1.
    const effectiveScale = 1;
    const canvasX = offsetX / effectiveScale;
    const canvasY = offsetY / effectiveScale;

    // Determine the tile by dividing by the effective tile width.
    const tileWidth = BLOCK_SIZE * DISPLAY_SCALE;
    const tileX = Math.floor(canvasX / tileWidth);
    const tileY = Math.floor(canvasY / tileWidth);

    // Clear any existing displayed text.
    setDisplayText(null);

    // --- Handle Warp Events ---
    const warpEvent = currentMapData.mapObjects.warp_events.find(
      (event) => !event.isDebug && event.x === tileX && event.y === tileY
    );
    if (warpEvent) {
      if (warpEvent.targetMap === "LAST_MAP") {
        handleMapChange(lastValidMap);
        return;
      }
      const targetHeader =
        warpEvent.targetMap
          .split("_")
          .map((word) => {
            if (word.match(/^[B]?[0-9]+F$/)) {
              return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join("") + ".asm";
      const matchingHeader = AVAILABLE_HEADERS.find(
        (header) => header.toLowerCase() === targetHeader.toLowerCase()
      );
      if (matchingHeader) {
        handleMapChange(matchingHeader);
      } else {
        console.warn(
          `Target map ${targetHeader} not found in available headers`
        );
      }
      return;
    }

    // --- Handle Background Events ---
    const bgEvent = currentMapData.mapObjects.bg_events.find(
      (event) => event.x === tileX && event.y === tileY
    );
    if (bgEvent) {
      const getDisplayText = (textData: ExtractedText): string => {
        let text = "";
        if (textData.type === "text") {
          text = textData.text.join("\n");
        } else if (textData.type === "trainer") {
          text = `${textData.textBefore}\n${textData.textEnd}\n${textData.textAfter}`;
        }
        return text.replace(/#/g, "POK\uE001").replace("!@", "!");
      };
      const textData = linkedTextRef.current[bgEvent.scriptId];
      if (textData) {
        setDisplayText(getDisplayText(textData));
        return;
      }
    }

    // --- Handle Object Events ---
    const objectEventIndex = currentMapData.mapObjects.object_events.findIndex(
      (obj, index) => {
        let objX: number, objY: number;
        if (obj.movement === "WALK") {
          const movingState = _movingStates[index];
          if (movingState) {
            objX = Math.round(movingState.currentX / BLOCK_SIZE);
            objY = Math.round(movingState.currentY / BLOCK_SIZE);
          } else {
            objX = obj.x;
            objY = obj.y;
          }
        } else {
          objX = obj.x;
          objY = obj.y;
        }
        return objX === tileX && objY === tileY;
      }
    );
    if (objectEventIndex !== -1) {
      const objEvent =
        currentMapData.mapObjects.object_events[objectEventIndex];
      const getDisplayText = (textData: ExtractedText): string => {
        let text = "";
        if (textData.type === "text") {
          text = textData.text.join("\n");
        } else if (textData.type === "trainer") {
          text = `${textData.textBefore}\n${textData.textEnd}\n${textData.textAfter}`;
        }
        return text.replace(/#/g, "POK\uE001").replace("!@", "!");
      };
      const textData = linkedTextRef.current[objEvent.textScript];
      if (textData) {
        setDisplayText(getDisplayText(textData));
        return;
      }
    }
  };

  //
  // NEW: Handle mouse movement over the event overlay canvas.
  //
  const handleEventOverlayMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (
        !currentMapData ||
        !currentMapData.mapObjects ||
        !eventOverlayCanvasRef.current
      )
        return;

      // Get the container element as the reference
      const container = eventOverlayCanvasRef.current.parentElement;
      if (!container) return;

      // Get the container's bounding rectangle
      const rect = container.getBoundingClientRect();

      // Account for container scroll offsets
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;

      // Compute the offset within the container
      const offsetX = e.clientX - rect.left + scrollLeft;
      const offsetY = e.clientY - rect.top + scrollTop;

      // Determine the tile by dividing by the effective tile width
      const tileWidth = BLOCK_SIZE * DISPLAY_SCALE;
      const tileX = Math.floor(offsetX / tileWidth);
      const tileY = Math.floor(offsetY / tileWidth);

      // Check if hovering over a warp event
      const hoveringWarp = currentMapData.mapObjects.warp_events.some(
        (warp) => !warp.isDebug && warp.x === tileX && warp.y === tileY
      );

      // Check if hovering over a background event
      const hoveringBgEvent = currentMapData.mapObjects.bg_events.some(
        (event) => event.x === tileX && event.y === tileY
      );

      // Check if hovering over an object event (using MovingState for moving objects)
      const hoveringObject = currentMapData.mapObjects.object_events.some((obj, idx) => {
        let objX: number, objY: number;
        
        if (obj.movement === "WALK") {
          // For moving objects, use the current position from _movingStates
          const movingState = _movingStates[idx];
          if (movingState) {
            objX = Math.round(movingState.currentX / BLOCK_SIZE);
            objY = Math.round(movingState.currentY / BLOCK_SIZE);
          } else {
            objX = obj.x;
            objY = obj.y;
          }
        } else {
          // For static objects, use their defined position
          objX = obj.x;
          objY = obj.y;
        }
        
        return objX === tileX && objY === tileY;
      });

      // Change cursor style based on whether hovering over an interactive element
      if (hoveringWarp || hoveringBgEvent || hoveringObject) {
        e.currentTarget.style.cursor = INTERACTIVE_ELEMENT_CURSOR;
      } else {
        e.currentTarget.style.cursor = 'default';
      }
    },
    [currentMapData, _movingStates]
  );

  //
  // Update URL whenever selectedHeader or paletteMode changes
  //
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("header", selectedHeader);
    params.set("paletteMode", paletteMode);
    navigate({ search: params.toString() }, { replace: true });
  }, [selectedHeader, paletteMode, navigate]);

  //
  // Recoloring the Flowers:
  //
  useEffect(() => {
    if (!currentMapData) return;
    const flowerKeys = [
      "flower/flower1.png",
      "flower/flower2.png",
      "flower/flower3.png",
    ];
    const newCache: Record<string, HTMLCanvasElement> = {};
    const currentPalette = palettes[currentMapData.paletteId];
    flowerKeys.forEach((key) => {
      const rawImg = preloadedTilesets[key];
      if (rawImg) {
        newCache[key] = recolorTileset(rawImg, currentPalette, paletteMode, [
          "#ffffff",
          "#aaaaaa",
          "#555555",
          "#000000",
        ]);
      }
    });
    setRecoloredFlowers(newCache);

    if (currentMapData) {
      // Reset window scroll
      window.scrollTo(0, 0);

      // Reset map canvas position
      if (mapCanvasRef.current) {
        mapCanvasRef.current.style.transform = "translate(0, 0)";
      }
      if (waterOverlayCanvasRef.current) {
        waterOverlayCanvasRef.current.style.transform = "translate(0, 0)";
      }
      if (eventOverlayCanvasRef.current) {
        eventOverlayCanvasRef.current.style.transform = "translate(0, 0)";
      }

      // Find the map-display container and ensure it's visible
      const mapDisplay = document.querySelector(".map-display");
      if (mapDisplay) {
        mapDisplay.scrollTo(0, 0);
      }
      
      // Find all map-scroll-container elements and scroll them to the left
      const scrollContainers = document.querySelectorAll(".map-scroll-container");
      scrollContainers.forEach(container => {
        if (container instanceof HTMLElement) {
          container.scrollLeft = 0;
        }
      });
    }
  }, [currentMapData, paletteMode, preloadedTilesets]);

  useEffect(() => {
    if (
      !currentMapData ||
      !collisionOverlayCanvasRef.current ||
      !mapCanvasRef.current
    )
      return;
    const canvas = collisionOverlayCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use the same dimensions as the main map canvas.
    canvas.width = mapCanvasRef.current.width;
    canvas.height = mapCanvasRef.current.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Our map is drawn as individual 8x8 tiles with DISPLAY_SCALE applied.
    // Each walkable square is 16x16 pixels (i.e. 2x2 8x8 tiles).
    const { tileMap, header } = currentMapData;
    const totalTileRows = tileMap.length;
    const totalTileCols = tileMap[0]?.length || 0;
    const squaresX = Math.floor(totalTileCols / 2);
    const squaresY = Math.floor(totalTileRows / 2);
    const squarePixelSize = TILE_SIZE * DISPLAY_SCALE * 2; // (8 * DISPLAY_SCALE * 2)

    ctx.fillStyle = "rgba(255, 0, 0, 0.4)"; // transparent red

    // Iterate over each 16x16 square (in square coordinates)
    for (let sy = 0; sy < squaresY; sy++) {
      for (let sx = 0; sx < squaresX; sx++) {
        // Use our helper function to check walkability.
        const walkable = isSquareWalkable(
          sx,
          sy,
          tileMap,
          header.tileset,
          collisionTiles
        );
        if (!walkable) {
          // Compute the pixel coordinates.
          const x = sx * squarePixelSize;
          const y = sy * squarePixelSize;
          ctx.fillRect(x, y, squarePixelSize, squarePixelSize);
        }
      }
    }
  }, [currentMapData, collisionTiles]);

  // Helper function to render connection panels (north, south, east, west)
  const renderConnectionPanel = (
    direction: "north" | "south" | "east" | "west"
  ) => {
    if (
      !currentMapData ||
      !currentMapData.header.connections.find(
        (conn) => conn.direction === direction
      )
    ) {
      return null;
    }

    const connection = currentMapData.header.connections.find(
      (conn) => conn.direction === direction
    );
    const mapName = connection?.mapName || "";

    // Get the palette color (second-to-last color, index 2)
    const paletteColor = currentMapData.paletteId !== undefined 
      ? palettes[currentMapData.paletteId] 
      : null;
    
    // Convert the palette color to RGB format for CSS
    let gradientStyle = {};
    if (paletteColor) {
      const colorMode = paletteMode === "cgb" ? "cgb" : "sgb";
      const color = paletteColor[colorMode][1];
      // Convert from 0-31 range to 0-255 range
      const r = Math.round((color.r / 31) * 255);
      const g = Math.round((color.g / 31) * 255);
      const b = Math.round((color.b / 31) * 255);
      
      // Create direction-specific gradients
      const darkGrey = "rgba(50,50,50,0.9)";
      const paletteRgba = `rgba(${r},${g},${b},0.7)`;
      
      if (direction === "north") {
        gradientStyle = {
          background: `linear-gradient(to bottom, ${darkGrey}, ${paletteRgba})`
        };
      } else if (direction === "south") {
        gradientStyle = {
          background: `linear-gradient(to top, ${darkGrey}, ${paletteRgba})`
        };
      } else if (direction === "west") {
        gradientStyle = {
          background: `linear-gradient(to right, ${darkGrey}, ${paletteRgba})`
        };
      } else if (direction === "east") {
        gradientStyle = {
          background: `linear-gradient(to left, ${darkGrey}, ${paletteRgba})`
        };
      }
    }

    // Common click handler for all directions
    const handleClick = () => {
      if (connection && connection.mapName) {
        const targetHeader = connection.mapName + ".asm";
        const matchingHeader = AVAILABLE_HEADERS.find(
          (header) => header.toLowerCase() === targetHeader.toLowerCase()
        );
        if (matchingHeader) {
          handleMapChange(matchingHeader);
        }
      }
    };

    // Style properties specific to each direction
    // const isHorizontal = direction === "north" || direction === "south";
    const hasWest = currentMapData.header.connections.find(
      (conn) => conn.direction === "west"
    );
    const hasEast = currentMapData.header.connections.find(
      (conn) => conn.direction === "east"
    );

    // Calculate width for horizontal panels (north/south)
    const horizontalWidth =
      hasWest && hasEast
        ? mapCanvasWidth + BLOCK_SIZE * DISPLAY_SCALE * 2
        : hasWest || hasEast
        ? mapCanvasWidth + BLOCK_SIZE * DISPLAY_SCALE
        : mapCanvasWidth;

    // Direction-specific styles
    const directionStyles: Record<typeof direction, React.CSSProperties> = {
      north: {
        width: horizontalWidth,
        height: `${BLOCK_SIZE * DISPLAY_SCALE}px`,
        ...gradientStyle
      },
      south: {
        width: horizontalWidth,
        height: `${BLOCK_SIZE * DISPLAY_SCALE}px`,
        ...gradientStyle
      },
      west: {
        width: `${BLOCK_SIZE * DISPLAY_SCALE}px`,
        height: mapCanvasHeight,
        ...gradientStyle
      },
      east: {
        width: `${BLOCK_SIZE * DISPLAY_SCALE}px`,
        height: mapCanvasHeight,
        ...gradientStyle
      },
    };

    // Special text container for west and east directions
    const renderText = () => {
      if (direction === "west") {
        return (
          <div style={{ 
            marginLeft: "-6px", 
            transform: "rotate(-90deg)",
            fontSize: "24px",
            whiteSpace: "nowrap"
          }}>
            {mapName}
          </div>
        );
      } else if (direction === "east") {
        return (
          <div style={{
            fontSize: "24px",
            whiteSpace: "nowrap",
            writingMode: "vertical-lr",
            textOrientation: "mixed"
          }}>
            {mapName}
          </div>
        );
      }
      return mapName;
    };

    return (
      <div
        className={`connection-panel ${direction}`}
        style={directionStyles[direction]}
        onClick={handleClick}
      >
        {renderText()}
      </div>
    );
  };

  //
  // Render the component.
  //
  return (
    <div className="app-container">
      {/* Settings button */}
      <button 
        className="settings-button"
        onClick={() => setShowSettings(!showSettings)}
        title="Settings"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
        </svg>
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div className="settings-panel">
          <h3>Animation Settings</h3>
          
          <div className="setting-item">
            <label htmlFor="water-delay">Water Animation Delay: {waterAnimationDelay}ms</label>
            <input
              id="water-delay"
              type="range"
              min="50"
              max="1000"
              step="25"
              value={waterAnimationDelay}
              onChange={(e) => setWaterAnimationDelay(Number(e.target.value))}
            />
            <button 
              className="reset-button"
              onClick={() => setWaterAnimationDelay(WATER_ANIMATION_DELAY)}
            >
              Reset
            </button>
          </div>

          <div className="setting-item">
            <label htmlFor="sprite-delay">Sprite Animation Delay: {spriteAnimationDelay}ms</label>
            <input
              id="sprite-delay"
              type="range"
              min="10"
              max="200"
              step="10"
              value={spriteAnimationDelay}
              onChange={(e) => setSpriteAnimationDelay(Number(e.target.value))}
            />
            <button 
              className="reset-button"
              onClick={() => setSpriteAnimationDelay(SPRITE_ANIMATION_DELAY)}
            >
              Reset
            </button>
          </div>

          <button 
            className="close-settings"
            onClick={() => setShowSettings(false)}
          >
            Close
          </button>
        </div>
      )}

      {/* Only show textbox when there's text to display */}
      {displayText && (
        <div className="textbox">
          <div className="textbox-content">{displayText}</div>
        </div>
      )}
      {/* Image selector */}
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
            onChange={(e) => setPaletteMode(e.target.value as "cgb" | "sgb")}
          >
            <option value="cgb">Color Game Boy</option>
            <option value="sgb">Super Game Boy</option>
          </select>
        </div>
        {currentMapData !== null && DEBUG && (
          <div className="map-info" style={{ textAlign: "left" }}>
            <p>Map Name: {currentMapData.header.name}</p>
            <p>Map ID: {getMapIdFromHeader(selectedHeader, mapPointers)}</p>
            <p>Size Constant: {currentMapData.header.sizeConst}</p>

            {false && (
              <div className="pokemon-chars">
                <h4>Special Characters:</h4>
                <table>
                  <tbody>
                    <tr>
                      <th>Char</th>
                      <th>Code</th>
                      <th>Description</th>
                    </tr>
                    {[
                      { char: "\uE000", desc: "m" },
                      { char: "\uE001", desc: "é" },
                      { char: "\uE002", desc: "PK" },
                      { char: "\uE003", desc: "MN" },
                      { char: "\uE004", desc: "Pokédollar" },
                      { char: "\uE005", desc: "Q" },
                      { char: "\uE006", desc: "d" },
                      { char: "\uE007", desc: "ď" },
                      { char: "\uE008", desc: "j" },
                      { char: "\uE009", desc: "l" },
                      { char: "\uE00A", desc: "ĺ" },
                      { char: "\uE00B", desc: "ḿ" },
                      { char: "\uE00C", desc: "ḿ" },
                      { char: "\uE00D", desc: "ḿ" },
                      { char: "\uE00E", desc: "ń" },
                      { char: "\uE00F", desc: "P" },
                      { char: "\uE010", desc: "ŕ" },
                      { char: "\uE011", desc: "ŕ" },
                      { char: "\uE012", desc: "ś" },
                      { char: "\uE013", desc: "š" },
                      { char: "\uE014", desc: "ť" },
                      { char: "\uE015", desc: "ť" },
                      { char: "\uE016", desc: "v" },
                      { char: "\uE017", desc: "v" },
                    ].map(({ char, desc }, i) => (
                      <tr key={i}>
                        <td>{char}</td>
                        <td>
                          U+
                          {char
                            .charCodeAt(0)
                            .toString(16)
                            .toUpperCase()
                            .padStart(4, "0")}
                        </td>
                        <td>{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p>
              Tileset Animation:{" "}
              {
                TILESETS[tilesetConstants[currentMapData.header.tileset] || 0]
                  .animation
              }
            </p>
            <p>
              Tileset ID: {tilesetConstants[currentMapData.header.tileset] || 0}
            </p>
            <p>
              Tileset: {currentMapData.header.tileset} →{" "}
              {currentMapData.header.actualBlockset}
            </p>
            <p>Palette ID: {currentMapData.paletteId}</p>
            {currentMapData.header.width !== undefined &&
              currentMapData.header.height !== undefined && (
                <p>
                  Size: {currentMapData.header.width}x
                  {currentMapData.header.height} tiles
                </p>
              )}
            {false && currentMapData && (
              <>
                <p>Required Files:</p>
                <ul className="required-files" style={{ textAlign: "left" }}>
                  <li>maps/{currentMapData?.header.name}.blk</li>
                  <li>
                    gfx/blocksets/{currentMapData?.header.actualBlockset}.bst
                  </li>
                  <li>
                    gfx/tilesets/{currentMapData?.header.actualBlockset}.png
                  </li>
                </ul>
              </>
            )}
            {false && currentMapData?.mapObjects && (
              <>
                <p>Map Objects:</p>
                <pre>{JSON.stringify(currentMapData?.mapObjects, null, 2)}</pre>
              </>
            )}
          </div>
        )}
      </div>

      <div
        className="main-view"
        style={{ display: "flex", flexDirection: "column" }}
      >
        {DEBUG && (
          <div className="tileset-display">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{ cursor: "crosshair", border: "1px solid #000" }}
            />
          </div>
        )}

        {false &&
          blocksetVisual &&
          currentMapData &&
          currentMapData?.recoloredTileset && (
            <div
              className="blockset-display"
              style={{
                display: "flex",
                flexWrap: "wrap",
                marginTop: "10px",
                border: "1px solid #000",
                padding: "5px",
              }}
            >
              {blocksetVisual?.map((block, idx) => (
                <BlockDisplay
                  key={idx}
                  block={block}
                  blockIndex={idx}
                  tileset={currentMapData!.recoloredTileset}
                  tileSize={TILE_SIZE}
                  scale={DISPLAY_SCALE}
                />
              ))}
            </div>
          )}
        <div
          className="outer-container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start", // Changed from center to flex-start
            width: "100%",
          }}
        >
          {/* North connection panel inside scroll container */}
          <div 
            className="map-scroll-container"
            style={{
              overflowX: needsHorizontalScroll ? 'auto' : 'visible',
              overflowY: 'hidden'
            }}
          >
            {renderConnectionPanel("north")}
          </div>

          {/* Map-scroll-container wraps the center row */}
          <div 
            className="map-scroll-container"
            style={{
              overflowX: needsHorizontalScroll ? 'auto' : 'visible',
              overflowY: 'hidden'
            }}
          >
            <div style={{ display: "flex" }}>
              {renderConnectionPanel("west")}

              {/* Map Display */}
              <div
                className="map-display"
                style={{
                  position: "relative",
                  width: mapCanvasWidth,
                  height: mapCanvasHeight,
                }}
              >
                <canvas ref={mapCanvasRef} />
                <canvas
                  ref={waterOverlayCanvasRef}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                  }}
                />
                <canvas
                  ref={eventOverlayCanvasRef}
                  onClick={handleEventOverlayClick}
                  onMouseMove={handleEventOverlayMouseMove}
                  style={{ position: "absolute", top: 0, left: 0, zIndex: 2 }}
                />
              </div>
              {renderConnectionPanel("east")}
            </div>
          </div>

          {/* South connection panel should also be in the scroll container */}
          <div 
            className="map-scroll-container"
            style={{
              overflowX: needsHorizontalScroll ? 'auto' : 'visible',
              overflowY: 'hidden'
            }}
          >
            {renderConnectionPanel("south")}
          </div>
        </div>

        {DEBUG && (
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
              <PaletteDisplay
                paletteId={currentMapData.paletteId}
                paletteMode={paletteMode}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
