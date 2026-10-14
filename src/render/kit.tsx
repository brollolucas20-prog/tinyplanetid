import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  MeshStandardMaterial,
  OctahedronGeometry,
  TorusGeometry,
  type Material,
} from "three";

// ───────────────────────── modo de animação ─────────────────────────
/**
 * "live": o jogo anima com o relógio do R3F (useFrame).
 * "frame": o Remotion fornece o tempo derivado de useCurrentFrame(),
 * garantindo renderização determinística (sem flicker no vídeo).
 */
export type AnimMode = { kind: "live" } | { kind: "frame"; time: number };
export const AnimContext = createContext<AnimMode>({ kind: "live" });

export function AnimProvider({ mode, children }: { mode: AnimMode; children: ReactNode }) {
  return <AnimContext.Provider value={mode}>{children}</AnimContext.Provider>;
}

export function useAnim(cb: (t: number, dt: number) => void): void {
  const mode = useContext(AnimContext);
  const ref = useRef(cb);
  ref.current = cb;
  useFrame((state, dt) => {
    if (mode.kind === "live") ref.current(state.clock.elapsedTime, Math.min(dt, 0.1));
  });
  useLayoutEffect(() => {
    if (mode.kind === "frame") ref.current(mode.time, 1 / 30);
  });
}

export function useIsLive(): boolean {
  return useContext(AnimContext).kind === "live";
}

// ───────────────────────── materiais ─────────────────────────
interface MatOpts {
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  doubleSide?: boolean;
}
const matCache = new Map<string, MeshStandardMaterial>();
export function mat(color: string, o: MatOpts = {}): MeshStandardMaterial {
  const key = `${color}|${o.emissive ?? ""}|${o.emissiveIntensity ?? 0}|${o.metalness ?? 0}|${o.roughness ?? 0.8}|${o.opacity ?? 1}|${o.doubleSide ? 1 : 0}`;
  let m = matCache.get(key);
  if (!m) {
    m = new MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: o.roughness ?? 0.8,
      metalness: o.metalness ?? 0,
      emissive: o.emissive ?? "#000000",
      emissiveIntensity: o.emissiveIntensity ?? 0,
      transparent: (o.opacity ?? 1) < 1,
      opacity: o.opacity ?? 1,
      side: o.doubleSide ? DoubleSide : undefined,
    });
    matCache.set(key, m);
  }
  return m;
}

/** Material próprio (não compartilhado) para partes que piscam/brilham individualmente. */
export function uniqueMat(color: string, o: MatOpts = {}): MeshStandardMaterial {
  return mat(color, o).clone();
}

// ───────────────────────── geometrias ─────────────────────────
const geoCache = new Map<string, BufferGeometry>();
function cached<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

export const G = {
  box: (w: number, h: number, d: number) => cached(`b${w},${h},${d}`, () => new BoxGeometry(w, h, d)),
  cyl: (rt: number, rb: number, h: number, seg = 8) =>
    cached(`c${rt},${rb},${h},${seg}`, () => new CylinderGeometry(rt, rb, h, seg)),
  cone: (r: number, h: number, seg = 8) => cached(`k${r},${h},${seg}`, () => new ConeGeometry(r, h, seg)),
  ico: (r: number, d = 0) => cached(`i${r},${d}`, () => new IcosahedronGeometry(r, d)),
  oct: (r: number) => cached(`o${r}`, () => new OctahedronGeometry(r, 0)),
  torus: (r: number, t: number, rs = 6, ts = 16) => cached(`t${r},${t},${rs},${ts}`, () => new TorusGeometry(r, t, rs, ts)),
  /** Prisma triangular (telhado) ao longo do eixo X: base em y=0, cumeeira em y=h, largura d em Z. */
  roof: (w: number, h: number, d: number) =>
    cached(`r${w},${h},${d}`, () => {
      const g = new CylinderGeometry(1, 1, 1, 3, 1);
      g.rotateZ(Math.PI / 2);
      g.rotateX(-Math.PI / 2);
      g.scale(w, h / 1.5, d / 1.732);
      g.translate(0, h / 3, 0);
      return g;
    }),
};

type V3 = [number, number, number];
interface MProps {
  g: BufferGeometry;
  m: Material;
  p?: V3;
  r?: V3;
  s?: V3 | number;
  shadow?: boolean;
  name?: string;
}

/** Mesh curto com sombra. */
export function M({ g, m, p, r, s, shadow = true, name }: MProps) {
  return (
    <mesh
      geometry={g}
      material={m}
      position={p}
      rotation={r}
      scale={s as V3 | number | undefined}
      castShadow={shadow}
      receiveShadow={shadow}
      name={name}
    />
  );
}

/** Paleta comum aos modelos. */
export const C = {
  concrete: "#a8adb6",
  concreteDark: "#7d838e",
  white: "#f1f5f9",
  light: "#cbd5e1",
  steel: "#94a3b8",
  dark: "#334155",
  darker: "#1f2937",
  wood: "#a0662b",
  woodDark: "#7a4a1d",
  brick: "#b9532f",
  brickDark: "#8f3b20",
  roofRed: "#d64933",
  blue: "#3b82f6",
  blueDark: "#1d4ed8",
  yellow: "#facc15",
  yellowDark: "#ca8a04",
  green: "#22c55e",
  greenDark: "#15803d",
  purple: "#8b5cf6",
  orange: "#fb923c",
  glass: "#7dd3fc",
  panel: "#1e3a8a",
};
