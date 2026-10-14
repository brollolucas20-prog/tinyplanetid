import { useMemo } from "react";
import { Easing, interpolate } from "remotion";
import { BufferAttribute, BufferGeometry, Quaternion, Vector3 } from "three";
import { DEPOSIT_COLORS } from "@/game/data/items";
import { PLANET_MAP } from "@/game/data/planets";
import { getWorld } from "@/game/world/planetGen";
import { mulberry32 } from "@/game/world/rng";
import { tileQuaternion, tileTop } from "@/render/geo";
import { AnimProvider } from "@/render/kit";
import { MODELS } from "@/render/models/BuildingModels";
import { demoLayout } from "@/render/world/demoLayout";
import { Atmosphere, Clouds, Roads, Rocks, Terrain, Trees, Water } from "@/render/world/PlanetParts";

const always = () => true;
const full = () => 1;

/** Estrelas estáticas e determinísticas (o Remotion proíbe animações próprias). */
export function StaticStars({ count = 2500, radius = 400 }: { count?: number; radius?: number }) {
  const geo = useMemo(() => {
    const rng = mulberry32(77);
    const pos = new Float32Array(count * 3);
    const v = new Vector3();
    for (let i = 0; i < count; i++) {
      v.set(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize().multiplyScalar(radius * (0.7 + rng() * 0.3));
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return g;
  }, [count, radius]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#dfe7ff" size={1.6} sizeAttenuation={false} transparent opacity={0.85} />
    </points>
  );
}

export interface DioramaProps {
  planetId: string;
  /** Tempo em segundos (derivado de useCurrentFrame). */
  time: number;
  /** Rotação do planeta (radianos). */
  rotation: number;
  /** Quantos edifícios da cidade demo já apareceram (Infinity = todos). */
  reveal?: number;
  /** Duração (em "ordens") da animação de surgimento. */
  popSpan?: number;
  showCity?: boolean;
  position?: [number, number, number];
  scale?: number;
  tilt?: number;
}

/** Planeta completo e determinístico para as composições do Remotion. */
export function PlanetDiorama({
  planetId,
  time,
  rotation,
  reveal = Infinity,
  popSpan = 3,
  showCity = true,
  position = [0, 0, 0],
  scale = 1,
  tilt = 0.35,
}: DioramaProps) {
  const def = PLANET_MAP[planetId];
  const world = useMemo(() => getWorld(def), [def]);
  const layout = useMemo(() => demoLayout(world), [world]);
  const owned = useMemo(() => new Uint8Array(world.regions.length).fill(1), [world]);
  const trees = useMemo(
    () => world.tiles.map((t, i) => (showCity && layout.occupied.has(i) ? 0 : t.treeCap)),
    [world, layout, showCity],
  );
  const deposit = useMemo(() => world.tiles.map((t) => t.depositAmount), [world]);
  const visibleRoads = Math.floor(reveal);
  const isRoad = (t: number) => {
    const order = layout.roads.get(t);
    return showCity && order !== undefined && order <= visibleRoads;
  };
  const connects = (t: number) => showCity && layout.buildings.some((b) => b.tile === t && b.order <= visibleRoads);
  const skip = (t: number) => showCity && layout.occupied.has(t) && layout.buildings.some((b) => b.tile === t && b.order <= reveal);

  // Coloca a Sede de frente para a câmera antes da rotação.
  const baseQuat = useMemo(() => {
    const target = new Vector3(0, Math.sin(tilt), Math.cos(tilt)).normalize();
    const from = world.hex.centers[world.startTile].clone();
    return quatFromTo(from, target);
  }, [world, tilt]);

  return (
    <AnimProvider mode={{ kind: "frame", time }}>
      <group position={position} scale={scale}>
        <group rotation={[0, rotation, 0]}>
          <group quaternion={baseQuat}>
            <Terrain world={world} paint={() => ({ owned, trees })} version={`${planetId}-${showCity}`} />
            <Water world={world} />
            <Trees world={world} trees={trees} version={`${planetId}-${showCity}-${Math.floor(reveal)}`} skip={skip} />
            <Rocks world={world} deposit={deposit} skip={(t) => showCity && layout.buildings.some((b) => b.tile === t && b.order <= reveal)} version={`${planetId}-${Math.floor(reveal)}`} />
            <Roads world={world} isRoad={isRoad} connects={connects} paved version={`${planetId}-${visibleRoads}-${showCity}`} />
            {showCity &&
              layout.buildings.map((b) => {
                const k = reveal - b.order;
                if (k < 0) return null;
                const Model = MODELS[b.type];
                if (!Model) return null;
                const s = interpolate(k, [0, popSpan], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.back(1.8)),
                });
                const deposit = world.tiles[b.tile].deposit;
                return (
                  <group
                    key={b.tile}
                    position={tileTop(world, b.tile, new Vector3())}
                    quaternion={tileQuaternion(world, b.tile, b.rot)}
                    scale={Math.max(0.001, s)}
                  >
                    <Model working={always} progress={full} level={1} oreColor={deposit ? DEPOSIT_COLORS[deposit].ore : undefined} />
                  </group>
                );
              })}
            <Clouds world={world} speed={0} />
          </group>
        </group>
        <Atmosphere world={world} />
      </group>
    </AnimProvider>
  );
}

function quatFromTo(from: Vector3, to: Vector3): Quaternion {
  return new Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
}
