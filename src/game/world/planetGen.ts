import { Vector3 } from "three";
import { createNoise3D } from "simplex-noise";
import type { DepositKind } from "../data/items";
import { HEIGHT_STEP, MAX_LEVEL, MIN_LEVEL, type Biome, type PlanetDef } from "../data/planets";
import { buildHexSphere, nearestTile, tilesWithin, type HexSphere } from "./geodesic";
import { mulberry32 } from "./rng";

export interface TileInfo {
  level: number;
  biome: Biome;
  region: number;
  deposit: DepositKind | null;
  depositAmount: number;
  treeCap: number;
  /** Variação de cor estável por tile. */
  tint: number;
}

export interface RegionInfo {
  id: number;
  name: string;
  tiles: number[];
  neighbors: number[];
  center: Vector3;
}

/** Dados imutáveis de um planeta gerado (não vão para o save). */
export interface PlanetWorld {
  def: PlanetDef;
  hex: HexSphere;
  tiles: TileInfo[];
  regions: RegionInfo[];
  startTile: number;
  waterRadius: number;
  /** Raio do topo de um tile. */
  topRadius: (tile: number) => number;
  /** Raio caminhável (topo ou superfície da água). */
  surfaceRadius: (tile: number) => number;
  isWater: (tile: number) => boolean;
  nearest: (dir: Vector3, hint?: number) => number;
}

const REGION_PREFIX: Record<Biome, string[]> = {
  deep: ["Abismo", "Fossa"],
  ocean: ["Baía", "Enseada", "Mar"],
  beach: ["Costa", "Praia", "Litoral"],
  grass: ["Campos", "Vale", "Planície", "Pradaria"],
  forest: ["Bosque", "Floresta", "Mata"],
  dry: ["Dunas", "Cerrado", "Savana"],
  rock: ["Serra", "Planalto", "Pico"],
  snow: ["Geleira", "Tundra", "Cume"],
};
const REGION_SUFFIX = [
  "Dourado", "Sereno", "das Brisas", "do Norte", "do Sul", "Rubro", "Esmeralda", "dos Ventos",
  "Antigo", "Profundo", "do Sol", "da Aurora", "Prateado", "Selvagem", "Oculto", "Distante",
  "das Pedras", "Cristalino", "do Eco", "Celeste", "Azul", "Vermelho", "das Névoas", "Eterno",
  "das Estrelas", "Brilhante", "Quieto", "Novo", "Velho", "Imenso", "da Lua", "Perdido",
];

