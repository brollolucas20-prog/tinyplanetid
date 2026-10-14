import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  type Group,
} from "three";
import { cursor, getGame } from "@/game/session";
import { useUI } from "@/ui/store";
import { buildTileOverlay, tileOutline, tileQuaternion, tileTop } from "../geo";
import { MODELS } from "../models/BuildingModels";
import { G } from "../kit";
import { buildingRadius } from "./InputController";

const ghostOk = new MeshStandardMaterial({ color: "#4ade80", transparent: true, opacity: 0.55, flatShading: true, emissive: "#16a34a", emissiveIntensity: 0.4, depthWrite: false });
const ghostBad = new MeshStandardMaterial({ color: "#f87171", transparent: true, opacity: 0.55, flatShading: true, emissive: "#b91c1c", emissiveIntensity: 0.4, depthWrite: false });
const overlayMat = new MeshBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: 0.18, depthWrite: false });
const regionMat = new MeshBasicMaterial({ color: "#ffe08a", transparent: true, opacity: 0.22, depthWrite: false });
const selMat = new MeshBasicMaterial({ color: "#ffd166", transparent: true, opacity: 0.9, depthWrite: false });

function Ghost({ type }: { type: string }) {
  const group = useRef<Group>(null);
  const Model = MODELS[type as keyof typeof MODELS];
  const working = useMemo(() => () => true, []);
  useLayoutEffect(() => {
    group.current?.traverse((o) => {
      if ((o as Mesh).isMesh) {
        (o as Mesh).material = ghostOk;
        (o as Mesh).castShadow = false;
      }
    });
  });
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const game = getGame();
    const tile = cursor.tile;
    g.visible = tile >= 0;
    if (tile < 0) return;
    const world = game.world;
    const rot = cursor.rot >= 0 ? cursor.rot : game.defaultRot(tile);
    tileTop(world, tile, g.position);
    tileQuaternion(world, tile, rot, g.quaternion);
    const ok = game.checkPlace(type as never, tile).ok;
    const m = ok ? ghostOk : ghostBad;
    g.traverse((o) => {
      if ((o as Mesh).isMesh && (o as Mesh).material !== m) (o as Mesh).material = m;
    });
  });
  if (!Model) {
    return (
      <group ref={group}>
        <mesh geometry={G.cyl(0.5, 0.5, 0.06, 6)} material={ghostOk} position={[0, 0.04, 0]} />
      </group>
    );
  }
  return (
    <group ref={group}>
      <Model working={working} level={1} />
    </group>
  );
}

export function Cursor() {
  const tool = useUI((s) => s.tool);
  const hoverTile = useUI((s) => s.hoverTile);
  const selected = useUI((s) => s.selected);
  const lineGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(8 * 3), 3));
    return g;
  }, []);
  const lineMat = useMemo(() => new LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9 }), []);
  const line = useMemo(() => new Line(lineGeo, lineMat), [lineGeo, lineMat]);
  const selRing = useRef<Mesh>(null);
  const game = getGame();

  // Contorno do tile sob o mouse
  useEffect(() => {
    if (hoverTile < 0) {
      line.visible = false;
      return;
    }
    const pts = tileOutline(game.world, hoverTile, 0.08);
    const attr = lineGeo.getAttribute("position") as BufferAttribute;
    (attr.array as Float32Array).fill(0);
    (attr.array as Float32Array).set(pts.subarray(0, Math.min(pts.length, 24)));
    attr.needsUpdate = true;
    lineGeo.setDrawRange(0, pts.length / 3);
    lineGeo.computeBoundingSphere();
    line.visible = true;
  }, [hoverTile, game, line, lineGeo]);

  // Área de alcance (lenhador, drones, viveiro, purificador)
  const rangeGeo = useMemo(() => {
    if (tool.kind !== "build" || hoverTile < 0) return null;
    const r = buildingRadius(tool.type);
    if (!r) return null;
    const tiles = game.radius(game.rt, hoverTile, r).map((x) => x.tile);
    return buildTileOverlay(game.world, tiles, 0.06);
  }, [tool, hoverTile, game]);

  // Alcance do edifício selecionado
  const selectedRange = useMemo(() => {
    if (selected == null) return null;
    const b = game.rt.byId.get(selected);
    if (!b) return null;
    const r = buildingRadius(b.type);
    if (!r) return null;
    return buildTileOverlay(game.world, game.radius(game.rt, b.tile, r).map((x) => x.tile), 0.06);
  }, [selected, game]);

  // Região à venda sob o mouse
  const regionGeo = useMemo(() => {
    if (tool.kind !== "none" || hoverTile < 0) return null;
    const region = game.world.tiles[hoverTile].region;
    if (game.rt.owned[region] || !game.regionBuyable(region)) return null;
    return buildTileOverlay(game.world, game.world.regions[region].tiles, 0.07);
  }, [tool, hoverTile, game]);

  useEffect(() => () => rangeGeo?.dispose(), [rangeGeo]);
  useEffect(() => () => regionGeo?.dispose(), [regionGeo]);
  useEffect(() => () => selectedRange?.dispose(), [selectedRange]);

  const tmpUp = useMemo(() => new Vector3(), []);
  useFrame((state) => {
    lineMat.color.set(tool.kind === "demolish" ? "#f87171" : tool.kind === "build" ? "#86efac" : "#ffffff");
    const ring = selRing.current;
    if (!ring) return;
    const b = selected != null ? game.rt.byId.get(selected) : undefined;
    ring.visible = !!b;
    if (b) {
      tileTop(game.world, b.tile, ring.position, 0.06);
      tmpUp.copy(game.world.hex.centers[b.tile]);
      ring.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), tmpUp);
      const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
      ring.scale.setScalar(s);
    }
  });

  return (
    <>
      <primitive object={line} />
      {tool.kind === "build" && <Ghost key={tool.type} type={tool.type} />}
      {rangeGeo && <mesh geometry={rangeGeo} material={overlayMat} renderOrder={5} />}
      {selectedRange && <mesh geometry={selectedRange} material={overlayMat} renderOrder={5} />}
      {regionGeo && <mesh geometry={regionGeo} material={regionMat} renderOrder={5} />}
      <mesh ref={selRing} material={selMat} visible={false} renderOrder={6}>
        <ringGeometry args={[0.78, 0.9, 6]} />
      </mesh>
    </>
  );
}
