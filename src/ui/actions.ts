import { cursor, getGame } from "@/game/session";
import { useUI } from "./store";

/** Gira o edifício fantasma (ou o edifício selecionado). */
export function rotateGhostOrSelected(): void {
  const game = getGame();
  const ui = useUI.getState();
  if (ui.tool.kind === "build") {
    const tile = cursor.tile;
    const n = tile >= 0 ? game.world.hex.neighbors[tile].length : 6;
    const base = cursor.rot >= 0 ? cursor.rot : tile >= 0 ? game.defaultRot(tile) : 0;
    cursor.rot = (base + 1) % n;
    game.events.emit("sfx", { name: "click" });
  } else if (ui.selected != null) {
    game.rotate(ui.selected);
    game.events.emit("sfx", { name: "click" });
  }
}
