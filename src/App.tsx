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
} from "./constants";
import { getSpriteFrame, getSpriteType, SpriteType } from "./sprites/spriteHelper";

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

// At the top of App.tsx (or in a helper file)
interface MovingState {
  currentX: number;
  currentY: number;
  initialX: number;
  initialY: number;
  targetX: number;
  targetY: number;
  facing: StaticDirection;
  movementType: WalkingDirection;
  waitTime: number;
  justMoved: boolean;
  spriteWalkingCounter: number;
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
  const [_movingStates, setMovingStates] = useState<Record<number, MovingState>>(
    {}
  );

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

  // Create a cache ref for processed sprite canvases.
  const spriteCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  // A state to trigger re-draw when a sprite loads.
  const [spriteCacheVersion, setSpriteCacheVersion] = useState(0);

  const collisionTiles = parseCollisionTiles();
  // console.log(collisionTiles);

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
        for (let i = 0; i < mappingLines.length; i++) {
          const gfxMatch = mappingLines[i].match(/(\w+)_GFX::/);
          if (gfxMatch) {
            for (let j = i; j < mappingLines.length; j++) {
              const blocksetMatch = mappingLines[j].match(
                /INCBIN\s+"gfx\/blocksets\/(\w+)\.bst"/
              );
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
        const headerResponse = await fetch(
          `/pokemon-tileset/pkassets/data/maps/headers/${selectedHeader}`,
          {
            signal: controller.signal,
          }
        );
        if (!headerResponse.ok)
          throw new Error(`HTTP error! Status: ${headerResponse.status}`);
        const headerText = await headerResponse.text();
        const headerMatch = headerText.match(
          /map_header\s+(\w+),\s+(\w+),\s+(\w+)/
        );
        if (!headerMatch) throw new Error("Failed to parse header file");
        if (currentRequestId !== headerRequestIdRef.current) return;

        const headerName = headerMatch[1];
        const sizeConst = headerMatch[2];
        const tilesetName = headerMatch[3].toUpperCase();
        const dimensions = cachedConstants[sizeConst];
        if (!dimensions)
          throw new Error("Map dimensions not found for " + sizeConst);
        const baseBlockset = (
          cachedMappings[tilesetName] || tilesetName.toLowerCase()
        ).replace(/_[1-9]$/, "");
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
        ]);
        if (!blkResponse.ok || !bstResponse.ok || !objResponse.ok)
          throw new Error("Error loading map, blockset, or object file");
        const blkData = new Uint8Array(await blkResponse.arrayBuffer());
        const blocksetData = new Uint8Array(await bstResponse.arrayBuffer());

        const visual = getBlocksetVisual(blocksetData);
        setBlocksetVisual(visual);

        const objectAsmContent = await objResponse.text();
        const map = loadAndAssembleMap(
          blkData,
          blocksetData,
          dimensions.width,
          dimensions.height
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

        // 9. Load sprites.
        // find unique sprites
        const spriteMovementTypes = new Map<string, boolean>();
        mapObjects.object_events.forEach(obj => {
          spriteMovementTypes.set(obj.sprite, 
            spriteMovementTypes.get(obj.sprite) || obj.movement === "WALK"
          );
        });
        // load them
        for (const [spriteKey, needsWalking] of spriteMovementTypes) {
          const spriteFileName = spriteKey.replace("SPRITE_", "").toLowerCase() + ".png";
          loadAndCacheSprite(spriteKey, spriteFileName, paletteId, needsWalking);
        }

        // 10. Reset moving states.
        setMovingStates({});
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
  ]);

  //
  // Helper: Given a header name and map pointers, compute the map ID.
  //
  function getMapIdFromHeader(headerName: string, pointers: string[]): number {
    const mapName = headerName.replace(".asm", "") + "_h";
    const index = pointers.findIndex((line) => line.includes(mapName));
    return index;
  }

  const loadAndCacheSprite = useCallback(
    (
      baseSprite: string,
      spriteFileName: string,
      paletteId: number,
      loadWalking: boolean = false // default: only load static frames
    ) => {
      const img = new Image();
      img.src = `/pokemon-tileset/pkassets/gfx/sprites/${spriteFileName}`;
      img.onload = () => {
        // Get sprite type once per image.
        const spriteType = getSpriteType(img);
        spriteMetaCacheRef.current.set(baseSprite, spriteType);
  
        // Define the directions.
        const directions: ("UP" | "DOWN" | "LEFT" | "RIGHT")[] = [
          "UP",
          "DOWN",
          "LEFT",
          "RIGHT",
        ];
  
        // Process static frames.
        directions.forEach((direction) => {
          const processed = processSprite(
            img,
            palettes[paletteId],
            paletteMode,
            direction,
            false
          );
          const key = `${baseSprite}_${direction}`;
          spriteCacheRef.current.set(key, processed);
  
          // If walking frames are needed, process them.
          if (loadWalking) {
            const processedWalk = processSprite(
              img,
              palettes[paletteId],
              paletteMode,
              direction,
              true
            );
            const keyWalk = `${baseSprite}_${direction}_walk`;
            spriteCacheRef.current.set(keyWalk, processedWalk);
          }
        });
  
        // Trigger a redraw after all frames are cached.
        setSpriteCacheVersion((v) => v + 1);
      };
    },
    [currentMapData, paletteMode]
  );

