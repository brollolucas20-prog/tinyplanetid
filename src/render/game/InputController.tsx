import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Vector2 } from "three";
import { BUILDINGS } from "@/game/data/buildings";
import { cam, cursor, getGame, player } from "@/game/session";
import { useUI } from "@/ui/store";
import { pickTile } from "./hooks";

/** Mouse: seleção, construção (com arraste para estradas), câmera e zoom. */
export function InputController() {
  const { camera, gl, raycaster } = useThree();

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __tpiCamera: unknown }).__tpiCamera = camera;
  }, [camera]);

  useEffect(() => {
    const el = gl.domElement;
    const ndc = new Vector2();
    let down: { x: number; y: number; button: number; moved: boolean; painting: boolean; lastTile: number } | null = null;
    let lx = 0;
    let ly = 0;

    const pick = (cx: number, cy: number) => {
      const rect = el.getBoundingClientRect();
      ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return pickTile(getGame().world, raycaster.ray, cursor.tile >= 0 ? cursor.tile : 0);
    };

    const updateHover = (cx: number, cy: number) => {
      cursor.screenX = cx;
      cursor.screenY = cy;
      const t = pick(cx, cy);
      if (t !== cursor.tile) {
        cursor.tile = t;
        useUI.getState().setHover(t);
      }
      return t;
    };

    const click = (tile: number) => {
      const game = getGame();
      const ui = useUI.getState();
      if (tile < 0) {
        ui.select(null);
        return;
      }
      const rt = game.rt;
      const tool = ui.tool;
      if (tool.kind === "build") {
        game.place(tool.type, tile, cursor.rot >= 0 ? cursor.rot : -1);
        return;
      }
      if (tool.kind === "demolish") {
        const bid = rt.tileBuilding[tile];
        if (bid >= 0) {
          const b = rt.byId.get(bid)!;
          if (b.type === "hq") ui.toast({ title: "A Sede não pode ser demolida", kind: "warning" });
          else {
            game.demolish(bid);
            if (ui.selected === bid) ui.select(null);
          }
        }
        return;
      }
      const bid = rt.tileBuilding[tile];
      if (bid >= 0 && rt.byId.get(bid)!.type !== "road") {
        ui.select(bid);
        game.events.emit("sfx", { name: "click" });
        return;
      }
      const region = game.world.tiles[tile].region;
      if (!rt.owned[region]) {
        if (game.regionBuyable(region)) ui.setRegionPrompt(region);
        else ui.toast({ title: "Região distante", body: "Compre primeiro uma região vizinha ao seu território.", kind: "info" });
        return;
      }
      ui.select(null);
      player.target = tile;
      player.harvestTile = game.harvestable(tile) ? tile : -1;
    };

    const onMove = (e: PointerEvent) => {
      const tile = updateHover(e.clientX, e.clientY);
      if (!down) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
      if (down.painting) {
        if (tile >= 0 && tile !== down.lastTile) {
          down.lastTile = tile;
          const game = getGame();
          if (game.checkPlace("road", tile).ok) game.place("road", tile, -1, false);
        }
        return;
      }
      if (down.moved) {
        cam.heading.applyAxisAngle(player.up, -dx * 0.006);
        cam.pitch = Math.min(1.45, Math.max(0.12, cam.pitch + dy * 0.005));
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      el.setPointerCapture(e.pointerId);
      lx = e.clientX;
      ly = e.clientY;
      const tile = updateHover(e.clientX, e.clientY);
      const tool = useUI.getState().tool;
      const painting = e.button === 0 && tool.kind === "build" && tool.type === "road";
      down = { x: e.clientX, y: e.clientY, button: e.button, moved: false, painting, lastTile: tile };
      if (painting && tile >= 0) getGame().place("road", tile);
    };

    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const d = down;
      down = null;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (d.moved || d.painting) return;
      if (d.button === 0) click(cursor.tile);
      else if (d.button === 2) {
        const ui = useUI.getState();
        if (ui.tool.kind !== "none") ui.setTool({ kind: "none" });
        else ui.select(null);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = Math.sign(e.deltaY) * Math.min(1, Math.abs(e.deltaY) / 100);
      cam.targetDist = Math.min(70, Math.max(4.5, cam.targetDist * (1 + f * 0.14)));
    };

    const onLeave = () => {
      cursor.tile = -1;
      useUI.getState().setHover(-1);
    };

    const noMenu = (e: Event) => e.preventDefault();
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", noMenu);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", noMenu);
    };
  }, [camera, gl, raycaster]);

  return null;
}

export function buildingRadius(type: string): number {
  const def = BUILDINGS[type as keyof typeof BUILDINGS];
  if (!def) return 0;
  return def.radius ?? def.harvester?.radius ?? 0;
}
