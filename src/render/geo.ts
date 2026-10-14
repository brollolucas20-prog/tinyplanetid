import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import { DEPOSIT_COLORS, type DepositKind } from "@/game/data/items";
import { HEIGHT_STEP, MIN_LEVEL } from "@/game/data/planets";
import type { PlanetWorld } from "@/game/world/planetGen";
import { hash01 } from "@/game/world/rng";

const _up = new Vector3();
const _fwd = new Vector3();
const _right = new Vector3();
const _m = new Matrix4();

/** Quaternion que alinha +Y à normal do tile e +Z ao vizinho `rot`. */
export function tileQuaternion(world: PlanetWorld, tile: number, rot: number, out = new Quaternion()): Quaternion {
  const hex = world.hex;
  const c = hex.centers[tile];
  const nb = hex.centers[hex.neighbors[tile][rot % hex.neighbors[tile].length]];
  _up.copy(c);
  _fwd.subVectors(nb, c);
  _fwd.addScaledVector(_up, -_fwd.dot(_up)).normalize();
  _right.crossVectors(_up, _fwd).normalize();
  _m.makeBasis(_right, _up, _fwd);
  return out.setFromRotationMatrix(_m);
}

/** Quaternion com +Y na direção `up` e +Z em `fwd` (já tangente). */
export function frameQuaternion(up: Vector3, fwd: Vector3, out = new Quaternion()): Quaternion {
  _up.copy(up).normalize();
  _fwd.copy(fwd).addScaledVector(_up, -fwd.dot(_up)).normalize();
  _right.crossVectors(_up, _fwd).normalize();
  _m.makeBasis(_right, _up, _fwd);
  return out.setFromRotationMatrix(_m);
}

export function tileTop(world: PlanetWorld, tile: number, out = new Vector3(), extra = 0): Vector3 {
  return out.copy(world.hex.centers[tile]).multiplyScalar(world.surfaceRadius(tile) + extra);
}

// ───────────────────────────── terreno ─────────────────────────────
export interface TerrainMesh {
  geometry: BufferGeometry;
  /** Para cada tile: [início, quantidade] de vértices por camada (topo, borda, paredes). */
  ranges: Int32Array;
}

const INSET = 0.86;
const BEVEL = 0.05;

