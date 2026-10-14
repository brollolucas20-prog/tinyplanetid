import { Vector3 } from "three";
import type { BuildingTypeId } from "@/game/data/buildings";
import { tilesWithin } from "@/game/world/geodesic";
import type { PlanetWorld } from "@/game/world/planetGen";

export interface DemoBuilding {
  type: BuildingTypeId;
  tile: number;
  rot: number;
  /** Ordem de aparição (0 = primeiro). */
  order: number;
}

export interface DemoLayout {
  buildings: DemoBuilding[];
  roads: Map<number, number>;
  occupied: Set<number>;
}

const FILLERS: BuildingTypeId[] = [
  "smelter",
  "assembler",
  "biomassGen",
  "lab",
  "sawmill",
  "smelter",
  "factory",
  "solarPanel",
  "warehouse",
  "coalGen",
  "assembler",
  "purifier",
  "solarPanel",
  "nursery",
  "droneHub",
  "fusion",
  "smelter",
  "lab",
];

/**
 * Cidade industrial de demonstração ao redor da Sede, usada pelas
 * composições do Remotion (tela de título e trailer). Anel 1 e anel 3 são
 * estradas; anéis 2 e 4 recebem fábricas e mineradoras.
 */
export function demoLayout(world: PlanetWorld): DemoLayout {
  const hex = world.hex;
  const start = world.startTile;
  const area = tilesWithin(hex, start, 5);
  const distOf = new Map(area.map((a) => [a.tile, a.dist]));
  const buildings: DemoBuilding[] = [{ type: "hq", tile: start, rot: 0, order: 0 }];
  const roads = new Map<number, number>();
  const occupied = new Set<number>([start]);
  let order = 1;

  const land = (t: number) => world.tiles[t].level >= 0;
  const ring = (r: number) => area.filter((a) => a.dist === r).map((a) => a.tile);
  const sc = hex.centers[start];
  const ref = new Vector3(0, 1, 0).addScaledVector(sc, -sc.y).normalize();
  const side = new Vector3().crossVectors(sc, ref);
  const angle = (t: number) => {
    const d = hex.centers[t].clone().sub(sc);
    return Math.atan2(d.dot(side), d.dot(ref));
  };

  for (const t of ring(1)) if (land(t)) {
    roads.set(t, order++);
    occupied.add(t);
  }
  const r2 = ring(2).sort((a, b) => angle(a) - angle(b));
  r2.forEach((t, i) => {
    if (i % Math.ceil(r2.length / 3) === 0 && land(t)) {
      roads.set(t, order++);
      occupied.add(t);
    }
  });
  const r3 = ring(3).sort((a, b) => angle(a) - angle(b));
  for (const t of r3) {
    if (!land(t)) continue;
    if (world.tiles[t].deposit) continue;
    roads.set(t, order++);
    occupied.add(t);
  }

  const rotToRoad = (t: number) => {
    const k = hex.neighbors[t].findIndex((nb) => roads.has(nb) || nb === start);
    return Math.max(0, k);
  };

  let filler = 0;
  const place = (t: number) => {
    if (occupied.has(t) || !land(t)) return;
    const info = world.tiles[t];
    let type: BuildingTypeId;
    if (info.deposit) type = "miner";
    else if (hex.neighbors[t].some((nb) => world.tiles[nb].biome === "forest" && !occupied.has(nb))) type = filler % 3 === 0 ? "woodcutter" : FILLERS[filler++ % FILLERS.length];
    else if (info.level >= 3) type = "windTurbine";
    else type = FILLERS[filler++ % FILLERS.length];
    if (type === "woodcutter") filler++;
    buildings.push({ type, tile: t, rot: rotToRoad(t), order: order++ });
    occupied.add(t);
  };
  for (const t of r2) place(t);
  for (const t of r3) if (world.tiles[t].deposit) place(t);
  const r4 = ring(4).sort((a, b) => angle(a) - angle(b));
  r4.forEach((t, i) => {
    if (i % 4 === 3) return;
    place(t);
  });
  // plataforma de lançamento num ponto de destaque do anel 4
  const padTile = r4.find((t) => !occupied.has(t) && land(t) && !world.tiles[t].deposit && (distOf.get(t) ?? 0) === 4);
  if (padTile !== undefined) {
    buildings.push({ type: "rocketPad", tile: padTile, rot: rotToRoad(padTile), order: order++ });
    occupied.add(padTile);
  }
  return { buildings, roads, occupied };
}
