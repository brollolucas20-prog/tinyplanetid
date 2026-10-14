import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import {
  AdditiveBlending,
  CanvasTexture,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  type DirectionalLight,
  type Sprite,
} from "three";
import { getGame } from "@/game/session";
import { sunDirection } from "@/game/sim/game";
import { useUI } from "@/ui/store";
import { tileTop } from "../geo";
import { Atmosphere, Borders, Clouds, Roads, Rocks, Terrain, Trees, Water } from "../world/PlanetParts";
import { Cursor } from "./Cursor";
import { GameBuildings } from "./GameBuildings";
import { usePolled } from "./hooks";
import { InputController } from "./InputController";
import { Particles } from "./Particles";
import { PlayerController } from "./PlayerController";
import { POPUP_LIFE, addPopup, popups } from "./popups";
import { RocketLaunch } from "./RocketLaunch";
import { Vehicles } from "./Vehicles";

function useTicker(ms: number): number {
  return usePolledInterval(ms);
}

function usePolledInterval(ms: number): number {
  const counter = useRef(0);
  const last = useRef(performance.now());
  return usePolled(() => {
    const now = performance.now();
    if (now - last.current >= ms) {
      last.current = now;
      counter.current++;
    }
    return counter.current;
  });
}

/** Mundo do planeta ativo, conectado ao motor. */
function PlanetView() {
  const game = getGame();
  const planetId = usePolled(() => game.state.activePlanet);
  const structure = usePolled(() => game.structureVersion);
  const env = usePolled(() => game.envVersion);
  const colorTick = useTicker(1000);
  const hoverTile = useUI((s) => s.hoverTile);
  const tool = useUI((s) => s.tool);
  const world = game.world;
  const ps = game.planet;
  const rt = game.rt;
  const paved = game.state.researched.includes("asphalt");

  const highlightRegion =
    tool.kind === "none" && hoverTile >= 0 && !rt.owned[world.tiles[hoverTile].region] && game.regionBuyable(world.tiles[hoverTile].region)
      ? world.tiles[hoverTile].region
      : -1;

  const paint = () => ({
    pollution: ps.pollution,
    owned: rt.owned,
    trees: ps.trees,
    highlightRegion,
  });
  const occupied = (t: number) => rt.tileBuilding[t] >= 0;
  const isRoad = (t: number) => {
    const id = rt.tileBuilding[t];
    return id >= 0 && rt.byId.get(id)!.type === "road";
  };
  const connects = (t: number) => {
    const id = rt.tileBuilding[t];
    return id >= 0 && rt.byId.get(id)!.type !== "road";
  };
  const smog = () => game.rt.pollutionIndex;

  return (
    <group key={planetId}>
      <Terrain world={world} paint={paint} version={structure * 1000 + colorTick + highlightRegion * 7 + env * 0.001} />
      <Water world={world} />
      <Trees world={world} trees={ps.trees} pollution={ps.pollution} skip={occupied} version={env + structure * 100000 + Math.floor(colorTick / 5)} />
      <Rocks world={world} deposit={ps.deposit} skip={occupied} version={env + structure * 100000} />
      <Roads world={world} isRoad={isRoad} connects={connects} paved={paved} version={structure} />
      <Borders world={world} owned={rt.owned} version={structure} />
      <Atmosphere world={world} smog={smog} />
      <Clouds world={world} smog={smog} />
    </group>
  );
}

function makeGlowTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,250,230,1)");
  g.addColorStop(0.2, "rgba(255,226,160,0.8)");
  g.addColorStop(0.5, "rgba(255,190,110,0.18)");
  g.addColorStop(1, "rgba(255,180,90,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Sol orbitando o planeta: luz direcional com sombras + brilho no céu. */
function SunAndLights() {
  const game = getGame();
  const sun = useRef<DirectionalLight>(null);
  const fill = useRef<DirectionalLight>(null);
  const glow = useRef<Sprite>(null);
  const shadows = usePolled(() => game.state.settings.shadows);
  const dir = useMemo(() => new Vector3(), []);
  const glowMat = useMemo(
    () => new SpriteMaterial({ map: makeGlowTexture(), blending: AdditiveBlending, depthWrite: false, transparent: true }),
    [],
  );
  const { scene } = useThree();
  useEffect(() => {
    if (sun.current) scene.add(sun.current.target);
  }, [scene]);
  useFrame(() => {
    sunDirection(game.state.time, dir);
    const R = game.world.def.radius;
    if (sun.current) {
      sun.current.position.copy(dir).multiplyScalar(R * 4);
      sun.current.target.position.set(0, 0, 0);
      const cam = sun.current.shadow.camera;
      const ext = R + 5;
      if (cam.right !== ext) {
        cam.left = -ext;
        cam.right = ext;
        cam.top = ext;
        cam.bottom = -ext;
        cam.far = R * 8;
        cam.updateProjectionMatrix();
      }
    }
    if (fill.current) fill.current.position.copy(dir).multiplyScalar(-R * 4);
    if (glow.current) glow.current.position.copy(dir).multiplyScalar(260);
  });
  return (
    <>
      <ambientLight intensity={0.55} color="#c7d2fe" />
      <directionalLight
        ref={sun}
        intensity={2.6}
        color="#fff1d6"
        castShadow={shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight ref={fill} intensity={0.7} color="#7d96ff" />
      <sprite ref={glow} material={glowMat} scale={[90, 90, 1]} />
    </>
  );
}

/** Converte eventos de popup do motor em textos 3D projetados. */
function PopupProjector() {
  const game = getGame();
  const { camera, size } = useThree();
  useEffect(() => {
    return game.events.on("popup", (e) => {
      if (e.planet !== game.state.activePlanet) return;
      const world = game.world;
      const up = world.hex.centers[e.tile];
      const pos = tileTop(world, e.tile, new Vector3(), e.big ? 2.2 : 1.4);
      addPopup(e.text, e.color ?? "#ffffff", pos, up, e.big);
    });
  }, [game]);
  const v = useMemo(() => new Vector3(), []);
  const camDir = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const now = performance.now();
    camera.getWorldDirection(camDir);
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      const age = (now - p.born) / 1000;
      if (age > POPUP_LIFE) {
        p.el.remove();
        popups.splice(i, 1);
        continue;
      }
      v.copy(p.world).addScaledVector(p.up, age * 0.9);
      // esconde o que está do outro lado do planeta
      const facing = v.clone().normalize().dot(camera.position.clone().normalize());
      v.project(camera);
      const visible = v.z < 1 && facing > 0.05;
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const op = age < 0.15 ? age / 0.15 : age > POPUP_LIFE - 0.4 ? (POPUP_LIFE - age) / 0.4 : 1;
      p.el.style.opacity = visible ? String(op) : "0";
      p.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${0.85 + Math.min(1, age * 6) * 0.15})`;
    }
  });
  return null;
}

/** Loop da simulação ligado ao quadro de renderização + autosave. */
function SimulationDriver() {
  const game = getGame();
  const hudTimer = useRef(0);
  useFrame((_s, dt) => {
    game.update(dt);
    hudTimer.current += dt;
    if (hudTimer.current > 0.2) {
      hudTimer.current = 0;
      useUI.getState().bumpHud();
    }
  });
  useEffect(() => {
    const id = window.setInterval(() => game.save(), 20000);
    const onHide = () => game.save();
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [game]);
  return null;
}

export function GameScene() {
  return (
    <>
      <SimulationDriver />
      <SunAndLights />
      <Stars radius={320} depth={80} count={4000} factor={7} saturation={0.4} fade speed={0.4} />
      <PlanetView />
      <GameBuildings />
      <Vehicles />
      <PlayerController />
      <Particles />
      <RocketLaunch />
      <Cursor />
      <InputController />
      <PopupProjector />
    </>
  );
}
