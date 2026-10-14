import { useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ITEMS, type ItemId } from "@/game/data/items";
import { getGame } from "@/game/session";
import { DRONE_SPEED, TRUCK_SPEED } from "@/game/sim/game";
import { frameQuaternion } from "../geo";

const CAP = 600;

function colored(g: BufferGeometry, color: string): BufferGeometry {
  const ng = g.toNonIndexed();
  const c = new Color(color);
  const n = ng.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  ng.setAttribute("color", new BufferAttribute(arr, 3));
  return ng;
}

function truckGeometry(): BufferGeometry {
  const chassis = new BoxGeometry(0.2, 0.05, 0.4);
  chassis.translate(0, 0.06, 0);
  const cab = new BoxGeometry(0.19, 0.13, 0.12);
  cab.translate(0, 0.14, 0.13);
  const win = new BoxGeometry(0.17, 0.05, 0.01);
  win.translate(0, 0.17, 0.195);
  const wheels: BufferGeometry[] = [];
  for (const z of [-0.12, 0.12]) {
    const w = new BoxGeometry(0.23, 0.07, 0.07);
    w.translate(0, 0.035, z);
    wheels.push(colored(w, "#1f2937"));
  }
  const g = mergeGeometries([colored(chassis, "#475569"), colored(cab, "#f97316"), colored(win, "#7dd3fc"), ...wheels])!;
  g.computeVertexNormals();
  return g;
}

function droneGeometry(): BufferGeometry {
  const body = new BoxGeometry(0.18, 0.06, 0.18);
  const arms = new BoxGeometry(0.38, 0.02, 0.03);
  const arms2 = new BoxGeometry(0.03, 0.02, 0.38);
  const props: BufferGeometry[] = [];
  for (const [x, z] of [
    [0.17, 0],
    [-0.17, 0],
    [0, 0.17],
    [0, -0.17],
  ]) {
    const p = new BoxGeometry(0.12, 0.01, 0.12);
    p.translate(x, 0.03, z);
    props.push(colored(p, "#94a3b8"));
  }
  const g = mergeGeometries([colored(body, "#f8fafc"), colored(arms, "#334155"), colored(arms2, "#334155"), ...props])!;
  g.computeVertexNormals();
  return g;
}

