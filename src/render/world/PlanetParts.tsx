import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  Color,
  FrontSide,
  IcosahedronGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  ShaderMaterial,
  Vector3,
  type BufferGeometry,
  type Group,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { PlanetWorld } from "@/game/world/planetGen";
import { mulberry32 } from "@/game/world/rng";
import {
  buildBorders,
  buildRocks,
  buildRoads,
  buildTerrain,
  buildTrees,
  paintTerrain,
  type InstanceData,
  type PaintOptions,
} from "../geo";
import { useAnim } from "../kit";

// ───────────────────────────── Terreno ─────────────────────────────
export function Terrain({ world, paint, version }: { world: PlanetWorld; paint: () => PaintOptions; version: unknown }) {
  const mesh = useMemo(() => buildTerrain(world), [world]);
  const material = useMemo(
    () => new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 }),
    [],
  );
  useLayoutEffect(() => {
    paintTerrain(world, mesh, paint());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, mesh, version]);
  return <mesh geometry={mesh.geometry} material={material} receiveShadow castShadow />;
}

// ───────────────────────────── Água ─────────────────────────────
export function Water({ world }: { world: PlanetWorld }) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const geometry = useMemo(() => new IcosahedronGeometry(world.waterRadius, 18), [world]);
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: world.def.water,
      transparent: true,
      opacity: 0.8,
      roughness: 0.18,
      metalness: 0.05,
      flatShading: true,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float w = sin(position.x * 1.7 + uTime * 1.1) * 0.5 + sin(position.y * 2.3 - uTime * 0.8) * 0.3 + sin(position.z * 1.9 + uTime * 1.3) * 0.4;
          transformed += normal * w * 0.045;`,
        );
    };
    return m;
  }, [world, uniforms]);
  useAnim((t) => {
    uniforms.uTime.value = t;
  });
  return <mesh geometry={geometry} material={material} receiveShadow />;
}

// ───────────────────────────── Atmosfera ─────────────────────────────
const ATMO_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vN;
varying vec3 vV;
void main() {
  float d = abs(dot(vN, vV));
  float f = pow(d, 3.0) * uIntensity;
  gl_FragColor = vec4(uColor * f, f);
}`;
const RIM_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vN;
varying vec3 vV;
void main() {
  float f = pow(1.0 - max(dot(vN, vV), 0.0), 3.2) * uIntensity;
  gl_FragColor = vec4(uColor * f, f);
}`;

export function Atmosphere({ world, smog = () => 0 }: { world: PlanetWorld; smog?: () => number }) {
  const R = world.def.radius;
  const base = useMemo(() => new Color(world.def.atmosphere), [world]);
  const smogColor = useMemo(() => new Color("#9a7b5a"), []);
  const halo = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: HALO_FRAG,
        uniforms: { uColor: { value: base.clone() }, uIntensity: { value: 0.9 } },
        side: BackSide,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [base],
  );
  const rim = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: RIM_FRAG,
        uniforms: { uColor: { value: base.clone() }, uIntensity: { value: 1.1 } },
        side: FrontSide,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [base],
  );
  useAnim(() => {
    const s = smog();
    halo.uniforms.uColor.value.copy(base).lerp(smogColor, s * 0.8);
    rim.uniforms.uColor.value.copy(base).lerp(smogColor, s * 0.8);
  });
  return (
    <>
      <mesh material={halo} renderOrder={2}>
        <icosahedronGeometry args={[R * 1.16, 12]} />
      </mesh>
      <mesh material={rim} renderOrder={3}>
        <icosahedronGeometry args={[R * 1.035, 12]} />
      </mesh>
    </>
  );
}

// ───────────────────────────── Nuvens ─────────────────────────────
export function Clouds({
  world,
  count = 16,
  smog = () => 0,
  speed = 0.012,
}: {
  world: PlanetWorld;
  count?: number;
  smog?: () => number;
  speed?: number;
}) {
  const group = useRef<Group>(null);
  const R = world.def.radius;
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#ffffff",
        flatShading: true,
        roughness: 1,
        transparent: true,
        opacity: 0.92,
        emissive: "#9fb3d9",
        emissiveIntensity: 0.25,
      }),
    [],
  );
  const clouds = useMemo(() => {
    const rng = mulberry32(world.def.seed + 99);
    const list: { geo: BufferGeometry; pos: Vector3; up: Vector3 }[] = [];
    for (let i = 0; i < count; i++) {
      const dir = new Vector3(rng() * 2 - 1, (rng() * 2 - 1) * 0.8, rng() * 2 - 1).normalize();
      const parts: BufferGeometry[] = [];
      const n = 3 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        const g = new IcosahedronGeometry(0.42 + rng() * 0.38, 1);
        g.scale(1, 0.7, 1);
        g.translate((k - n / 2) * 0.5 + rng() * 0.2, rng() * 0.25, (rng() - 0.5) * 0.5);
        parts.push(g.toNonIndexed());
      }
      const geo = mergeGeometries(parts)!;
      geo.computeVertexNormals();
      list.push({ geo, pos: dir.clone().multiplyScalar(R + 5.2 + rng() * 1.6), up: dir });
    }
    return list;
  }, [world, count, R]);
  const smogC = useMemo(() => new Color("#8d8170"), []);
  const white = useMemo(() => new Color("#ffffff"), []);
  useAnim((t) => {
    if (group.current) {
      group.current.rotation.y = t * speed;
      group.current.rotation.x = Math.sin(t * speed * 0.33) * 0.2;
    }
    material.color.copy(white).lerp(smogC, smog() * 0.9);
  });
  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <mesh
          key={i}
          geometry={c.geo}
          material={material}
          position={c.pos}
          castShadow
          onUpdate={(m) => m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), c.up)}
        />
      ))}
    </group>
  );
}

// ───────────────────────────── Instâncias ─────────────────────────────
function Instances({ data, geometry, material, shadow = true }: { data: InstanceData; geometry: BufferGeometry; material: MeshStandardMaterial; shadow?: boolean }) {
  const capacity = Math.max(16, 1 << Math.ceil(Math.log2(Math.max(1, data.matrices.length))));
  const mesh = useMemo(() => {
    const m = new InstancedMesh(geometry, material, capacity);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    return m;
  }, [geometry, material, capacity, shadow]);
  useLayoutEffect(() => {
    const n = data.matrices.length;
    for (let i = 0; i < n; i++) {
      mesh.setMatrixAt(i, data.matrices[i]);
      mesh.setColorAt(i, data.colors[i]);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [data, mesh]);
  return <primitive object={mesh} />;
}

const natureMat = new MeshStandardMaterial({ color: "#ffffff", flatShading: true, roughness: 0.85 });
const oreMat = new MeshStandardMaterial({ color: "#ffffff", flatShading: true, roughness: 0.45, metalness: 0.25 });
const geos = {
  trunk: (() => {
    const g = new IcosahedronGeometry(0.06, 0);
    g.scale(1, 3.2, 1);
    g.translate(0, 0.16, 0);
    return g;
  })(),
  pine: (() => {
    const a = new IcosahedronGeometry(0.2, 0);
    a.scale(1, 1.6, 1);
    const b = new IcosahedronGeometry(0.15, 0);
    b.scale(1, 1.5, 1);
    b.translate(0, 0.28, 0);
    const g = mergeGeometries([a.toNonIndexed(), b.toNonIndexed()])!;
    g.computeVertexNormals();
    return g;
  })(),
  round: (() => {
    const g = new IcosahedronGeometry(0.24, 0);
    g.translate(0, 0.08, 0);
    return g;
  })(),
  rock: new IcosahedronGeometry(1, 0),
  ore: (() => {
    const g = new IcosahedronGeometry(0.5, 0);
    return g;
  })(),
};

export function Trees({
  world,
  trees,
  pollution,
  skip,
  version,
}: {
  world: PlanetWorld;
  trees: ArrayLike<number>;
  pollution?: ArrayLike<number>;
  skip?: (tile: number) => boolean;
  version: unknown;
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => buildTrees(world, trees, pollution, skip), [world, version]);
  return (
    <>
      <Instances data={data.trunks} geometry={geos.trunk} material={natureMat} />
      <Instances data={data.pines} geometry={geos.pine} material={natureMat} />
      <Instances data={data.rounds} geometry={geos.round} material={natureMat} />
    </>
  );
}

export function Rocks({
  world,
  deposit,
  skip,
  version,
}: {
  world: PlanetWorld;
  deposit: ArrayLike<number>;
  skip?: (tile: number) => boolean;
  version: unknown;
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => buildRocks(world, deposit, skip), [world, version]);
  return (
    <>
      <Instances data={data.rocks} geometry={geos.rock} material={natureMat} />
      <Instances data={data.ores} geometry={geos.ore} material={oreMat} />
    </>
  );
}

// ───────────────────────────── Estradas e fronteiras ─────────────────────────────
const roadMat = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 });

export function Roads({
  world,
  isRoad,
  connects,
  paved,
  version,
}: {
  world: PlanetWorld;
  isRoad: (t: number) => boolean;
  connects: (t: number) => boolean;
  paved: boolean;
  version: unknown;
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => buildRoads(world, isRoad, connects, paved), [world, version, paved]);
  return <mesh geometry={geo} material={roadMat} receiveShadow />;
}

export function Borders({ world, owned, version }: { world: PlanetWorld; owned: Uint8Array; version: unknown }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => buildBorders(world, owned), [world, version]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#ffe08a" transparent opacity={0.85} />
    </lineSegments>
  );
}