export function generatePlanet(def: PlanetDef): PlanetWorld {
  const hex = buildHexSphere(def.frequency);
  const rng = mulberry32(def.seed);
  const noise = createNoise3D(rng);
  const noise2 = createNoise3D(mulberry32(def.seed * 7 + 3));
  const noise3 = createNoise3D(mulberry32(def.seed * 13 + 11));
  const n = hex.count;

  const fbm = (p: Vector3, oct: number, freq: number, nz = noise) => {
    let amp = 1, sum = 0, norm = 0, fr = freq;
    for (let o = 0; o < oct; o++) {
      sum += amp * nz(p.x * fr + o * 17.1, p.y * fr - o * 9.3, p.z * fr + o * 3.7);
      norm += amp;
      amp *= 0.5;
      fr *= 2.03;
    }
    return sum / norm;
  };

  // 1) Elevação
  const elev = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const c = hex.centers[i];
    elev[i] = fbm(c, 4, 1.25) + 0.45 * noise2(c.x * 0.7 + 5, c.y * 0.7, c.z * 0.7 - 2);
  }
  const sorted = Array.from(elev).sort((a, b) => a - b);
  const seaE = sorted[Math.floor(def.ocean * (n - 1))];
  const minE = sorted[0];
  const maxE = sorted[n - 1];

  const tiles: TileInfo[] = [];
  for (let i = 0; i < n; i++) {
    const e = elev[i];
    let level: number;
    if (e < seaE) {
      const h = (seaE - e) / Math.max(1e-6, seaE - minE);
      level = h < 0.28 ? -1 : h < 0.62 ? -2 : -3;
    } else {
      const h = (e - seaE) / Math.max(1e-6, maxE - seaE);
      level = h < 0.07 ? 0 : 1 + Math.floor(Math.pow(h, 1.25) * def.roughness * 4.6);
    }
    level = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, level));
    tiles.push({ level, biome: "grass", region: -1, deposit: null, depositAmount: 0, treeCap: 0, tint: rng() });
  }

  // 2) Ponto de partida: terra baixa perto do equador com bastante terra em volta.
  let startTile = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < n; i++) {
    const t = tiles[i];
    if (t.level < 1 || t.level > 2) continue;
    const lat = Math.abs(hex.centers[i].y);
    if (lat > 0.45) continue;
    let land = 0;
    for (const { tile } of tilesWithin(hex, i, 3)) if (tiles[tile].level >= 0) land++;
    const score = land - lat * 6 + rng() * 2;
    if (score > bestScore) {
      bestScore = score;
      startTile = i;
    }
  }
  const startLevel = Math.max(1, Math.min(2, tiles[startTile].level));
  for (const { tile, dist } of tilesWithin(hex, startTile, 4)) {
    const t = tiles[tile];
    if (dist <= 1) t.level = startLevel;
    else if (dist <= 3) t.level = Math.max(1, Math.min(3, t.level));
    else if (t.level < 0) t.level = 0;
  }

  // 3) Biomas
  const isWaterL = (l: number) => l < 0;
  for (let i = 0; i < n; i++) {
    const t = tiles[i];
    const c = hex.centers[i];
    const lat = Math.abs(c.y);
    const temp =
      1 - Math.pow(lat, 1.4) * 1.35 + def.warmth * 0.6 - Math.max(0, t.level - 2) * 0.12 +
      noise3(c.x * 2, c.y * 2, c.z * 2) * 0.15;
    const moist = def.moisture + fbm(c, 3, 1.8, noise3) * 0.45;
    if (isWaterL(t.level)) {
      t.biome = t.level <= -2 ? "deep" : "ocean";
      continue;
    }
    const nearWater = hex.neighbors[i].some((nb) => isWaterL(tiles[nb].level));
    if (temp < 0.1) t.biome = "snow";
    else if (t.level >= 4) t.biome = temp < 0.4 ? "snow" : "rock";
    else if (t.level === 0 && nearWater) t.biome = "beach";
    else if (moist > 0.6 && temp > 0.15) t.biome = "forest";
    else if (moist < 0.22 || temp > 1.1) t.biome = "dry";
    else t.biome = "grass";
  }

  // 4) Árvores
  for (let i = 0; i < n; i++) {
    const t = tiles[i];
    const r = rng();
    if (t.biome === "forest") t.treeCap = 2 + (r < 0.5 ? 1 : 0);
    else if (t.biome === "grass") t.treeCap = r < 0.22 ? 1 + (r < 0.08 ? 1 : 0) : 0;
    else if (t.biome === "dry") t.treeCap = r < 0.06 ? 1 : 0;
    else if (t.biome === "snow") t.treeCap = r < 0.05 ? 1 : 0;
  }

  // 5) Depósitos
  const startArea = new Map<number, number>();
  for (const { tile, dist } of tilesWithin(hex, startTile, 4)) startArea.set(tile, dist);
  const setDeposit = (tile: number, kind: DepositKind, richness = 1) => {
    const t = tiles[tile];
    if (t.level < 0 || t.biome === "beach") return false;
    t.deposit = kind;
    t.depositAmount = Math.round((900 + rng() * 1500) * richness * (kind === "crystal" ? 0.6 : 1));
    t.treeCap = 0;
    return true;
  };
  const cluster = (center: number, kind: DepositKind, size: number) => {
    setDeposit(center, kind);
    for (const { tile, dist } of tilesWithin(hex, center, 2)) {
      if (tile === center || tiles[tile].deposit) continue;
      if ((startArea.get(tile) ?? 99) <= 1) continue;
      const p = dist === 1 ? 0.55 * size : 0.18 * size;
      if (rng() < p) setDeposit(tile, kind);
    }
  };

  // Garante recursos básicos (e o especial do planeta) perto da Sede.
  const ring = tilesWithin(hex, startTile, 3).filter((x) => x.dist === 3).map((x) => x.tile);
  const sc = hex.centers[startTile];
  const ref = new Vector3(0, 1, 0).addScaledVector(sc, -sc.y).normalize();
  const side = new Vector3().crossVectors(sc, ref);
  const ringAngle = (tile: number) => {
    const d = hex.centers[tile].clone().sub(sc);
    return Math.atan2(d.dot(side), d.dot(ref));
  };
  ring.sort((a, b) => ringAngle(a) - ringAngle(b));
  const guaranteed: (DepositKind | "forest")[] = ["ironOre", "forest", "stone", "copperOre", "forest", "coal"];
  if (def.special) guaranteed.splice(3, 0, def.special);
  guaranteed.forEach((kind, k) => {
    const tile = ring[Math.floor((k / guaranteed.length) * ring.length)];
    if (tile === undefined) return;
    if (kind === "forest") {
      for (const { tile: t2, dist } of tilesWithin(hex, tile, 1)) {
        const t = tiles[t2];
        if (t.level < 1 || t.deposit || (startArea.get(t2) ?? 99) <= 1) continue;
        if (dist === 0 || rng() < 0.8) {
          t.biome = "forest";
          t.treeCap = 3;
        }
      }
    } else {
      const t = tiles[tile];
      if (t.level < 1) t.level = 1;
      setDeposit(tile, kind, 1.2);
      for (const nb of hex.neighbors[tile]) {
        if ((startArea.get(nb) ?? 99) >= 2 && !tiles[nb].deposit && rng() < 0.55) {
          if (tiles[nb].level < 1) tiles[nb].level = 1;
          if (tiles[nb].biome === "beach") tiles[nb].biome = "grass";
          setDeposit(nb, kind, 1.2);
        }
      }
    }
  });

  for (const [kind, weight] of Object.entries(def.deposits) as [DepositKind, number][]) {
    const clusters = Math.round((weight * n) / 105);
    for (let k = 0; k < clusters; k++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const tile = Math.floor(rng() * n);
        const t = tiles[tile];
        if (t.level < 1 || t.deposit || startArea.has(tile)) continue;
        if (kind === "crystal" && t.biome !== "snow" && t.biome !== "rock" && rng() < 0.7) continue;
        cluster(tile, kind, 1);
        break;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const t = tiles[i];
    if (t.biome === "rock" && !t.deposit && rng() < 0.3) setDeposit(i, "stone");
  }

  // 6) Regiões: região inicial = raio 4 da Sede; as demais crescem a partir de sementes distantes.
  const regionOf = new Int32Array(n).fill(-1);
  for (const [tile] of startArea) regionOf[tile] = 0;
  const seeds = [startTile];
  const minAng = new Float32Array(n).fill(Infinity);
  const updateMin = (s: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.acos(Math.min(1, Math.max(-1, hex.centers[i].dot(hex.centers[s]))));
      if (a < minAng[i]) minAng[i] = a;
    }
  };
  for (const [tile] of startArea) updateMin(tile);
  for (let r = 1; r < def.regions; r++) {
    let best = -1, bestA = -1;
    for (let i = 0; i < n; i++) if (regionOf[i] === -1 && minAng[i] > bestA) { bestA = minAng[i]; best = i; }
    if (best < 0) break;
    seeds.push(best);
    regionOf[best] = r;
    updateMin(best);
  }
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (regionOf[i] >= 0) queue.push(i);
  for (let qi = 0; qi < queue.length; qi++) {
    const t = queue[qi];
    for (const nb of hex.neighbors[t]) {
      if (regionOf[nb] === -1) {
        regionOf[nb] = regionOf[t];
        queue.push(nb);
      }
    }
  }
  const regionCount = seeds.length;
  const regions: RegionInfo[] = Array.from({ length: regionCount }, (_, id) => ({
    id,
    name: "",
    tiles: [],
    neighbors: [],
    center: new Vector3(),
  }));
  for (let i = 0; i < n; i++) {
    tiles[i].region = regionOf[i];
    regions[regionOf[i]].tiles.push(i);
    regions[regionOf[i]].center.add(hex.centers[i]);
  }
  const usedNames = new Set<string>();
  for (const reg of regions) {
    reg.center.normalize();
    const nb = new Set<number>();
    const biomeCount = new Map<Biome, number>();
    for (const t of reg.tiles) {
      for (const x of hex.neighbors[t]) if (regionOf[x] !== reg.id) nb.add(regionOf[x]);
      const b = tiles[t].biome;
      biomeCount.set(b, (biomeCount.get(b) ?? 0) + 1);
    }
    reg.neighbors = [...nb];
    let main: Biome = "grass";
    let mc = -1;
    for (const [b, c] of biomeCount) if (c > mc) { mc = c; main = b; }
    if (reg.id === 0) {
      reg.name = "Marco Zero";
      continue;
    }
    for (let attempt = 0; attempt < 20; attempt++) {
      const pre = REGION_PREFIX[main][Math.floor(rng() * REGION_PREFIX[main].length)];
      const suf = REGION_SUFFIX[Math.floor(rng() * REGION_SUFFIX.length)];
      const name = `${pre} ${suf}`;
      if (!usedNames.has(name) || attempt === 19) {
        usedNames.add(name);
        reg.name = name;
        break;
      }
    }
  }

  const R = def.radius;
  const waterRadius = R - HEIGHT_STEP * 0.45;
  const topRadius = (tile: number) => R + tiles[tile].level * HEIGHT_STEP;
  return {
    def,
    hex,
    tiles,
    regions,
    startTile,
    waterRadius,
    topRadius,
    surfaceRadius: (tile) => Math.max(topRadius(tile), waterRadius),
    isWater: (tile) => tiles[tile].level < 0,
    nearest: (dir, hint) => nearestTile(hex, dir, hint),
  };
}

const cache = new Map<string, PlanetWorld>();
export function getWorld(def: PlanetDef): PlanetWorld {
  let w = cache.get(def.id);
  if (!w) {
    w = generatePlanet(def);
    cache.set(def.id, w);
  }
  return w;
}
