import { useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, IcosahedronGeometry, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from "three";

/** Sistema de partículas global (fumaça, poeira, chamas). */
interface Particle {
  pos: Vector3;
  vel: Vector3;
  age: number;
  life: number;
  size0: number;
  size1: number;
  color: Color;
  drag: number;
}

const MAX = 900;
const pool: Particle[] = [];

export function spawnParticle(pos: Vector3, vel: Vector3, color: string | Color, life = 2.5, size0 = 0.08, size1 = 0.4, drag = 0.6) {
  if (pool.length >= MAX) pool.shift();
  pool.push({
    pos: pos.clone(),
    vel: vel.clone(),
    age: 0,
    life,
    size0,
    size1,
    color: color instanceof Color ? color.clone() : new Color(color),
    drag,
  });
}

const tmpV = new Vector3();
export function spawnBurst(pos: Vector3, up: Vector3, color: string, n = 14, speed = 1.6) {
  for (let i = 0; i < n; i++) {
    tmpV.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    tmpV.addScaledVector(up, -tmpV.dot(up)).normalize().multiplyScalar(speed * (0.5 + Math.random()));
    tmpV.addScaledVector(up, 0.8 + Math.random() * 1.2);
    spawnParticle(pos, tmpV, color, 0.6 + Math.random() * 0.5, 0.12, 0.02, 2.2);
  }
}

export function clearParticles() {
  pool.length = 0;
}

export function Particles() {
  const geometry = useMemo(() => new IcosahedronGeometry(1, 1), []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#ffffff",
        flatShading: true,
        roughness: 1,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        emissive: "#3a3f4d",
        emissiveIntensity: 0.6,
      }),
    [],
  );
  const mesh = useMemo(() => {
    const m = new InstancedMesh(geometry, material, MAX);
    m.frustumCulled = false;
    m.count = 0;
    return m;
  }, [geometry, material]);
  useLayoutEffect(() => {
    mesh.setColorAt(0, new Color());
  }, [mesh]);
  const m4 = useMemo(() => new Matrix4(), []);
  const q = useMemo(() => new Quaternion(), []);
  const s = useMemo(() => new Vector3(), []);
  const c = useMemo(() => new Color(), []);
  useFrame((_st, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    let n = 0;
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i];
      p.age += dt;
      if (p.age >= p.life) {
        pool.splice(i, 1);
        continue;
      }
    }
    for (const p of pool) {
      p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      const k = p.age / p.life;
      const size = p.size0 + (p.size1 - p.size0) * Math.sqrt(k);
      const fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      s.setScalar(Math.max(0.001, size * fade));
      m4.compose(p.pos, q, s);
      mesh.setMatrixAt(n, m4);
      c.copy(p.color);
      mesh.setColorAt(n, c);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}
