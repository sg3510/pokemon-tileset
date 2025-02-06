/* App.tsx */
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import "./App.css";
import { loadAndAssembleMap } from "./blockset";
import { usePreloadedTilesets } from "./hooks/usePreloadedTilesets";

// Move lists and constants outside (or memoize them)
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

// Fixed settings (could be declared outside too)
const TILE_SIZE = 8;
const ZOOM_FACTOR = 4;
const DISPLAY_SCALE = 2;

interface TileCoordinates { x: number; y: number; }

interface MapHeader {
  name: string;
  sizeConst: string;
  tileset: string;
  width?: number;
  height?: number;
  actualBlockset: string;
}

// Create a memoized component for each rendered tile
interface TileCanvasProps {
  tileId: number;
  tileset: HTMLImageElement;
}
const TileCanvas = memo(({ tileId, tileset }: TileCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current && tileset) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        const tilesPerRow = Math.floor(tileset.width / TILE_SIZE);
        const srcX = (tileId % tilesPerRow) * TILE_SIZE;
        const srcY = Math.floor(tileId / tilesPerRow) * TILE_SIZE;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, TILE_SIZE * DISPLAY_SCALE, TILE_SIZE * DISPLAY_SCALE);
        ctx.drawImage(
          tileset,
          srcX,
          srcY,
          TILE_SIZE,
          TILE_SIZE,
          0,
          0,
          TILE_SIZE * DISPLAY_SCALE,
          TILE_SIZE * DISPLAY_SCALE
        );
      }
    }
  }, [tileId, tileset]);
  return (
    <canvas
      ref={canvasRef}
      width={TILE_SIZE * DISPLAY_SCALE}
      height={TILE_SIZE * DISPLAY_SCALE}
      className="tile-canvas"
      title={`Tile ${tileId.toString(16).padStart(2, "0")}`}
    />
  );
});

