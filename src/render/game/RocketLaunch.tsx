import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { cam, getGame } from "@/game/session";
import { tileQuaternion, tileTop } from "../geo";
import { Rocket } from "../models/BuildingModels";
import { spawnParticle } from "./Particles";

interface Launch {
  id: number;
  tile: number;
  start: number;
}

/** Animação de lançamento do foguete (decolagem + rastro de fogo e fumaça). */
export function RocketLaunch() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  useEffect(() => {
    const game = getGame();
    return game.events.on("launch", ({ tile, planet }) => {
      if (planet !== game.state.activePlanet) return;
      setLaunches((l) => [...l, { id: Date.now(), tile, start: performance.now() }]);
      cam.shake = 2.5;
      cam.targetDist = Math.max(cam.targetDist, 22);
    });
  }, []);
  return (
    <>
      {launches.map((l) => (
        <FlyingRocket key={l.id} launch={l} onDone={() => setLaunches((x) => x.filter((y) => y.id !== l.id))} />
      ))}
    </>
  );
}

const tmp = new Vector3();
const vel = new Vector3();

function FlyingRocket({ launch, onDone }: { launch: Launch; onDone: () => void }) {
  const ref = useRef<Group>(null);
  const game = getGame();
  const base = tileTop(game.world, launch.tile, new Vector3()).addScaledVector(game.world.hex.centers[launch.tile], 0.3);
  const up = game.world.hex.centers[launch.tile].clone();
  const quat = tileQuaternion(game.world, launch.tile, 0);
  useFrame(() => {
    const t = (performance.now() - launch.start) / 1000;
    if (t > 7) {
      onDone();
      return;
    }
    const lift = t < 0.8 ? 0 : 0.5 * 4.5 * Math.pow(t - 0.8, 2.2);
    const g = ref.current;
    if (g) {
      g.position.copy(base).addScaledVector(up, lift);
      g.rotation.set(0, 0, 0);
      g.quaternion.copy(quat);
      g.position.x += t < 0.8 ? (Math.random() - 0.5) * 0.03 : 0;
    }
    // fogo + fumaça
    for (let i = 0; i < 5; i++) {
      tmp.copy(base).addScaledVector(up, lift - 0.05);
      vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(t < 1.5 ? 2.2 : 0.6).addScaledVector(up, -2.5);
      spawnParticle(tmp, vel, i % 2 ? "#ffb020" : "#ff5a1f", 0.5, 0.16, 0.03, 1.5);
    }
    if (t < 3) {
      for (let i = 0; i < 3; i++) {
        tmp.copy(base).addScaledVector(up, Math.max(0, lift - 0.4));
        vel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2.4).addScaledVector(up, 0.2);
        spawnParticle(tmp, vel, "#e5e7eb", 3.2, 0.2, 0.9, 0.9);
      }
    }
  });
  return (
    <group ref={ref} position={base} quaternion={quat} scale={1.3}>
      <Rocket />
    </group>
  );
}