export function buildTerrain(world: PlanetWorld): TerrainMesh {
  const { hex } = world;
  const positions: number[] = [];
  const ranges = new Int32Array(hex.count * 6);
  const R = world.def.radius;
  const bottom = R + (MIN_LEVEL - 1.5) * HEIGHT_STEP;
  const v = new Vector3();
  const push = (p: Vector3) => positions.push(p.x, p.y, p.z);
  const tri = (a: Vector3, b: Vector3, c: Vector3) => {
    push(a);
    push(b);
    push(c);
  };
  const corner = (dir: Vector3, r: number) => new Vector3().copy(dir).multiplyScalar(r);

  for (let i = 0; i < hex.count; i++) {
    const top = world.topRadius(i);
    const center = hex.centers[i];
    const cs = hex.corners[i];
    const k = cs.length;
    const innerDirs = cs.map((c) => v.copy(center).lerp(c, INSET).normalize().clone());

    // topo interno
    let start = positions.length / 3;
    const cTop = corner(center, top);
    for (let j = 0; j < k; j++) tri(cTop, corner(innerDirs[j], top), corner(innerDirs[(j + 1) % k], top));
    ranges[i * 6] = start;
    ranges[i * 6 + 1] = positions.length / 3 - start;

    // borda chanfrada
    start = positions.length / 3;
    for (let j = 0; j < k; j++) {
      const a = corner(innerDirs[j], top);
      const b = corner(innerDirs[(j + 1) % k], top);
      const ao = corner(cs[j], top - BEVEL);
      const bo = corner(cs[(j + 1) % k], top - BEVEL);
      tri(a, ao, bo);
      tri(a, bo, b);
    }
    ranges[i * 6 + 2] = start;
    ranges[i * 6 + 3] = positions.length / 3 - start;

    // paredes (só onde o vizinho é mais baixo)
    start = positions.length / 3;
    for (let j = 0; j < k; j++) {
      const nb = hex.neighbors[i][j];
      const nbTop = world.topRadius(nb);
      if (nbTop >= top - 1e-4) continue;
      const low = Math.max(bottom, nbTop - BEVEL - 0.02);
      const ao = corner(cs[j], top - BEVEL);
      const bo = corner(cs[(j + 1) % k], top - BEVEL);
      const al = corner(cs[j], low);
      const bl = corner(cs[(j + 1) % k], low);
      tri(ao, al, bl);
      tri(ao, bl, bo);
    }
    ranges[i * 6 + 4] = start;
    ranges[i * 6 + 5] = positions.length / 3 - start;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(positions.length), 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { geometry, ranges };
}

export interface PaintOptions {
  pollution?: ArrayLike<number>;
  owned?: Uint8Array;
  trees?: ArrayLike<number>;
  /** Região destacada (hover de compra). */
  highlightRegion?: number;
}

const POLLUTED = new Color("#6f604c");
const CLIFF = new Color("#8a6a4c");
const tmpC = new Color();
const tmpC2 = new Color();
const paletteCache = new Map<string, Color>();
const pc = (hexColor: string) => {
  let c = paletteCache.get(hexColor);
  if (!c) {
    c = new Color(hexColor);
    paletteCache.set(hexColor, c);
  }
  return c;
};

export function tileColor(world: PlanetWorld, tile: number, opts: PaintOptions, out: Color): Color {
  const t = world.tiles[tile];
  out.copy(pc(world.def.palette[t.biome]));
  const trees = opts.trees ? opts.trees[tile] : t.treeCap;
  if ((t.biome === "grass" || t.biome === "forest") && trees > 0) out.multiplyScalar(0.92 - trees * 0.03);
  if (t.biome === "forest" && trees === 0) out.lerp(pc(world.def.palette.grass), 0.6);
  out.multiplyScalar(0.94 + t.tint * 0.12);
  const p = opts.pollution ? opts.pollution[tile] : 0;
  if (p > 0.5 && t.level >= 0) out.lerp(POLLUTED, Math.min(0.75, p / 55));
  else if (p > 0.5) out.lerp(POLLUTED, Math.min(0.4, p / 80));
  if (opts.owned && !opts.owned[t.region]) {
    const l = out.r * 0.3 + out.g * 0.59 + out.b * 0.11;
    tmpC2.setRGB(l, l, l * 1.08);
    out.lerp(tmpC2, 0.55).multiplyScalar(0.62);
    if (opts.highlightRegion === t.region) out.lerp(pc("#ffe08a"), 0.35).multiplyScalar(1.25);
  }
  return out;
}

export function paintTerrain(world: PlanetWorld, mesh: TerrainMesh, opts: PaintOptions): void {
  const attr = mesh.geometry.getAttribute("color") as BufferAttribute;
  const arr = attr.array as Float32Array;
  const { ranges } = mesh;
  const base = new Color();
  for (let i = 0; i < world.hex.count; i++) {
    tileColor(world, i, opts, base);
    const isLand = world.tiles[i].level >= 0;
    const layers: [number, number, Color][] = [
      [ranges[i * 6], ranges[i * 6 + 1], base],
      [ranges[i * 6 + 2], ranges[i * 6 + 3], tmpC.copy(base).multiplyScalar(0.86)],
    ];
    for (const [s, n, c] of layers) {
      for (let v = s; v < s + n; v++) {
        arr[v * 3] = c.r;
        arr[v * 3 + 1] = c.g;
        arr[v * 3 + 2] = c.b;
      }
    }
    const wc = tmpC.copy(base);
    if (isLand && world.tiles[i].biome !== "beach" && world.tiles[i].biome !== "snow") wc.lerp(CLIFF, 0.55);
    wc.multiplyScalar(0.72);
    for (let v = ranges[i * 6 + 4]; v < ranges[i * 6 + 4] + ranges[i * 6 + 5]; v++) {
      arr[v * 3] = wc.r;
      arr[v * 3 + 1] = wc.g;
      arr[v * 3 + 2] = wc.b;
    }
  }
  attr.needsUpdate = true;
}

// ───────────────────────────── árvores ─────────────────────────────
export interface InstanceData {
  matrices: Matrix4[];
  colors: Color[];
}

const q = new Quaternion();
const s = new Vector3();
const p = new Vector3();
const off = new Vector3();
const ax1 = new Vector3();
const ax2 = new Vector3();

function tangentBasis(n: Vector3) {
  ax1.set(0, 1, 0);
  if (Math.abs(n.y) > 0.9) ax1.set(1, 0, 0);
  ax1.addScaledVector(n, -ax1.dot(n)).normalize();
  ax2.crossVectors(n, ax1);
}

export interface TreeInstances {
  trunks: InstanceData;
  pines: InstanceData;
  rounds: InstanceData;
}

const TRUNK = new Color("#7a5232");
const PINE = new Color("#2f7d4f");
const ROUND = new Color("#4fae4a");
const DEAD = new Color("#8a7a55");

export function buildTrees(
  world: PlanetWorld,
  trees: ArrayLike<number>,
  pollution?: ArrayLike<number>,
  skipTile?: (tile: number) => boolean,
): TreeInstances {
  const out: TreeInstances = {
    trunks: { matrices: [], colors: [] },
    pines: { matrices: [], colors: [] },
    rounds: { matrices: [], colors: [] },
  };
  const hex = world.hex;
  const tileSize = (world.def.radius / world.def.frequency) * 1.1;
  for (let i = 0; i < hex.count; i++) {
    const count = trees[i];
    if (!count || (skipTile && skipTile(i))) continue;
    const n = hex.centers[i];
    const t = world.tiles[i];
    tangentBasis(n);
    const r = world.surfaceRadius(i);
    const pol = pollution ? Math.min(1, pollution[i] / 50) : 0;
    for (let k = 0; k < count; k++) {
      const h1 = hash01(i * 13 + k * 101 + world.def.seed);
      const h2 = hash01(i * 31 + k * 57 + 7);
      const h3 = hash01(i * 17 + k * 11 + 3);
      const ang = (k / Math.max(1, count)) * Math.PI * 2 + h1 * 1.4;
      const dist = count === 1 ? h2 * 0.15 : 0.2 + h2 * 0.17;
      off.copy(ax1).multiplyScalar(Math.cos(ang) * dist * tileSize).addScaledVector(ax2, Math.sin(ang) * dist * tileSize);
      p.copy(n).multiplyScalar(r).add(off);
      const up = p.clone().normalize();
      q.setFromUnitVectors(new Vector3(0, 1, 0), up);
      const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), h3 * Math.PI * 2);
      q.multiply(yaw);
      const sc = 0.75 + h3 * 0.5;
      // tronco
      s.set(sc, sc, sc);
      out.trunks.matrices.push(new Matrix4().compose(p.clone(), q.clone(), s.clone()));
      out.trunks.colors.push(TRUNK.clone());
      const pine = t.biome === "snow" || t.biome === "rock" || (t.biome === "forest" && h1 < 0.45) || world.def.warmth < -0.3;
      const canopyPos = p.clone().addScaledVector(up, 0.32 * sc);
      const col = (pine ? PINE : ROUND).clone();
      if (world.def.id !== "verdalia") col.lerp(pc(world.def.palette.forest), 0.45);
      col.offsetHSL((h2 - 0.5) * 0.04, 0, (h1 - 0.5) * 0.08);
      if (t.biome === "snow") col.lerp(new Color("#dfeee8"), 0.35);
      if (pol > 0) col.lerp(DEAD, pol * 0.85);
      const target = pine ? out.pines : out.rounds;
      target.matrices.push(new Matrix4().compose(canopyPos, q.clone(), new Vector3(sc, sc * (pine ? 1.1 : 0.95), sc)));
      target.colors.push(col);
    }
  }
  return out;
}