function App() {
  // States for selections, header info, map data, etc.
  const [selectedTile, setSelectedTile] = useState<TileCoordinates | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("overworld.png");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedMap, setSelectedMap] = useState<string>("PalletTown.blk");
  const [selectedBlockset, setSelectedBlockset] = useState<string>("overworld.bst");
  const [tileMap, setTileMap] = useState<number[][] | null>(null);
  const [selectedHeader, setSelectedHeader] = useState<string>("PalletTown.asm");
  const [mapHeader, setMapHeader] = useState<MapHeader | null>(null);
  const [cachedConstants, setCachedConstants] = useState<Record<string, { width: number; height: number }> | null>(null);
  const [cachedMappings, setCachedMappings] = useState<Record<string, string> | null>(null);

  // Preload all tileset images (using a custom hook)
  const preloadedTilesets = usePreloadedTilesets(TILESET_FILES);

  // useCallback version of our drawing functions

  // Draw grid in one path rather than many strokes (for speed)
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

  // --- Fetch and cache constants and mappings just once ---
  useEffect(() => {
    if (cachedConstants && cachedMappings) return;
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

  // --- Draw tileset when preloaded image is available
  useEffect(() => {
    const preloadedImage = preloadedTilesets[selectedImage];
    if (!preloadedImage || !canvasRef.current) return;
    if (preloadedImage.complete) {
      drawTileset(preloadedImage);
    } else {
      preloadedImage.onload = () => drawTileset(preloadedImage);
    }
  }, [selectedImage, preloadedTilesets, drawTileset]);

  // --- Load map data once we have the header with width/height ---
  useEffect(() => {
    if (!mapHeader || typeof mapHeader.width !== "number" || typeof mapHeader.height !== "number")
      return;
    const controller = new AbortController();
    (async function loadMapData() {
      try {
        const [blkResponse, blocksetResponse] = await Promise.all([
          fetch(`/pokemon-tileset/pkassets/maps/${selectedMap}`, { signal: controller.signal }),
          fetch(`/pokemon-tileset/pkassets/blocksets/${selectedBlockset}`, { signal: controller.signal }),
        ]);
        if (!blkResponse.ok || !blocksetResponse.ok) {
          throw new Error("Error loading map or blockset file");
        }
        const blkData = new Uint8Array(await blkResponse.arrayBuffer());
        const blocksetData = new Uint8Array(await blocksetResponse.arrayBuffer());
        if (!mapHeader.width || !mapHeader.height) {
          throw new Error("Map header does not contain width or height");
        }
        const map = loadAndAssembleMap(blkData, blocksetData, mapHeader.width, mapHeader.height);
        setTileMap(map);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error loading map data:", error);
          alert("Error loading map data. Check console for details.");
        }
      }
    })();
    return () => controller.abort();
  }, [selectedMap, selectedBlockset, mapHeader]);

  // Use a ref counter so that only the newest header request counts
  const headerRequestIdRef = useRef(0);
  useEffect(() => {
    if (!cachedConstants || !cachedMappings) return;
    headerRequestIdRef.current++;
    const currentRequestId = headerRequestIdRef.current;
    const controller = new AbortController();
    (async function initializeMap() {
      try {
        const headerResponse = await fetch(`/pokemon-tileset/pkassets/headers/${selectedHeader}`, {
          signal: controller.signal,
        });
        if (!headerResponse.ok) {
          throw new Error(`HTTP error! Status: ${headerResponse.status}`);
        }
        const headerText = await headerResponse.text();
        const headerMatch = headerText.match(/map_header\s+(\w+),\s+(\w+),\s+(\w+)/);
        if (headerMatch) {
          if (currentRequestId !== headerRequestIdRef.current) return;
          const sizeConst = headerMatch[2];
          const mapSize = cachedConstants[sizeConst];
          const tilesetName = headerMatch[3].toUpperCase();
          const baseBlockset = (cachedMappings[tilesetName] || tilesetName.toLowerCase()).replace(/_[1-9]$/, "");
          const newMapHeader: MapHeader = {
            name: headerMatch[1],
            sizeConst,
            tileset: tilesetName,
            actualBlockset: baseBlockset,
            width: mapSize?.width,
            height: mapSize?.height,
          };
          setMapHeader(newMapHeader);
          setSelectedMap(`${newMapHeader.name}.blk`);
          setSelectedBlockset(`${baseBlockset}.bst`);
          setSelectedImage(`${baseBlockset}.png`);
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error during header initialization:", error);
        }
      }
    })();
    return () => controller.abort();
  }, [selectedHeader, cachedConstants, cachedMappings]);

  // --- Draw preview tile when one is selected ---
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
              <option key={filename} value={filename}>{filename}</option>
            ))}
          </select>
        </div>
        {mapHeader && (
          <div className="map-info">
            <p>Map Name: {mapHeader.name}</p>
            <p>Size Constant: {mapHeader.sizeConst}</p>
            <p>Tileset: {mapHeader.tileset} → {mapHeader.actualBlockset}</p>
            {mapHeader.width !== undefined && mapHeader.height !== undefined && (
              <p>Size: {mapHeader.width}x{mapHeader.height} tiles</p>
            )}
            <p>Required Files:</p>
            <ul className="required-files">
              <li>maps/{mapHeader.name}.blk</li>
              <li>gfx/blocksets/{mapHeader.actualBlockset}.bst</li>
              <li>gfx/tilesets/{mapHeader.actualBlockset}.png</li>
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
          {tileMap && preloadedTilesets[selectedImage] && (
            <div className="tile-grid">
              {tileMap.map((row, rowIndex) => (
                <div key={rowIndex} className="tile-row">
                  {row.map((tileId, colIndex) => (
                    <TileCanvas
                      key={colIndex}
                      tileId={tileId}
                      tileset={preloadedTilesets[selectedImage]}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="tile-preview">
          {selectedTile && (
            <>
              <canvas
                ref={previewCanvasRef}
                width={TILE_SIZE * ZOOM_FACTOR}
                height={TILE_SIZE * ZOOM_FACTOR}
              />
              <p>Tile Coordinates: ({selectedTile.x}, {selectedTile.y})</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;