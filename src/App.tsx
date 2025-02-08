/* App.tsx */
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import "./App.css";
import { loadAndAssembleMap } from "./blockset";
import { usePreloadedTilesets } from "./hooks/usePreloadedTilesets";
import { getPaletteId } from "./palettes/getPalletteId";
import { palettes } from "./palettes/palettes";
import { recolorTileset } from "./palettes/useRecoloredTileset";

interface CurrentMapData {
  header: MapHeader;
  tileMap: number[][];
  recoloredTileset: HTMLCanvasElement;
  paletteId: number;
}

// The list of available header files.
const AVAILABLE_HEADERS = [
  "AgathasRoom.asm",
  "BikeShop.asm",
  "BillsHouse.asm",
  "BluesHouse.asm",
  "BrunosRoom.asm",
  "CeladonChiefHouse.asm",
  "CeladonCity.asm",
  "CeladonDiner.asm",
  "CeladonGym.asm",
  "CeladonHotel.asm",
  "CeladonMansion1F.asm",
  "CeladonMansion2F.asm",
  "CeladonMansion3F.asm",
  "CeladonMansionRoof.asm",
  "CeladonMansionRoofHouse.asm",
  "CeladonMart1F.asm",
  "CeladonMart2F.asm",
  "CeladonMart3F.asm",
  "CeladonMart4F.asm",
  "CeladonMart5F.asm",
  "CeladonMartElevator.asm",
  "CeladonMartRoof.asm",
  "CeladonPokecenter.asm",
  "CeruleanBadgeHouse.asm",
  "CeruleanCave1F.asm",
  "CeruleanCave2F.asm",
  "CeruleanCaveB1F.asm",
  "CeruleanCity.asm",
  "CeruleanGym.asm",
  "CeruleanMart.asm",
  "CeruleanMelaniesHouse.asm",
  "CeruleanPokecenter.asm",
  "CeruleanTrashedHouse.asm",
  "ChampionsRoom.asm",
  "CinnabarGym.asm",
  "CinnabarIsland.asm",
  "CinnabarLab.asm",
  "CinnabarLabFossilRoom.asm",
  "CinnabarLabMetronomeRoom.asm",
  "CinnabarLabTradeRoom.asm",
  "CinnabarMart.asm",
  "CinnabarPokecenter.asm",
  "Colosseum.asm",
  "CopycatsHouse1F.asm",
  "CopycatsHouse2F.asm",
  "Daycare.asm",
  "DiglettsCave.asm",
  "DiglettsCaveRoute11.asm",
  "DiglettsCaveRoute2.asm",
  "FightingDojo.asm",
  "FuchsiaBillsGrandpasHouse.asm",
  "FuchsiaCity.asm",
  "FuchsiaGoodRodHouse.asm",
  "FuchsiaGym.asm",
  "FuchsiaMart.asm",
  "FuchsiaMeetingRoom.asm",
  "FuchsiaPokecenter.asm",
  "GameCorner.asm",
  "GameCornerPrizeRoom.asm",
  "HallOfFame.asm",
  "IndigoPlateau.asm",
  "IndigoPlateauLobby.asm",
  "LancesRoom.asm",
  "LavenderCuboneHouse.asm",
  "LavenderMart.asm",
  "LavenderPokecenter.asm",
  "LavenderTown.asm",
  "LoreleisRoom.asm",
  "MrFujisHouse.asm",
  "MrPsychicsHouse.asm",
  "MtMoon1F.asm",
  "MtMoonB1F.asm",
  "MtMoonB2F.asm",
  "MtMoonPokecenter.asm",
  "Museum1F.asm",
  "Museum2F.asm",
  "NameRatersHouse.asm",
  "OaksLab.asm",
  "PalletTown.asm",
  "PewterCity.asm",
  "PewterGym.asm",
  "PewterMart.asm",
  "PewterNidoranHouse.asm",
  "PewterPokecenter.asm",
  "PewterSpeechHouse.asm",
  "PokemonFanClub.asm",
  "PokemonMansion1F.asm",
  "PokemonMansion2F.asm",
  "PokemonMansion3F.asm",
  "PokemonMansionB1F.asm",
  "PokemonTower1F.asm",
  "PokemonTower2F.asm",
  "PokemonTower3F.asm",
  "PokemonTower4F.asm",
  "PokemonTower5F.asm",
  "PokemonTower6F.asm",
  "PokemonTower7F.asm",
  "PowerPlant.asm",
  "RedsHouse1F.asm",
  "RedsHouse2F.asm",
  "RockTunnel1F.asm",
  "RockTunnelB1F.asm",
  "RockTunnelPokecenter.asm",
  "RocketHideoutB1F.asm",
  "RocketHideoutB2F.asm",
  "RocketHideoutB3F.asm",
  "RocketHideoutB4F.asm",
  "RocketHideoutElevator.asm",
  "Route1.asm",
  "Route10.asm",
  "Route11.asm",
  "Route11Gate1F.asm",
  "Route11Gate2F.asm",
  "Route12.asm",
  "Route12Gate1F.asm",
  "Route12Gate2F.asm",
  "Route12SuperRodHouse.asm",
  "Route13.asm",
  "Route14.asm",
  "Route15.asm",
  "Route15Gate1F.asm",
  "Route15Gate2F.asm",
  "Route16.asm",
  "Route16FlyHouse.asm",
  "Route16Gate1F.asm",
  "Route16Gate2F.asm",
  "Route17.asm",
  "Route18.asm",
  "Route18Gate1F.asm",
  "Route18Gate2F.asm",
  "Route19.asm",
  "Route2.asm",
  "Route20.asm",
  "Route21.asm",
  "Route22.asm",
  "Route22Gate.asm",
  "Route23.asm",
  "Route24.asm",
  "Route25.asm",
  "Route2Gate.asm",
  "Route2TradeHouse.asm",
  "Route3.asm",
  "Route4.asm",
  "Route5.asm",
  "Route5Gate.asm",
  "Route6.asm",
  "Route6Gate.asm",
  "Route7.asm",
  "Route7Gate.asm",
  "Route8.asm",
  "Route8Gate.asm",
  "Route9.asm",
  "SSAnne1F.asm",
  "SSAnne1FRooms.asm",
  "SSAnne2F.asm",
  "SSAnne2FRooms.asm",
  "SSAnne3F.asm",
  "SSAnneB1F.asm",
  "SSAnneB1FRooms.asm",
  "SSAnneBow.asm",
  "SSAnneCaptainsRoom.asm",
  "SSAnneKitchen.asm",
  "SafariZoneCenter.asm",
  "SafariZoneCenterRestHouse.asm",
  "SafariZoneEast.asm",
  "SafariZoneEastRestHouse.asm",
  "SafariZoneGate.asm",
  "SafariZoneNorth.asm",
  "SafariZoneNorthRestHouse.asm",
  "SafariZoneSecretHouse.asm",
  "SafariZoneWest.asm",
  "SafariZoneWestRestHouse.asm",
  "SaffronCity.asm",
  "SaffronGym.asm",
  "SaffronMart.asm",
  "SaffronPidgeyHouse.asm",
  "SaffronPokecenter.asm",
  "SeafoamIslands1F.asm",
  "SeafoamIslandsB1F.asm",
  "SeafoamIslandsB2F.asm",
  "SeafoamIslandsB3F.asm",
  "SeafoamIslandsB4F.asm",
  "SilphCo10F.asm",
  "SilphCo11F.asm",
  "SilphCo1F.asm",
  "SilphCo2F.asm",
  "SilphCo3F.asm",
  "SilphCo4F.asm",
  "SilphCo5F.asm",
  "SilphCo6F.asm",
  "SilphCo7F.asm",
  "SilphCo8F.asm",
  "SilphCo9F.asm",
  "SilphCoElevator.asm",
  "SummerBeachHouse.asm",
  "TradeCenter.asm",
  "UndergroundPathNorthSouth.asm",
  "UndergroundPathRoute5.asm",
  "UndergroundPathRoute6.asm",
  "UndergroundPathRoute7.asm",
  "UndergroundPathRoute7Copy.asm",
  "UndergroundPathRoute8.asm",
  "UndergroundPathWestEast.asm",
  "VermilionCity.asm",
  "VermilionDock.asm",
  "VermilionGym.asm",
  "VermilionMart.asm",
  "VermilionOldRodHouse.asm",
  "VermilionPidgeyHouse.asm",
  "VermilionPokecenter.asm",
  "VermilionTradeHouse.asm",
  "VictoryRoad1F.asm",
  "VictoryRoad2F.asm",
  "VictoryRoad3F.asm",
  "ViridianCity.asm",
  "ViridianForest.asm",
  "ViridianForestNorthGate.asm",
  "ViridianForestSouthGate.asm",
  "ViridianGym.asm",
  "ViridianMart.asm",
  "ViridianNicknameHouse.asm",
  "ViridianPokecenter.asm",
  "ViridianSchoolHouse.asm",
  "WardensHouse.asm",
];

