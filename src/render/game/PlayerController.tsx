import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Mesh, Quaternion, Vector3, type Group } from "three";
import { cam, getGame, input, player } from "@/game/session";
import { C, G, M, mat, uniqueMat } from "../kit";
import { frameQuaternion } from "../geo";
import { smoothstep } from "./hooks";
import { spawnParticle } from "./Particles";

const WALK_SPEED = 4.2;
const HARVEST_RANGE = 2.2;

const v1 = new Vector3();
const v2 = new Vector3();
const moveDir = new Vector3();
const right = new Vector3();
const focus = new Vector3();
const camPos = new Vector3();
const qTarget = new Quaternion();

/** Astronauta low-poly + lógica de movimento sobre a esfera + câmera em 3ª pessoa. */
export function PlayerController() {
  const game = getGame();
  const { camera } = useThree();
  const root = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const tool = useRef<Group>(null);
  const flame = useRef<Mesh>(null);
  const visor = useMemo(() => uniqueMat("#1e3a8a", { emissive: "#38bdf8", emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.15 }), []);
  const fwd = useMemo(() => new Vector3(), []);
  const pos = useMemo(() => new Vector3(), []);
  const radius = useRef(0);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const world = game.world;
    const ps = game.planet;
    const rt = game.rt;
    pos.fromArray(ps.player.dir).normalize();
    fwd.fromArray(ps.player.fwd);

    const snapping = !cam.initialized;
    if (!cam.initialized) {
      cam.heading.copy(fwd).addScaledVector(pos, -fwd.dot(pos)).normalize();
      if (cam.heading.lengthSq() < 0.5) cam.heading.set(1, 0, 0).addScaledVector(pos, -pos.x).normalize();
      radius.current = world.surfaceRadius(world.nearest(pos, player.tile));
      cam.initialized = true;
    }

    // ── Entrada ──
    const k = input.keys;
    const f = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
    const s = (k.has("d") || k.has("arrowright") ? 1 : 0) - (k.has("a") || k.has("arrowleft") ? 1 : 0);
    player.sprint = k.has("shift");
    cam.heading.addScaledVector(pos, -cam.heading.dot(pos)).normalize();
    right.crossVectors(cam.heading, pos).normalize();
    moveDir.set(0, 0, 0);
    if (f || s) {
      moveDir.addScaledVector(cam.heading, f).addScaledVector(right, s);
      player.target = -1;
      player.harvestTile = -1;
    } else if (player.target >= 0) {
      const tc = world.hex.centers[player.target];
      v1.copy(tc).addScaledVector(pos, -tc.dot(pos));
      const ang = Math.acos(Math.min(1, Math.max(-1, tc.dot(pos))));
      const dist = ang * radius.current;
      const stopAt = player.harvestTile === player.target ? HARVEST_RANGE * 0.6 : 0.25;
      if (dist > stopAt && v1.lengthSq() > 1e-8) moveDir.copy(v1).normalize();
      else player.target = -1;
    }

    // ── Movimento ──
    player.moving = moveDir.lengthSq() > 1e-6;
    let speed = 0;
    if (player.moving) {
      moveDir.normalize();
      speed = WALK_SPEED * (player.sprint ? 1.75 : 1);
      const ang = (speed * dt) / Math.max(1, radius.current);
      const tryMove = (dir: Vector3) => {
        v2.copy(pos).multiplyScalar(Math.cos(ang)).addScaledVector(dir, Math.sin(ang)).normalize();
        const nt = world.nearest(v2, player.tile);
        const bid = rt.tileBuilding[nt];
        const blocker = bid >= 0 ? rt.byId.get(bid) : undefined;
        if (blocker && blocker.type !== "road" && nt !== player.tile) return nt;
        pos.copy(v2);
        player.tile = nt;
        return -1;
      };
      const blockedBy = tryMove(moveDir);
      if (blockedBy >= 0) {
        // desliza contornando o edifício
        const bc = world.hex.centers[blockedBy];
        v1.copy(bc).addScaledVector(pos, -bc.dot(pos)).normalize();
        right.copy(moveDir).addScaledVector(v1, -moveDir.dot(v1));
        if (right.lengthSq() > 0.04) {
          right.normalize();
          if (tryMove(right) >= 0) player.target = -1;
        } else if (player.target >= 0 && player.harvestTile !== player.target) {
          player.target = -1;
        }
      }
      // vira o corpo suavemente para a direção do movimento
      fwd.lerp(moveDir, 1 - Math.exp(-dt * 12));
      player.walkPhase += dt * speed * 2.6;
    }
    fwd.addScaledVector(pos, -fwd.dot(pos)).normalize();
    cam.heading.addScaledVector(pos, -cam.heading.dot(pos)).normalize();
    if (player.tile < 0) player.tile = world.nearest(pos, 0);

    // ── Coleta ──
    player.cooldown -= dt;
    if (k.has("e") && player.harvestTile < 0) {
      let best = -1;
      let bestD = Infinity;
      const near = game.radius(rt, player.tile, 2);
      for (const { tile } of near) {
        if (!game.harvestable(tile)) continue;
        const d = Math.acos(Math.min(1, world.hex.centers[tile].dot(pos))) * radius.current;
        if (d < bestD) {
          bestD = d;
          best = tile;
        }
      }
      if (best >= 0 && bestD <= HARVEST_RANGE) player.harvestTile = best;
    }
    player.harvesting = false;
    if (player.harvestTile >= 0) {
      const tc = world.hex.centers[player.harvestTile];
      const d = Math.acos(Math.min(1, tc.dot(pos))) * radius.current;
      if (!game.harvestable(player.harvestTile)) {
        player.harvestTile = -1;
      } else if (d <= HARVEST_RANGE) {
        player.harvesting = true;
        v1.copy(tc).addScaledVector(pos, -tc.dot(pos));
        if (v1.lengthSq() > 1e-8) fwd.lerp(v1.normalize(), 1 - Math.exp(-dt * 10)).normalize();
        if (player.cooldown <= 0) {
          player.cooldown = 0.45;
          const got = game.harvest(player.harvestTile);
          if (!got) player.harvestTile = -1;
          // estilhaços
          const tp = tc.clone().multiplyScalar(world.surfaceRadius(player.harvestTile >= 0 ? player.harvestTile : player.tile) + 0.3);
          for (let i = 0; i < 4; i++) {
            v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(1.2).addScaledVector(tc, 1.5);
            spawnParticle(tp, v2, got === "wood" ? "#c08a50" : "#9ca3af", 0.5, 0.06, 0.01, 1.5);
          }
        }
      } else if (player.target !== player.harvestTile && !player.moving) {
        player.harvestTile = -1;
      }
    }

    // ── Altura (relevo, água com jetpack) ──
    const overWater = world.isWater(player.tile);
    const targetR = world.surfaceRadius(player.tile) + (overWater ? 0.32 + Math.sin(state.clock.elapsedTime * 3) * 0.05 : 0);
    radius.current += (targetR - radius.current) * (1 - Math.exp(-dt * 14));

    ps.player.dir = [pos.x, pos.y, pos.z];
    ps.player.fwd = [fwd.x, fwd.y, fwd.z];
    player.pos.copy(pos).multiplyScalar(radius.current);
    player.up.copy(pos);

    // ── Modelo ──
    const g = root.current;
    if (g) {
      g.position.copy(player.pos);
      frameQuaternion(pos, fwd, qTarget);
      g.quaternion.copy(qTarget);
      const swing = player.moving ? Math.sin(player.walkPhase) * 0.7 : 0;
      if (legL.current) legL.current.rotation.x = swing;
      if (legR.current) legR.current.rotation.x = -swing;
      if (armL.current) armL.current.rotation.x = -swing * 0.8;
      if (armR.current) {
        armR.current.rotation.x = player.harvesting
          ? -1.2 - Math.abs(Math.sin(state.clock.elapsedTime * 7)) * 1.2
          : swing * 0.8;
      }
      if (tool.current) tool.current.visible = player.harvesting;
      if (flame.current) {
        flame.current.visible = overWater || player.sprint;
        flame.current.scale.setScalar(0.8 + Math.random() * 0.5);
      }
      g.position.addScaledVector(pos, player.moving ? Math.abs(Math.sin(player.walkPhase)) * 0.04 : 0);
    }

    // ── Câmera ──
    cam.dist += (cam.targetDist - cam.dist) * (1 - Math.exp(-dt * 8));
    const o = smoothstep(15, 44, cam.dist);
    focus.copy(player.pos).addScaledVector(pos, 0.7).multiplyScalar(1 - o);
    const pitch = cam.pitch + (1.22 - cam.pitch) * o;
    camPos
      .copy(cam.heading)
      .multiplyScalar(-Math.cos(pitch))
      .addScaledVector(pos, Math.sin(pitch))
      .multiplyScalar(cam.dist)
      .add(focus);
    const minR = world.def.radius + 2.2;
    if (camPos.length() < minR) camPos.setLength(minR);
    if (cam.shake > 0) {
      cam.shake = Math.max(0, cam.shake - dt);
      camPos.x += (Math.random() - 0.5) * cam.shake * 0.4;
      camPos.y += (Math.random() - 0.5) * cam.shake * 0.4;
    }
    if (snapping) camera.position.copy(camPos);
    else camera.position.lerp(camPos, 1 - Math.exp(-dt * 12));
    camera.up.copy(pos);
    camera.lookAt(focus);
  });

  const suit = mat(C.white);
  const suitDark = mat("#cbd5e1");
  const accent = mat("#f97316");
  return (
    <group ref={root}>
      <group scale={0.95}>
        {/* pernas */}
        <group ref={legL} position={[-0.08, 0.3, 0]}>
          <M g={G.box(0.11, 0.28, 0.12)} m={suitDark} p={[0, -0.14, 0]} />
          <M g={G.box(0.12, 0.06, 0.16)} m={mat(C.dark)} p={[0, -0.27, 0.02]} />
        </group>
        <group ref={legR} position={[0.08, 0.3, 0]}>
          <M g={G.box(0.11, 0.28, 0.12)} m={suitDark} p={[0, -0.14, 0]} />
          <M g={G.box(0.12, 0.06, 0.16)} m={mat(C.dark)} p={[0, -0.27, 0.02]} />
        </group>
        {/* tronco */}
        <M g={G.box(0.3, 0.3, 0.2)} m={suit} p={[0, 0.44, 0]} />
        <M g={G.box(0.31, 0.06, 0.21)} m={accent} p={[0, 0.34, 0]} />
        <M g={G.box(0.1, 0.07, 0.02)} m={mat("#38bdf8", { emissive: "#38bdf8", emissiveIntensity: 0.8 })} p={[0.06, 0.48, 0.105]} shadow={false} />
        {/* mochila + jetpack */}
        <M g={G.box(0.24, 0.28, 0.12)} m={mat(C.light)} p={[0, 0.45, -0.15]} />
        <M g={G.cyl(0.045, 0.045, 0.2, 6)} m={accent} p={[-0.07, 0.4, -0.22]} />
        <M g={G.cyl(0.045, 0.045, 0.2, 6)} m={accent} p={[0.07, 0.4, -0.22]} />
        <mesh ref={flame} geometry={G.cone(0.06, 0.22, 6)} material={mat("#ffb020", { emissive: "#ff7a00", emissiveIntensity: 2.5 })} position={[0, 0.2, -0.22]} rotation={[Math.PI, 0, 0]} visible={false} />
        {/* braços */}
        <group ref={armL} position={[-0.2, 0.56, 0]}>
          <M g={G.box(0.09, 0.26, 0.1)} m={suit} p={[0, -0.12, 0]} />
          <M g={G.box(0.1, 0.07, 0.1)} m={accent} p={[0, -0.26, 0]} />
        </group>
        <group ref={armR} position={[0.2, 0.56, 0]}>
          <M g={G.box(0.09, 0.26, 0.1)} m={suit} p={[0, -0.12, 0]} />
          <M g={G.box(0.1, 0.07, 0.1)} m={accent} p={[0, -0.26, 0]} />
          <group ref={tool} position={[0, -0.28, 0.05]} visible={false}>
            <M g={G.box(0.03, 0.03, 0.34)} m={mat(C.woodDark)} p={[0, 0, 0.12]} />
            <M g={G.box(0.26, 0.04, 0.04)} m={mat(C.steel, { metalness: 0.6, roughness: 0.3 })} p={[0, 0, 0.28]} />
          </group>
        </group>
        {/* capacete */}
        <M g={G.ico(0.19, 1)} m={suit} p={[0, 0.74, 0]} />
        <mesh geometry={G.ico(0.15, 1)} material={visor} position={[0, 0.75, 0.07]} scale={[1, 0.7, 0.75]} />
        <M g={G.cyl(0.01, 0.01, 0.16, 4)} m={mat(C.steel)} p={[0.1, 0.92, -0.04]} />
        <M g={G.ico(0.025, 0)} m={mat("#f97316", { emissive: "#f97316", emissiveIntensity: 1.5 })} p={[0.1, 1.0, -0.04]} shadow={false} />
      </group>
    </group>
  );
}