  //
  // Draw the original tileset image (for preview).
  //
  useEffect(() => {
    console.log("drawTileset");
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
        } else {
          posX = obj.x * BLOCK_SIZE;
          posY = obj.y * BLOCK_SIZE;
          facing = obj.direction === "NONE" ? "DOWN" : (obj.direction as StaticDirection);
        }
      
        // Build the cache key.
        let cacheKey = `${obj.sprite}_${facing}`;
        if (obj.movement === "WALK" && spriteFrameType === "walking") {
          cacheKey += "_walk";
        }
      
        // Retrieve the sprite from the cache...
        const cachedSpriteKey = Array.from(spriteCacheRef.current.keys()).find(key =>
          key.toLowerCase() === cacheKey.toLowerCase()
        );
        const cachedSprite = cachedSpriteKey ? spriteCacheRef.current.get(cachedSpriteKey) : undefined;
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
  
      // Make sure moving states exist for WALK events.
      if (!currentMapData || !currentMapData.mapObjects) return;
      setMovingStates((prev) => {
        const newStates = { ...prev };
        currentMapData.mapObjects?.object_events.forEach((obj, idx) => {
          if (obj.movement === "WALK" && newStates[idx] === undefined) {
            newStates[idx] = {
              currentX: obj.x * BLOCK_SIZE,
              currentY: obj.y * BLOCK_SIZE,
              targetX: obj.x * BLOCK_SIZE,
              targetY: obj.y * BLOCK_SIZE,
              initialX: obj.x * BLOCK_SIZE,
              initialY: obj.y * BLOCK_SIZE,
              facing: obj.direction === "LEFT_RIGHT" ? "RIGHT" : "DOWN",
              movementType: obj.direction,
              waitTime: 0,
              justMoved: false,
              spriteWalkingCounter: 0,
            };
          }
        });
        return newStates;
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
  
    // Random wait time generator: returns 16, 32, or 48 frames.
    const getRandomWaitTime = () => {
      const choices = [BLOCK_SIZE, BLOCK_SIZE * 2, BLOCK_SIZE * 3];
      return choices[Math.floor(Math.random() * choices.length)];
    };
  
    // Forced wait after a move is always exactly one block (e.g. 16 frames).
    const forcedWaitTime = BLOCK_SIZE;
  
    const intervalId = setInterval(() => {
      // Update moving states
      setMovingStates((prev) => {
        const newStates = { ...prev };
  
        // Loop through each moving state
        Object.keys(newStates).forEach((keyStr) => {
          const key = Number(keyStr);
          const state = newStates[key];
  
          // Retrieve the corresponding base object from the map's object events.
          const baseObj = currentMapData.mapObjects?.object_events[key];
  
          // 1. If we're in waiting mode, decrement the wait counter.
          if (state.waitTime > 0) {
            state.waitTime--;
            return; // do nothing else this tick
          }
  
          // 2. If we're still moving (haven't reached target), move one pixel.
          if (state.currentX !== state.targetX || state.currentY !== state.targetY) {
            state.spriteWalkingCounter++;
            if (state.currentX < state.targetX) state.currentX++;
            else if (state.currentX > state.targetX) state.currentX--;
            if (state.currentY < state.targetY) state.currentY++;
            else if (state.currentY > state.targetY) state.currentY--;
            return;
          }
  
          // 3. Now we're stationary and not waiting.
          // If the sprite just finished moving, force a wait period.
          if (state.justMoved) {
            state.spriteWalkingCounter = 0;
            state.waitTime = forcedWaitTime;
            state.justMoved = false;
            return;
          }
  
          // 4. Otherwise, choose a new action.
          // Define our available options: four move directions and one wait.
          type Option =
            | { type: "move"; dx: number; dy: number; facing: StaticDirection }
            | { type: "wait"; waitTime: number };
  
          const allOptions: Option[] = [
            { type: "move", dx: BLOCK_SIZE, dy: 0, facing: "RIGHT" },
            { type: "move", dx: -BLOCK_SIZE, dy: 0, facing: "LEFT" },
            { type: "move", dx: 0, dy: BLOCK_SIZE, facing: "DOWN" },
            { type: "move", dx: 0, dy: -BLOCK_SIZE, facing: "UP" },
            { type: "wait", waitTime: getRandomWaitTime() },
          ];
  
          // First, filter the options by movementType:
          // UP_DOWN only allows vertical moves (dy nonzero), LEFT_RIGHT only horizontal moves (dx nonzero),
          // ANY_DIR allows all moves.
          const optionsByType = allOptions.filter((option) => {
            if (option.type === "wait") return true;
            if (state.movementType === "UP_DOWN" && option.dx !== 0) return false;
            if (state.movementType === "LEFT_RIGHT" && option.dy !== 0) return false;
            return true;
          });
  
          // Then further filter these options based on the grid conditions.
          const validOptions = optionsByType.filter((option) => {
            if (option.type === "wait") return true;
  
            // For a move, calculate candidate position.
            const candidateX = state.currentX + option.dx;
            const candidateY = state.currentY + option.dy;
            const gridX = Math.round(candidateX / BLOCK_SIZE);
            const gridY = Math.round(candidateY / BLOCK_SIZE);
  
            if (!currentMapData) return false;
  
            // For seels, allow movement if the target square is water.
            if (baseObj?.sprite === "SPRITE_SEEL") {
              // Use the same logic as in isSquareWalkable to locate the bottom‑left tile:
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
              // For other sprites, use the normal walkability check.
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
  
            // Check if any other moving sprite is already in that cell.
            const occupiedByMoving = Object.values(newStates).some((otherState) => {
              if (otherState === state) return false;
              return (
                Math.round(otherState.currentX / BLOCK_SIZE) === gridX &&
                Math.round(otherState.currentY / BLOCK_SIZE) === gridY
              );
            });
            if (occupiedByMoving) return false;
  
            // Check if any static (non-moving) object occupies the cell.
            const occupiedByStatic = currentMapData.mapObjects?.object_events.some(
              (obj) => {
                if (obj.movement === "WALK") return false;
                return obj.x === gridX && obj.y === gridY;
              }
            );
            if (occupiedByStatic) return false;
  
            // Check tether range: ensure sprite doesn't move too far from its original cell.
            const tetherRange = 5;
            const distanceX = Math.abs(state.initialX / BLOCK_SIZE - gridX);
            const distanceY = Math.abs(state.initialY / BLOCK_SIZE - gridY);
            if (distanceX > tetherRange || distanceY > tetherRange) return false;
  
            return true;
          });
  
          // If no valid options, remain in place.
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
        });
  
        // Now draw the updated sprites.
        drawMovingSprites(newStates);
        return newStates;
      });
    }, 70);
  
    return () => clearInterval(intervalId);
  }, [currentMapData, drawMovingSprites]);
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

    // Counter for animation frames (for water and to drive flower cycles as well)
    let waterAnimCounter = 0;

    const intervalId = setInterval(() => {
      waterAnimCounter = (waterAnimCounter + 1) & 7;
      const direction: "left" | "right" =
        (waterAnimCounter & 4) !== 0 ? "left" : "right";
      // Animate water tile image data.
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

  // NEW: Effect to draw warp and object event markers on an overlay canvas.

  useEffect(() => {
    console.log("drawEventOverlay");
    if (
      !currentMapData ||
      !currentMapData.mapObjects ||
      !eventOverlayCanvasRef.current ||
      !mapCanvasRef.current
    ) {
      return;
    }
    console.log("drawEventOverlay 2");
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
        orientation = objEvent.direction === "NONE" ? "DOWN" : (objEvent.direction as StaticDirection);
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
  }, [currentMapData, paletteMode, spriteCacheVersion, loadAndCacheSprite]);
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
    const warpEvent = currentMapData.mapObjects.warp_events.find(
      (event) => !event.isDebug && event.x === tileX && event.y === tileY
    );

    if (warpEvent) {
      // Special handling for LAST_MAP
      if (warpEvent.targetMap === "LAST_MAP") {
        handleMapChange(lastValidMap);
        return;
      }

      // Convert ROUTE_18_GATE_1F to Route18Gate1F.asm
      const targetHeader =
        warpEvent.targetMap
          .split("_")
          .map((word) => {
            // Keep 1F, 2F, B1F, B2F, etc. uppercase at the end
            if (word.match(/^[B]?[0-9]+F$/)) {
              return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join("") + ".asm";

      // Find the matching header, ignoring case
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
    }
  };

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
            onChange={(e) => setPaletteMode(e.target.value as "cgb" | "sgb")}
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
        <div className="tileset-display">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ cursor: "crosshair", border: "1px solid #000" }}
          />
        </div>

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
          className="map-display"
          style={{ position: "relative", border: "1px solid #000" }}
        >
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
              pointerEvents: "none",
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
              zIndex: 2,
            }}
          />
          {/* The collision overlay canvas (draws transparent red on non-walkable squares) */}
          {/* <canvas
            ref={collisionOverlayCanvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none",
              zIndex: 3, // ensure it sits on top of other overlays
            }}
          /> */}
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
            <PaletteDisplay
              paletteId={currentMapData.paletteId}
              paletteMode={paletteMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
