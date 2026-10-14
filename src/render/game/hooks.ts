import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Ray, Vector3 } from "three";
import { HEIGHT_STEP, MAX_LEVEL } from "@/game/data/planets";
import type { PlanetWorld } from "@/game/world/planetGen";

/** Re-renderiza quando o valor lido do motor muda (verificado a cada quadro). */
export function usePolled<T>(read: () => T): T {
  const [value, setValue] = useState<T>(read);
  useFrame(() => {
    const v = read();
    if (v !== value) setValue(v);
  });
  return value;
}

const p = new Vector3();
const dirTmp = new Vector3();

/** Encontra o tile atingido por um raio (marcha sobre a casca esférica). */
export function pickTile(world: PlanetWorld, ray: Ray, hint = 0): number {
  const R = world.def.radius;
  const rMax = R + MAX_LEVEL * HEIGHT_STEP + 0.1;
  const o = ray.origin;
  const d = ray.direction;
  const b = o.dot(d);
  const c = o.dot(o) - rMax * rMax;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const sq = Math.sqrt(disc);
  let t = Math.max(0, -b - sq);
  const tEnd = -b + sq;
  let tile = hint;
  for (let i = 0; i < 700 && t <= tEnd; i++) {
    p.copy(d).multiplyScalar(t).add(o);
    const r = p.length();
    dirTmp.copy(p).divideScalar(r);
    tile = world.nearest(dirTmp, tile);
    if (r <= world.surfaceRadius(tile) + 0.02) return tile;
    t += 0.07;
  }
  return -1;
}

export function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
