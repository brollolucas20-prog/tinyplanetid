import { memo, useCallback, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Sprite, Vector3, type Group } from "three";
import { BUILDINGS } from "@/game/data/buildings";
import { DEPOSIT_COLORS } from "@/game/data/items";
import { getGame } from "@/game/session";
import type { BuildingState } from "@/game/sim/types";
import type { PlanetWorld } from "@/game/world/planetGen";
import { tileQuaternion, tileTop } from "../geo";
import { MODELS, SMOKE_POINTS } from "../models/BuildingModels";
import { easeOutBack, usePolled } from "./hooks";
import { spawnBurst, spawnParticle } from "./Particles";
import { statusMaterial } from "./statusIcons";

export function GameBuildings() {
  const game = getGame();
  usePolled(() => game.structureVersion);
  const world = game.world;
  const list = game.planet.buildings.filter((b) => b.type !== "road");
  return (
    <>
      {list.map((b) => (
        <BuildingView key={`${game.state.activePlanet}-${b.id}-${b.level}-${b.rot}`} b={b} world={world} />
      ))}
    </>
  );
}

const SMOKE_LIGHT = new Color("#e5e7eb");
const SMOKE_DARK = new Color("#4b5563");
const smokeTmp = new Vector3();
const velTmp = new Vector3();

const BuildingView = memo(function BuildingView({ b, world }: { b: BuildingState; world: PlanetWorld }) {
  const group = useRef<Group>(null);
  const badge = useRef<Sprite>(null);
  const born = useRef(performance.now());
  const smokeTimer = useRef(Math.random());
  const def = BUILDINGS[b.type];
  const Model = MODELS[b.type];
  const { pos, quat, up } = useMemo(
    () => ({
      pos: tileTop(world, b.tile, new Vector3()),
      quat: tileQuaternion(world, b.tile, b.rot),
      up: world.hex.centers[b.tile].clone(),
    }),
    [world, b.tile, b.rot],
  );
  const working = useCallback(() => b.status === "working", [b]);
  const progress = useCallback(() => (b.rocketReady ? 1 : b.progress), [b]);
  const deposit = world.tiles[b.tile].deposit;
  const oreColor = deposit ? DEPOSIT_COLORS[deposit].ore : undefined;
  const isNew = getGame().state.time - b.builtAt < 1.5;
  const burstDone = useRef(!isNew);
  const smokePts = SMOKE_POINTS[b.type];

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const age = (performance.now() - born.current) / 1000;
    const k = Math.min(1, age / (isNew ? 0.55 : 0.35));
    const s = Math.max(0.001, easeOutBack(k)) * (1 + 0.05 * (b.level - 1));
    g.scale.setScalar(s);
    if (!burstDone.current) {
      burstDone.current = true;
      spawnBurst(pos.clone().addScaledVector(up, 0.1), up, "#d6c3a1", 18, 1.4);
    }
    // ícone de status
    const sp = badge.current;
    if (sp) {
      const m = def.hub || b.type === "hq" ? null : statusMaterial(b.status);
      sp.visible = !!m;
      if (m && sp.material !== m) sp.material = m;
      sp.position.y = def.height + 0.45 + Math.sin(state.clock.elapsedTime * 3 + b.id) * 0.06;
    }
    // fumaça
    if (smokePts && smokePts.length && b.status === "working") {
      smokeTimer.current -= dt;
      if (smokeTimer.current <= 0) {
        smokeTimer.current = 0.16 + Math.random() * 0.12;
        const pol = getGame().rt.pollutionIndex;
        for (const lp of smokePts) {
          smokeTmp.set(lp[0], lp[1], lp[2]).multiplyScalar(s).applyQuaternion(quat).add(pos);
          velTmp.copy(up).multiplyScalar(0.45 + Math.random() * 0.3);
          velTmp.x += (Math.random() - 0.5) * 0.35;
          velTmp.y += (Math.random() - 0.5) * 0.35;
          velTmp.z += (Math.random() - 0.5) * 0.35;
          const col = (b.type === "coalGen" ? SMOKE_DARK : SMOKE_LIGHT).clone().lerp(SMOKE_DARK, pol * 0.6);
          spawnParticle(smokeTmp, velTmp, col, 2.4, 0.05, 0.3, 0.35);
        }
      }
    }
  });

  if (!Model) return null;
  return (
    <group ref={group} position={pos} quaternion={quat}>
      <Model working={working} progress={progress} level={b.level} oreColor={oreColor} seed={b.id} />
      <sprite ref={badge} scale={[0.5, 0.5, 0.5]} renderOrder={10} visible={false} />
    </group>
  );
});