// ───────────────────────────── depósitos ─────────────────────────────
export interface RockInstances {
  rocks: InstanceData;
  ores: InstanceData;
}

export function buildRocks(
  world: PlanetWorld,
  deposit: ArrayLike<number>,
  skipTile?: (tile: number) => boolean,
): RockInstances {
  const out: RockInstances = { rocks: { matrices: [], colors: [] }, ores: { matrices: [], colors: [] } };
  const hex = world.hex;
  for (let i = 0; i < hex.count; i++) {
    const t = world.tiles[i];
    if (!t.deposit || deposit[i] <= 0 || (skipTile && skipTile(i))) continue;
    const kind = t.deposit as DepositKind;
    const frac = Math.max(0.45, Math.min(1, deposit[i] / Math.max(1, t.depositAmount)));
    const n = hex.centers[i];
    tangentBasis(n);
    const r = world.topRadius(i);
    const colors = DEPOSIT_COLORS[kind];
    const rockCount = 3;
    for (let k = 0; k < rockCount; k++) {
      const h1 = hash01(i * 7 + k * 13);
      const h2 = hash01(i * 11 + k * 29 + 5);
      const ang = (k / rockCount) * Math.PI * 2 + h1;
      const dist = 0.25 + h2 * 0.25;
      off.copy(ax1).multiplyScalar(Math.cos(ang) * dist).addScaledVector(ax2, Math.sin(ang) * dist);
      p.copy(n).multiplyScalar(r).add(off);
      const up = p.clone().normalize();
      q.setFromUnitVectors(new Vector3(0, 1, 0), up);
      q.multiply(new Quaternion().setFromEuler(new Euler(h1 * 0.6, h2 * 6, h1 * 0.4)));
      const sc = (0.17 + h2 * 0.13) * frac;
      out.rocks.matrices.push(new Matrix4().compose(p.clone(), q.clone(), new Vector3(sc * 1.2, sc * 0.8, sc)));
      out.rocks.colors.push(pc(colors.rock).clone().offsetHSL(0, 0, (h1 - 0.5) * 0.08));
      // pepitas de minério
      const pp = p.clone().addScaledVector(up, sc * 0.6).addScaledVector(ax1, (h2 - 0.5) * 0.1);
      const osc = sc * (kind === "crystal" ? 1.1 : 0.75);
      out.ores.matrices.push(
        new Matrix4().compose(pp, q.clone(), new Vector3(osc, osc * (kind === "crystal" ? 2.2 : 1), osc)),
      );
      out.ores.colors.push(pc(colors.ore).clone());
    }
  }
  return out;
}