export function Vehicles() {
  const game = getGame();
  const bodyMat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.7 }), []);
  const cargoMat = useMemo(() => new MeshStandardMaterial({ color: "#ffffff", flatShading: true, roughness: 0.6 }), []);
  const meshes = useMemo(() => {
    const trucks = new InstancedMesh(truckGeometry(), bodyMat, CAP);
    const cargo = new InstancedMesh(new BoxGeometry(0.17, 0.11, 0.2), cargoMat, CAP);
    const drones = new InstancedMesh(droneGeometry(), bodyMat, 200);
    const dcargo = new InstancedMesh(new BoxGeometry(0.1, 0.1, 0.1), cargoMat, 200);
    for (const m of [trucks, cargo, drones, dcargo]) {
      m.count = 0;
      m.castShadow = true;
      m.frustumCulled = false;
    }
    return { trucks, cargo, drones, dcargo };
  }, [bodyMat, cargoMat]);
  useLayoutEffect(() => {
    meshes.cargo.setColorAt(0, new Color());
    meshes.dcargo.setColorAt(0, new Color());
  }, [meshes]);

  const tmp = useMemo(
    () => ({
      m: new Matrix4(),
      m2: new Matrix4(),
      q: new Quaternion(),
      pos: new Vector3(),
      up: new Vector3(),
      fwd: new Vector3(),
      right: new Vector3(),
      a: new Vector3(),
      b: new Vector3(),
      s: new Vector3(1, 1, 1),
      off: new Vector3(),
      c: new Color(),
    }),
    [],
  );

  useFrame((state) => {
    const world = game.world;
    const hex = world.hex;
    const ps = game.planet;
    const sub = game.subTick;
    const truckSpeed = TRUCK_SPEED * game.mods.truckSpeed;
    let nt = 0;
    let nd = 0;
    for (const tr of ps.trucks) {
      const speed = tr.drone ? DRONE_SPEED * Math.sqrt(game.mods.truckSpeed) : truckSpeed;
      const t = Math.min(tr.length, tr.t + speed * sub);
      const firstItem = Object.keys(tr.cargo)[0] as ItemId | undefined;
      tmp.c.set(firstItem ? ITEMS[firstItem].color : "#ffffff");
      if (tr.drone) {
        if (nd >= 200) continue;
        const f = t / tr.length;
        tmp.a.copy(hex.centers[tr.path[0]]);
        tmp.b.copy(hex.centers[tr.path[1]]);
        tmp.up.copy(tmp.a).lerp(tmp.b, f).normalize();
        const r0 = world.surfaceRadius(tr.path[0]);
        const r1 = world.surfaceRadius(tr.path[1]);
        const h = r0 + (r1 - r0) * f + 0.7 + Math.sin(Math.PI * f) * 1.4;
        tmp.pos.copy(tmp.up).multiplyScalar(h);
        tmp.fwd.subVectors(tmp.b, tmp.a);
        frameQuaternion(tmp.up, tmp.fwd, tmp.q);
        tmp.m.compose(tmp.pos, tmp.q, tmp.s);
        meshes.drones.setMatrixAt(nd, tmp.m);
        tmp.off.copy(tmp.up).multiplyScalar(-0.12 + Math.sin(state.clock.elapsedTime * 6 + tr.id) * 0.01);
        tmp.m2.compose(tmp.pos.clone().add(tmp.off), tmp.q, tmp.s);
        meshes.dcargo.setMatrixAt(nd, tmp.m2);
        meshes.dcargo.setColorAt(nd, tmp.c);
        nd++;
        continue;
      }
      if (nt >= CAP) continue;
      const i = Math.min(tr.path.length - 2, Math.floor(t));
      const f = t - i;
      const ta = tr.path[i];
      const tb = tr.path[i + 1];
      tmp.a.copy(hex.centers[ta]);
      tmp.b.copy(hex.centers[tb]);
      tmp.up.copy(tmp.a).lerp(tmp.b, f).normalize();
      const ra = world.surfaceRadius(ta) + (world.isWater(ta) ? 0.12 : 0.035);
      const rb = world.surfaceRadius(tb) + (world.isWater(tb) ? 0.12 : 0.035);
      // suaviza degraus entre tiles
      const ease = f < 0.4 ? 0 : f > 0.6 ? 1 : (f - 0.4) / 0.2;
      tmp.pos.copy(tmp.up).multiplyScalar(ra + (rb - ra) * ease);
      tmp.fwd.subVectors(tmp.b, tmp.a);
      frameQuaternion(tmp.up, tmp.fwd, tmp.q);
      // mão direita
      tmp.right.crossVectors(tmp.up, tmp.fwd).normalize();
      tmp.pos.addScaledVector(tmp.right, -0.09);
      tmp.m.compose(tmp.pos, tmp.q, tmp.s);
      meshes.trucks.setMatrixAt(nt, tmp.m);
      tmp.off.set(0, 0.145, -0.07).applyQuaternion(tmp.q);
      tmp.m2.compose(tmp.pos.clone().add(tmp.off), tmp.q, tmp.s);
      meshes.cargo.setMatrixAt(nt, tmp.m2);
      meshes.cargo.setColorAt(nt, tmp.c);
      nt++;
    }
    meshes.trucks.count = nt;
    meshes.cargo.count = nt;
    meshes.drones.count = nd;
    meshes.dcargo.count = nd;
    for (const m of [meshes.trucks, meshes.cargo, meshes.drones, meshes.dcargo]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <primitive object={meshes.trucks} />
      <primitive object={meshes.cargo} />
      <primitive object={meshes.drones} />
      <primitive object={meshes.dcargo} />
    </>
  );
}
