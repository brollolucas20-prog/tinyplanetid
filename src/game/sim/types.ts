import type { BuildingTypeId } from "../data/buildings";
import type { Inventory, ItemId } from "../data/items";
import type { RecipeId } from "../data/recipes";

export type BuildingStatus =
  | "working"
  | "idle"
  | "noInput"
  | "noPower"
  | "outputFull"
  | "noConnection"
  | "noDeposit"
  | "noTrees"
  | "noFuel"
  | "paused"
  | "ready"
  | "storageFull"
  | "noRecipe";

export interface BuildingState {
  id: number;
  type: BuildingTypeId;
  tile: number;
  /** Índice do vizinho para onde o edifício está virado. */
  rot: number;
  level: number;
  recipe: RecipeId | null;
  progress: number;
  status: BuildingStatus;
  input: Inventory;
  output: Inventory;
  fuelTime: number;
  enabled: boolean;
  builtAt: number;
  outTruck: number;
  inTruck: number;
  outTimer: number;
  rocketReady?: boolean;
}

export interface Truck {
  id: number;
  /** Sequência de tiles a percorrer. */
  path: number[];
  /** Progresso em tiles ao longo do caminho. */
  t: number;
  /** Comprimento total (em tiles) — para drones é a distância em linha reta. */
  length: number;
  cargo: Inventory;
  kind: "out" | "in";
  building: number;
  drone: boolean;
}

export interface PlayerState {
  dir: [number, number, number];
  fwd: [number, number, number];
}

export interface PlanetState {
  id: string;
  inventory: Inventory;
  buildings: BuildingState[];
  deposit: number[];
  trees: number[];
  pollution: number[];
  ownedRegions: number[];
  trucks: Truck[];
  player: PlayerState;
  hqTile: number;
  rocketsLaunched: number;
}

export interface Counters {
  collected: Inventory;
  produced: Inventory;
  sold: Inventory;
  salesMoney: number;
}

export interface MarketEntry {
  mult: number;
  auto: boolean;
  keep: number;
}

export interface Settings {
  music: boolean;
  sfx: boolean;
  shadows: boolean;
  speed: number;
}

export interface GameState {
  version: 1;
  time: number;
  money: number;
  /** Pontos de pesquisa (globais). */
  rp: number;
  totalEarned: number;
  xp: number;
  level: number;
  researched: string[];
  activePlanet: string;
  discovered: string[];
  planets: Record<string, PlanetState>;
  market: Partial<Record<ItemId, MarketEntry>>;
  questIndex: number;
  questBaseline: number;
  counters: Counters;
  settings: Settings;
  nextId: number;
  playTime: number;
}

export type CelebrationKind = "tech" | "region" | "level" | "quest" | "planet" | "launch";

export interface GameEvents {
  popup: { planet: string; tile: number; text: string; color?: string; big?: boolean };
  sfx: { name: SfxName };
  toast: { title: string; body?: string; kind?: "info" | "success" | "warning" | "error" };
  celebrate: { kind: CelebrationKind; title: string; subtitle: string; color: string };
  structure: { planet: string };
  environment: { planet: string };
  launch: { planet: string; tile: number };
  planetChanged: { planet: string };
}

export type SfxName =
  | "click"
  | "place"
  | "demolish"
  | "collect"
  | "coin"
  | "unlock"
  | "error"
  | "quest"
  | "levelup"
  | "launch"
  | "hover";