// ───────────────────────────── estradas ─────────────────────────────
export function buildRoads(
  world: PlanetWorld,
  isRoad: (tile: number) => boolean,
  connects: (tile: number) => boolean,
  paved: boolean,
): BufferGeometry {
  const hex = world.hex;
  const positions: number[] = [];
  const colors: number[] = [];
  const asphalt = new Color(paved ? "#4a4f5c" : "#a98b62");
  const bridge = new Color("#8b5e3c");
  const line = new Color(paved ? "#f5d76e" : "#c9ad84");
  const push = (v: Vector3, c: Color) => {
    positions.push(v.x, v.y, v.z);
    colors.push(c.r, c.g, c.b);
  };
  const quad = (a: Vector3, b: Vector3, c: Vector3, d: Vector3, col: Color) => {
    push(a, col);
    push(b, col);
    push(c, col);
    push(a, col);
    push(c, col);
    push(d, col);
  };
  const tmp = new Vector3();
  for (let i = 0; i < hex.count; i++) {
    if (!isRoad(i)) continue;
    const water = world.isWater(i);
    const r = world.surfaceRadius(i) + (water ? 0.12 : 0.035);
    const col = water ? bridge : asphalt;
    const c = hex.centers[i];
    const cs = hex.corners[i];
    const k = cs.length;
    // placa central
    const inner = cs.map((cc) => tmp.copy(c).lerp(cc, 0.42).normalize().multiplyScalar(r).clone());
    const cc = c.clone().multiplyScalar(r);
    for (let j = 0; j < k; j++) {
      push(cc, col);
      push(inner[j], col);
      push(inner[(j + 1) % k], col);
    }
    // braços até os vizinhos conectados
    for (let j = 0; j < k; j++) {
      const nb = hex.neighbors[i][j];
      if (!isRoad(nb) && !connects(nb)) continue;
      const mid = tmp.copy(cs[j]).add(cs[(j + 1) % k]).normalize().clone();
      const dir = mid.clone().sub(c);
      const side = new Vector3().crossVectors(c, dir).normalize();
      const halfW = 0.2 * (world.def.radius / 16);
      const a = c.clone().addScaledVector(side, halfW).normalize().multiplyScalar(r);
      const b = c.clone().addScaledVector(side, -halfW).normalize().multiplyScalar(r);
      const reach = isRoad(nb) ? 1.0 : 0.96;
      const endC = c.clone().lerp(mid, reach);
      const a2 = endC.clone().addScaledVector(side, halfW).normalize().multiplyScalar(r);
      const b2 = endC.clone().addScaledVector(side, -halfW).normalize().multiplyScalar(r);
      quad(a, b, b2, a2, col);
      if (paved && !water) {
        const lw = halfW * 0.12;
        const mStart = c.clone().lerp(mid, 0.35);
        const mEnd = c.clone().lerp(mid, 0.75);
        const l1 = mStart.clone().addScaledVector(side, lw).normalize().multiplyScalar(r + 0.004);
        const l2 = mStart.clone().addScaledVector(side, -lw).normalize().multiplyScalar(r + 0.004);
        const l3 = mEnd.clone().addScaledVector(side, -lw).normalize().multiplyScalar(r + 0.004);
        const l4 = mEnd.clone().addScaledVector(side, lw).normalize().multiplyScalar(r + 0.004);
        quad(l1, l2, l3, l4, line);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  g.computeVertexNormals();
  return g;
}

// ───────────────────────────── fronteiras ─────────────────────────────
export function buildBorders(world: PlanetWorld, owned: Uint8Array): BufferGeometry {
  const hex = world.hex;
  const pos: number[] = [];
  for (let i = 0; i < hex.count; i++) {
    if (!owned[world.tiles[i].region]) continue;
    const cs = hex.corners[i];
    const k = cs.length;
    for (let j = 0; j < k; j++) {
      const nb = hex.neighbors[i][j];
      if (owned[world.tiles[nb].region]) continue;
      const r = Math.max(world.surfaceRadius(i), world.surfaceRadius(nb)) + 0.06;
      const a = cs[j].clone().multiplyScalar(r);
      const b = cs[(j + 1) % k].clone().multiplyScalar(r);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  return g;
}

/** Contorno hexagonal de um tile (para o cursor). */
export function tileOutline(world: PlanetWorld, tile: number, lift = 0.07): Float32Array {
  const cs = world.hex.corners[tile];
  const r = world.surfaceRadius(tile) + lift;
  const out = new Float32Array((cs.length + 1) * 3);
  for (let j = 0; j <= cs.length; j++) {
    const c = cs[j % cs.length];
    out[j * 3] = c.x * r;
    out[j * 3 + 1] = c.y * r;
    out[j * 3 + 2] = c.z * r;
  }
  return out;
}

/** Polígono de cobertura de vários tiles (região destacada). */
export function buildTileOverlay(world: PlanetWorld, tiles: number[], lift = 0.05): BufferGeometry {
  const pos: number[] = [];
  for (const i of tiles) {
    const r = world.surfaceRadius(i) + lift;
    const c = world.hex.centers[i].clone().multiplyScalar(r);
    const cs = world.hex.corners[i];
    for (let j = 0; j < cs.length; j++) {
      const a = cs[j].clone().multiplyScalar(r);
      const b = cs[(j + 1) % cs.length].clone().multiplyScalar(r);
      pos.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}