const TILESET_FILES = [
  "beach_house.png",
  "cavern.png",
  "cemetery.png",
  "club.png",
  "facility.png",
  "flower/flower1.png",
  "flower/flower2.png",
  "flower/flower3.png",
  "forest.png",
  "gate.png",
  "gym.png",
  "house.png",
  "interior.png",
  "lab.png",
  "lobby.png",
  "mansion.png",
  "overworld.png",
  "plateau.png",
  "pokecenter.png",
  "reds_house.png",
  "ship.png",
  "ship_port.png",
  "underground.png",
];

const TILE_SIZE = 8;
const ZOOM_FACTOR = 4;
const DISPLAY_SCALE = 2;

interface TileCoordinates {
  x: number;
  y: number;
}

interface MapHeader {
  name: string;
  sizeConst: string;
  tileset: string;
  width?: number;
  height?: number;
  actualBlockset: string;
}

interface PaletteDisplayProps {
  paletteId: number;
  paletteMode: 'cgb' | 'sgb';
}

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
      <div>
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
    </div>
  );
});

function App() {
  // -- Selections and preloads --
  const [selectedTile, setSelectedTile] = useState<TileCoordinates | null>(null);
  const [selectedHeader, setSelectedHeader] = useState<string>("PalletTown.asm");
  const [currentMapData, setCurrentMapData] = useState<CurrentMapData | null>(null);

  // Add palette mode state
  const [paletteMode, setPaletteMode] = useState<'cgb' | 'sgb'>('cgb');

  // Preload all tileset images.
  const preloadedTilesets = usePreloadedTilesets(TILESET_FILES, paletteMode);

  // Refs for the various canvases.
  const canvasRef = useRef<HTMLCanvasElement>(null); // For the original (left-side) tileset preview.
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null); // For the full map rendering.

  // Cached data loaded at startup.
  const [cachedConstants, setCachedConstants] = useState<Record<string, { width: number; height: number }>>({});
  const [cachedMappings, setCachedMappings] = useState<Record<string, string>>({});
  const [mapPointers, setMapPointers] = useState<string[]>([]);
  const [tilesetConstants, setTilesetConstants] = useState<Record<string, number>>({});

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

  // Load cached constants and mappings.
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

  // Load map pointers.
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

  // Load tileset constants.
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

  // When a new header is selected, load all required data.
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
        const headerResponse = await fetch(`/pokemon-tileset/pkassets/headers/${selectedHeader}`, {
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

        // 3. Ensure the new tileset image is preloaded.
        const originalTileset = preloadedTilesets[newSelectedImage];
        if (!originalTileset)
          throw new Error(`Tileset image ${newSelectedImage} not loaded`);

        // 4. Fetch the map and blockset files concurrently.
        const [blkResponse, bstResponse] = await Promise.all([
          fetch(`/pokemon-tileset/pkassets/maps/${newSelectedMap}`, { signal: controller.signal }),
          fetch(`/pokemon-tileset/pkassets/blocksets/${newSelectedBlockset}`, { signal: controller.signal }),
        ]);
        if (!blkResponse.ok || !bstResponse.ok)
          throw new Error("Error loading map or blockset file");
        const blkData = new Uint8Array(await blkResponse.arrayBuffer());
        const blocksetData = new Uint8Array(await bstResponse.arrayBuffer());
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

        // 7. Update the combined state.
        setCurrentMapData({
          header: newHeader,
          tileMap: map,
          recoloredTileset,
          paletteId,
        });
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error in header/map loading chain:", error);
        }
      }
    })();

    return () => controller.abort();
  }, [selectedHeader, cachedConstants, cachedMappings, mapPointers, preloadedTilesets, tilesetConstants, paletteMode]);

  function getMapIdFromHeader(headerName: string, pointers: string[]): number {
    const mapName = headerName.replace(".asm", "") + "_h";
    const index = pointers.findIndex((line) => line.includes(mapName));
    return index;
  }

  // Draw the original tileset image (for inspection).
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

  // Draw the preview (zoomed) tile when a tile is selected.
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

  // ── New Effect: Render the full map onto a single canvas ─────────
  useEffect(() => {
    if (!currentMapData || !mapCanvasRef.current) return;
    const canvas = mapCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { tileMap, recoloredTileset } = currentMapData;
    const rows = tileMap.length;
    const cols = tileMap[0]?.length || 0;
    // Set the canvas size based on the map dimensions.
    canvas.width = cols * TILE_SIZE * DISPLAY_SCALE;
    canvas.height = rows * TILE_SIZE * DISPLAY_SCALE;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const tilesPerRow = Math.floor(recoloredTileset.width / TILE_SIZE);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tileId = tileMap[y][x];
        const srcX = (tileId % tilesPerRow) * TILE_SIZE;
        const srcY = Math.floor(tileId / tilesPerRow) * TILE_SIZE;
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

  return (
    <div className="app-container">
      <div className="image-selector">
        <div className="selector-group">
          <label htmlFor="header-select">Choose a header:</label>
          <select
            id="header-select"
            value={selectedHeader}
            onChange={(e) => setSelectedHeader(e.target.value)}
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
            <p>Required Files:</p>
            <ul className="required-files" style={{ textAlign: "left" }}>
              <li>maps/{currentMapData.header.name}.blk</li>
              <li>
                gfx/blocksets/{currentMapData.header.actualBlockset}.bst
              </li>
              <li>
                gfx/tilesets/{currentMapData.header.actualBlockset}.png
              </li>
            </ul>
          </div>
        )}
      </div>

      <div className="main-view">
        <div className="tileset-display">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ cursor: "crosshair" }}
          />
        </div>

        <div className="map-display">
          {/* Single canvas used to render the full assembled map */}
          <canvas ref={mapCanvasRef} style={{ border: "1px solid #000" }} />
        </div>

        <div className="tile-preview">
          {selectedTile && (
            <>
              <canvas
                ref={previewCanvasRef}
                width={TILE_SIZE * ZOOM_FACTOR}
                height={TILE_SIZE * ZOOM_FACTOR}
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
  );
}

export default App;