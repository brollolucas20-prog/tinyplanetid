import { Vector3 } from "three";
import { Game } from "./sim/game";

/**
 * Sessão ativa. O motor de simulação é um objeto mutável (rápido);
 * a cena 3D lê dele a cada quadro e a UI é atualizada por "ticks" do store.
 */
let current: Game | null = null;

export function getGame(): Game {
  if (!current) throw new Error("Nenhuma partida ativa");
  return current;
}

export function hasGame(): boolean {
  return current !== null;
}


export function startNewGame(): Game {
  Game.clearSave();
  current = new Game();
  resetSessionState();
  return current;
}

export function continueGame(): Game {
  const s = Game.loadState();
  current = new Game(s ?? undefined);
  resetSessionState();
  return current;
}

/** Estado de entrada do teclado. */
export const input = {
  keys: new Set<string>(),
};

/** Câmera em terceira pessoa ao redor do astronauta. */
export const cam = {
  /** Direção "para frente" da câmera, tangente à superfície no jogador. */
  heading: new Vector3(0, 0, 1),
  pitch: 0.62,
  dist: 11,
  targetDist: 11,
  shake: 0,
  initialized: false,
};

/** Estado do astronauta controlado pelo jogador. */
export const player = {
  pos: new Vector3(),
  up: new Vector3(0, 1, 0),
  tile: -1,
  moving: false,
  sprint: false,
  /** Tile de destino do clique-para-andar. */
  target: -1,
  /** Tile sendo coletado. */
  harvestTile: -1,
  harvesting: false,
  cooldown: 0,
  walkPhase: 0,
};

/** Cursor do mouse sobre o planeta. */
export const cursor = {
  tile: -1,
  rot: -1,
  screenX: 0,
  screenY: 0,
};

function resetSessionState() {
  cam.initialized = false;
  cam.dist = cam.targetDist = 11;
  cam.pitch = 0.62;
  player.target = -1;
  player.harvestTile = -1;
  player.harvesting = false;
  cursor.tile = -1;
  cursor.rot = -1;
  input.keys.clear();
}

// Atalho de depuração no console durante o desenvolvimento: __tpi.game().state
if (import.meta.env.DEV) {
  (window as unknown as { __tpi: unknown }).__tpi = { game: () => current, input, cam, player, cursor };
}
