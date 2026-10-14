import { Vector3 } from "three";
import { BUILDINGS, LEVELS, type BuildingCost, type BuildingTypeId } from "../data/buildings";
import { ITEMS, SELLABLE_ITEMS, type Inventory, type ItemId } from "../data/items";
import { PLANETS, PLANET_MAP } from "../data/planets";
import { QUESTS, xpForLevel, CIV_TITLES, type QuestDef } from "../data/quests";
import { RECIPES, type RecipeId } from "../data/recipes";
import { TECH_MAP, computeModifiers, type Modifiers } from "../data/research";
import { tilesWithin } from "../world/geodesic";
import { getWorld, type PlanetWorld } from "../world/planetGen";
import { Emitter } from "./emitter";
import { invAdd, invAddAll, invEntries, invGet, invHas, invSub, invTotal } from "./inventory";
import type { BuildingState, GameEvents, GameState, PlanetState, Truck } from "./types";

export const TICK = 0.1;
export const DAY_LENGTH = 300;
export const BASE_STORAGE = 400;
export const OUTPUT_CAP = 20;
export const TRUCK_SPEED = 2.4;
export const DRONE_SPEED = 4.2;
export const SAVE_KEY = "tiny-planet-industries/save-v1";

/** Direção do sol — usada pela simulação (painéis solares) e pela renderização. */
export function sunDirection(time: number, out = new Vector3()): Vector3 {
  const a = (time / DAY_LENGTH) * Math.PI * 2;
  return out.set(Math.cos(a), 0.3, Math.sin(a)).normalize();
}

export interface Link {
  kind: "road" | "drone" | "none";
  next: number;
  hubTile: number;
  dist: number;
}

export interface PlanetRuntime {
  id: string;
  world: PlanetWorld;
  tileBuilding: Int32Array;
  byId: Map<number, BuildingState>;
  roadDist: Int32Array;
  links: Map<number, Link>;
  owned: Uint8Array;
  storageCap: number;
  power: { gen: number; demand: number; ratio: number };
  genOut: Map<number, number>;
  wantsPower: Set<number>;
  harvestPartial: Map<number, number>;
  radiusCache: Map<string, { tile: number; dist: number }[]>;
  pBuf: Float32Array;
  pollutionIndex: number;
  fine: number;
  connectedCount: number;
  slowTimer: number;
}

export interface PlaceCheck {
  ok: boolean;
  reason?: string;
  /** O local é válido, mas faltam recursos. */
  placeable: boolean;
}

const sunTmp = new Vector3();

export function createPlanetState(planetId: string, first: boolean): PlanetState {
  const def = PLANET_MAP[planetId];
  const world = getWorld(def);
  const n = world.hex.count;
  const start = world.startTile;
  const hq: BuildingState = newBuilding(1, "hq", start, 0, 0);
  const playerTile = world.hex.neighbors[start][0];
  const pc = world.hex.centers[playerTile];
  const sc = world.hex.centers[start];
  const fwd = sc.clone().sub(pc);
  fwd.addScaledVector(pc, -fwd.dot(pc)).normalize();
  return {
    id: planetId,
    inventory: first ? { wood: 20, stone: 20 } : { wood: 80, stone: 80, planks: 60, brick: 60, ironPlate: 60, copperPlate: 40 },
    buildings: [hq],
    deposit: world.tiles.map((t) => t.depositAmount),
    trees: world.tiles.map((t) => t.treeCap),
    pollution: new Array(n).fill(0),
    ownedRegions: [0],
    trucks: [],
    player: { dir: [pc.x, pc.y, pc.z], fwd: [fwd.x, fwd.y, fwd.z] },
    hqTile: start,
    rocketsLaunched: 0,
  };
}

function newBuilding(id: number, type: BuildingTypeId, tile: number, rot: number, time: number): BuildingState {
  return {
    id,
    type,
    tile,
    rot,
    level: 1,
    recipe: null,
    progress: 0,
    status: "idle",
    input: {},
    output: {},
    fuelTime: 0,
    enabled: true,
    builtAt: time,
    outTruck: 0,
    inTruck: 0,
    outTimer: 0,
  };
}

export function createNewGame(): GameState {
  const first = PLANETS[0];
  return {
    version: 1,
    time: DAY_LENGTH * 0.1,
    money: first.startMoney,
    totalEarned: 0,
    xp: 0,
    level: 1,
    researched: [],
    activePlanet: first.id,
    discovered: [first.id],
    planets: { [first.id]: createPlanetState(first.id, true) },
    market: {},
    questIndex: 0,
    questBaseline: 0,
    counters: { collected: {}, produced: {}, sold: {}, salesMoney: 0 },
    settings: { music: true, sfx: true, shadows: true, speed: 1 },
    nextId: 100,
    playTime: 0,
    rp: 0,
  };
}

/** Quests além da lista fixa: metas infinitas e crescentes. */
export function getQuest(index: number): QuestDef {
  if (index < QUESTS.length) return QUESTS[index];
  const k = index - QUESTS.length + 1;
  const templates: ((k: number) => QuestDef)[] = [
    (k) => ({
      id: `inf_comp_${k}`,
      title: `Magnata digital ${k}`,
      description: `Produza ${20 * k} Computadores.`,
      hint: "Fábricas avançadas em nível máximo aceleram tudo.",
      goal: { type: "produce", item: "computer", amount: 20 * k },
      reward: { money: 15000 * k, xp: 1500 * k },
    }),
    (k) => ({
      id: `inf_sales_${k}`,
      title: `Império comercial ${k}`,
      description: `Fature $${(60000 * k).toLocaleString("pt-BR")} em vendas.`,
      hint: "Diversifique: vender um só item derruba o preço.",
      goal: { type: "sales", amount: 60000 * k },
      reward: { money: 12000 * k, xp: 1500 * k },
    }),
    (k) => ({
      id: `inf_motor_${k}`,
      title: `Linha de montagem ${k}`,
      description: `Produza ${60 * k} Motores.`,
      hint: "Motores precisam de engrenagens, aço e fios.",
      goal: { type: "produce", item: "motor", amount: 60 * k },
      reward: { money: 14000 * k, xp: 1500 * k },
    }),
    (k) => ({
      id: `inf_launch_${k}`,
      title: `Programa espacial ${k}`,
      description: `Lance mais um foguete (total ${k + 1}).`,
      hint: "Cada lançamento rende fama e dinheiro.",
      goal: { type: "launch", amount: k + 1 },
      reward: { money: 30000 * k, xp: 3000 * k },
    }),
  ];
  return templates[(k - 1) % templates.length](Math.ceil(k / templates.length));
}

export class Game {
  state: GameState;
  mods: Modifiers;
  events = new Emitter<GameEvents>();
  runtimes = new Map<string, PlanetRuntime>();
  /** Incrementa quando edifícios/estradas/regiões mudam. */
  structureVersion = 0;
  /** Incrementa quando árvores/poluição mudam (cores do terreno). */
  envVersion = 0;
  priceHistory: Partial<Record<ItemId, number[]>> = {};
  revenueWindow: number[] = [];
  revenueRate = 0;
  private acc = 0;
  private secTimer = 0;
  private questTimer = 0;
  private revenueThisSec = 0;
  private historyTimer = 0;

  constructor(state?: GameState) {
    this.state = state ?? createNewGame();
    if (typeof this.state.rp !== "number") this.state.rp = 0;
    this.mods = computeModifiers(this.state.researched);
    for (const id of Object.keys(this.state.planets)) this.initRuntime(id);
    for (const item of SELLABLE_ITEMS) this.priceHistory[item] = [this.price(item)];
  }

  // ───────────────────────────── acesso ─────────────────────────────
  get planet(): PlanetState {
    return this.state.planets[this.state.activePlanet];
  }
  get rt(): PlanetRuntime {
    return this.runtimes.get(this.state.activePlanet)!;
  }
  get world(): PlanetWorld {
    return this.rt.world;
  }

  private initRuntime(id: string): void {
    const world = getWorld(PLANET_MAP[id]);
    const n = world.hex.count;
    const rt: PlanetRuntime = {
      id,
      world,
      tileBuilding: new Int32Array(n).fill(-1),
      byId: new Map(),
      roadDist: new Int32Array(n).fill(-1),
      links: new Map(),
      owned: new Uint8Array(world.regions.length),
      storageCap: BASE_STORAGE,
      power: { gen: 0, demand: 0, ratio: 1 },
      genOut: new Map(),
      wantsPower: new Set(),
      harvestPartial: new Map(),
      radiusCache: new Map(),
      pBuf: new Float32Array(n),
      pollutionIndex: 0,
      fine: 0,
      connectedCount: 0,
      slowTimer: Math.random(),
    };
    this.runtimes.set(id, rt);
    this.rebuild(id);
  }

  radius(rt: PlanetRuntime, tile: number, r: number) {
    const key = `${tile}:${r}`;
    let v = rt.radiusCache.get(key);
    if (!v) {
      v = tilesWithin(rt.world.hex, tile, r);
      rt.radiusCache.set(key, v);
    }
    return v;
  }

  /** Recalcula mapa de ocupação, rede de estradas e conexões. */
  rebuild(planetId = this.state.activePlanet): void {
    const ps = this.state.planets[planetId];
    const rt = this.runtimes.get(planetId)!;
    const hex = rt.world.hex;
    rt.tileBuilding.fill(-1);
    rt.byId.clear();
    for (const b of ps.buildings) {
      rt.tileBuilding[b.tile] = b.id;
      rt.byId.set(b.id, b);
    }
    rt.owned.fill(0);
    for (const r of ps.ownedRegions) rt.owned[r] = 1;

    // BFS a partir dos hubs pelas estradas
    rt.roadDist.fill(-1);
    const queue: number[] = [];
    const droneHubs: number[] = [];
    let cap = BASE_STORAGE + this.mods.storage;
    for (const b of ps.buildings) {
      const def = BUILDINGS[b.type];
      if (def.hub) {
        rt.roadDist[b.tile] = 0;
        queue.push(b.tile);
        if (b.type === "droneHub") droneHubs.push(b.tile);
      }
      if (def.storageBonus) cap += def.storageBonus;
    }
    rt.storageCap = cap;
    for (let qi = 0; qi < queue.length; qi++) {
      const t = queue[qi];
      for (const nb of hex.neighbors[t]) {
        if (rt.roadDist[nb] !== -1) continue;
        const bid = rt.tileBuilding[nb];
        if (bid < 0 || rt.byId.get(bid)!.type !== "road") continue;
        rt.roadDist[nb] = rt.roadDist[t] + 1;
        queue.push(nb);
      }
    }

    rt.links.clear();
    let connected = 0;
    for (const b of ps.buildings) {
      const def = BUILDINGS[b.type];
      if (b.type === "road" || def.hub) continue;
      let link: Link = { kind: "none", next: -1, hubTile: -1, dist: 0 };
      for (const nb of hex.neighbors[b.tile]) {
        const d = rt.roadDist[nb];
        if (d >= 0 && (link.kind === "none" || d + 1 < link.dist)) link = { kind: "road", next: nb, hubTile: -1, dist: d + 1 };
      }
      if (link.kind === "none" && droneHubs.length) {
        for (const h of droneHubs) {
          const hit = this.radius(rt, h, BUILDINGS.droneHub.radius!).find((x) => x.tile === b.tile);
          if (hit && (link.kind === "none" || hit.dist < link.dist)) link = { kind: "drone", next: h, hubTile: h, dist: hit.dist };
        }
      }
      if (link.kind !== "none") connected++;
      rt.links.set(b.id, link);
    }
    rt.connectedCount = connected;
    if (planetId === this.state.activePlanet) this.structureVersion++;
    this.events.emit("structure", { planet: planetId });
  }

  // ───────────────────────────── consultas ─────────────────────────────
  isUnlocked(type: BuildingTypeId): boolean {
    const t = BUILDINGS[type].tech;
    return !t || this.state.researched.includes(t);
  }

  recipeUnlocked(id: RecipeId): boolean {
    const t = RECIPES[id].tech;
    return !t || this.state.researched.includes(t);
  }

  canAfford(cost: BuildingCost, inv = this.planet.inventory): boolean {
    return this.state.money >= cost.money && invHas(inv, cost.items);
  }

  upgradeCost(b: BuildingState): BuildingCost | null {
    if (b.type === "road" || b.type === "hq") return null;
    if (b.level >= this.mods.maxLevel || b.level >= LEVELS.length) return null;
    const m = LEVELS[b.level].costMult;
    const def = BUILDINGS[b.type];
    const items: Inventory = {};
    for (const [id, q] of invEntries(def.cost.items)) items[id] = Math.ceil(q * m);
    return { money: Math.round(def.cost.money * m), items };
  }

  regionPrice(regionId: number, planetId = this.state.activePlanet): number {
    const ps = this.state.planets[planetId];
    const rt = this.runtimes.get(planetId)!;
    const size = rt.world.regions[regionId].tiles.length;
    const owned = ps.ownedRegions.length;
    const raw = 250 * Math.pow(1.5, owned - 1) * Math.pow(size / 45, 0.7);
    return Math.round(raw / 10) * 10;
  }

  regionBuyable(regionId: number): boolean {
    const rt = this.rt;
    if (rt.owned[regionId]) return false;
    return rt.world.regions[regionId].neighbors.some((r) => rt.owned[r]);
  }

  price(item: ItemId): number {
    const def = ITEMS[item];
    const m = this.state.market[item]?.mult ?? 1;
    const phase = def.basePrice * 1.7 + item.length;
    const t = this.state.time;
    const wave = 1 + 0.12 * Math.sin(t / 80 + phase) + 0.05 * Math.sin(t / 21 + phase * 3);
    return def.basePrice * m * wave * (1 + this.mods.sellBonus);
  }

  outputCap(b: BuildingState): number {
    return OUTPUT_CAP * b.level;
  }

  truckCapacity(b: BuildingState): number {
    if (b.type === "rocketPad") return 25;
    return 8 + 4 * (b.level - 1);
  }

  checkPlace(type: BuildingTypeId, tile: number): PlaceCheck {
    const rt = this.rt;
    const ps = this.planet;
    const def = BUILDINGS[type];
    const t = rt.world.tiles[tile];
    if (!this.isUnlocked(type)) return { ok: false, placeable: false, reason: "Requer pesquisa" };
    if (!rt.owned[t.region]) return { ok: false, placeable: false, reason: "Região não adquirida" };
    if (rt.tileBuilding[tile] >= 0) return { ok: false, placeable: false, reason: "Espaço ocupado" };
    if (type === "road") {
      if (t.level < -1) return { ok: false, placeable: false, reason: "Água profunda demais" };
    } else if (t.level < 0) return { ok: false, placeable: false, reason: "Não dá para construir na água" };
    const hasDeposit = !!t.deposit && ps.deposit[tile] > 0;
    if (def.placement === "deposit") {
      if (!hasDeposit) return { ok: false, placeable: false, reason: "Precisa ficar sobre um depósito" };
    } else if (type !== "road" && hasDeposit) {
      return { ok: false, placeable: false, reason: "Depósito: use uma Mineradora" };
    }
    if (type === "rocketPad" && ps.buildings.some((b) => b.type === "rocketPad"))
      return { ok: false, placeable: false, reason: "Só uma plataforma por planeta" };
    if (!this.canAfford(def.cost)) return { ok: false, placeable: true, reason: "Recursos insuficientes" };
    return { ok: true, placeable: true };
  }

  defaultRot(tile: number): number {
    const rt = this.rt;
    const nbs = rt.world.hex.neighbors[tile];
    let best = 0;
    let bestD = Infinity;
    nbs.forEach((nb, k) => {
      const d = rt.roadDist[nb];
      if (d >= 0 && d < bestD) {
        bestD = d;
        best = k;
      }
    });
    return best;
  }

  // ───────────────────────────── ações ─────────────────────────────
  place(type: BuildingTypeId, tile: number, rot = -1, silent = false): BuildingState | null {
    const check = this.checkPlace(type, tile);
    if (!check.ok) {
      if (!silent) {
        this.events.emit("sfx", { name: "error" });
        this.events.emit("toast", { title: check.reason ?? "Não é possível construir", kind: "error" });
      }
      return null;
    }
    const def = BUILDINGS[type];
    const ps = this.planet;
    this.state.money -= def.cost.money;
    invSub(ps.inventory, def.cost.items);
    const b = newBuilding(this.state.nextId++, type, tile, rot >= 0 ? rot : this.defaultRot(tile), this.state.time);
    if (def.recipes) b.recipe = def.recipes.find((r) => this.recipeUnlocked(r)) ?? null;
    // Limpa árvores do local
    const trees = ps.trees[tile];
    if (trees > 0) {
      ps.trees[tile] = 0;
      const wood = trees * 2;
      invAdd(ps.inventory, "wood", wood);
      this.events.emit("popup", { planet: ps.id, tile, text: `+${wood} Madeira`, color: ITEMS.wood.color });
      this.envVersion++;
    }
    ps.buildings.push(b);
    this.rebuild();
    if (!silent) this.events.emit("sfx", { name: "place" });
    this.gainXp(type === "road" ? 0.5 : 4);
    return b;
  }

  demolish(id: number): void {
    const ps = this.planet;
    const b = this.rt.byId.get(id);
    if (!b || b.type === "hq") return;
    const def = BUILDINGS[b.type];
    let money = def.cost.money;
    const items: Inventory = { ...def.cost.items };
    for (let l = 1; l < b.level; l++) {
      const m = LEVELS[l].costMult;
      money += def.cost.money * m;
      for (const [it, q] of invEntries(def.cost.items)) invAdd(items, it, Math.ceil(q * m));
    }
    this.state.money += Math.round(money * 0.5);
    for (const [it, q] of invEntries(items)) invAdd(ps.inventory, it, Math.floor(q * 0.5));
    invAddAll(ps.inventory, b.input);
    invAddAll(ps.inventory, b.output);
    ps.buildings = ps.buildings.filter((x) => x.id !== id);
    this.rebuild();
    this.events.emit("sfx", { name: "demolish" });
  }

  upgrade(id: number): void {
    const b = this.rt.byId.get(id);
    if (!b) return;
    const cost = this.upgradeCost(b);
    if (!cost) return;
    if (!this.canAfford(cost)) {
      this.events.emit("sfx", { name: "error" });
      this.events.emit("toast", { title: "Recursos insuficientes para melhorar", kind: "error" });
      return;
    }
    this.state.money -= cost.money;
    invSub(this.planet.inventory, cost.items);
    b.level++;
    b.builtAt = this.state.time;
    this.events.emit("sfx", { name: "levelup" });
    this.events.emit("popup", { planet: this.planet.id, tile: b.tile, text: `Nível ${b.level}!`, color: "#ffd166", big: true });
    this.gainXp(10 * b.level);
    this.structureVersion++;
  }

  setRecipe(id: number, recipe: RecipeId): void {
    const b = this.rt.byId.get(id);
    if (!b || b.recipe === recipe || !this.recipeUnlocked(recipe)) return;
    invAddAll(this.planet.inventory, b.input);
    b.input = {};
    b.recipe = recipe;
    b.progress = 0;
    this.events.emit("sfx", { name: "click" });
  }

  toggle(id: number): void {
    const b = this.rt.byId.get(id);
    if (!b) return;
    b.enabled = !b.enabled;
    this.events.emit("sfx", { name: "click" });
  }

  rotate(id: number): void {
    const b = this.rt.byId.get(id);
    if (!b) return;
    b.rot = (b.rot + 1) % this.world.hex.neighbors[b.tile].length;
    this.structureVersion++;
  }

  /** Recolhe manualmente a produção de um edifício (sem estrada). */
  collectFrom(id: number): void {
    const ps = this.planet;
    const b = this.rt.byId.get(id);
    if (!b) return;
    const total = invTotal(b.output);
    if (total <= 0) return;
    for (const [it, q] of invEntries(b.output)) {
      const whole = Math.floor(q);
      if (whole <= 0) continue;
      this.deliver(ps, it, whole, b.tile, false);
      invAdd(b.output, it, -whole);
    }
    this.events.emit("sfx", { name: "collect" });
  }

  /** Abastece manualmente um edifício com os insumos da Sede. */
  supply(id: number): void {
    const ps = this.planet;
    const b = this.rt.byId.get(id);
    if (!b) return;
    const needs = this.inputNeeds(b, true);
    let moved = 0;
    for (const [it, q] of invEntries(needs)) {
      const take = Math.min(q, Math.floor(invGet(ps.inventory, it)));
      if (take <= 0) continue;
      invAdd(ps.inventory, it, -take);
      invAdd(b.input, it, take);
      moved += take;
    }
    if (moved > 0) this.events.emit("sfx", { name: "collect" });
    else this.events.emit("toast", { title: "Sem insumos na Sede", kind: "warning" });
  }

  /** Coleta manual feita pelo jogador. Retorna o item obtido. */
  harvest(tile: number): ItemId | null {
    const ps = this.planet;
    const rt = this.rt;
    const t = rt.world.tiles[tile];
    if (rt.tileBuilding[tile] >= 0) return null;
    let item: ItemId | null = null;
    if (t.deposit && ps.deposit[tile] > 0) {
      item = t.deposit;
      ps.deposit[tile] -= 1;
      if (ps.deposit[tile] <= 0) this.envVersion++;
    } else if (ps.trees[tile] > 0) {
      item = "wood";
      const p = (rt.harvestPartial.get(tile) ?? 0) + 1;
      if (p >= 3) {
        ps.trees[tile] -= 1;
        rt.harvestPartial.delete(tile);
        this.envVersion++;
      } else rt.harvestPartial.set(tile, p);
    }
    if (!item) return null;
    if (invGet(ps.inventory, item) >= rt.storageCap) {
      this.events.emit("toast", { title: "Armazenamento cheio", body: "Venda itens ou construa Armazéns.", kind: "warning" });
      return null;
    }
    invAdd(ps.inventory, item, 1);
    invAdd(this.state.counters.collected, item, 1);
    this.events.emit("popup", { planet: ps.id, tile, text: `+1 ${ITEMS[item].name}`, color: ITEMS[item].accent });
    this.events.emit("sfx", { name: "collect" });
    this.gainXp(0.5);
    return item;
  }

  harvestable(tile: number): boolean {
    const ps = this.planet;
    const rt = this.rt;
    if (rt.tileBuilding[tile] >= 0) return false;
    const t = rt.world.tiles[tile];
    return (!!t.deposit && ps.deposit[tile] > 0) || ps.trees[tile] > 0;
  }

  buyRegion(regionId: number): boolean {
    if (!this.regionBuyable(regionId)) return false;
    const price = this.regionPrice(regionId);
    if (this.state.money < price) {
      this.events.emit("sfx", { name: "error" });
      this.events.emit("toast", { title: "Dinheiro insuficiente", body: `A região custa $${price.toLocaleString("pt-BR")}.`, kind: "error" });
      return false;
    }
    this.state.money -= price;
    this.planet.ownedRegions.push(regionId);
    this.rebuild();
    const reg = this.world.regions[regionId];
    this.events.emit("sfx", { name: "unlock" });
    this.events.emit("celebrate", { kind: "region", title: reg.name, subtitle: "Nova região adquirida", color: "#4ade80" });
    this.gainXp(40 + 15 * this.planet.ownedRegions.length);
    return true;
  }

  canResearch(id: string): { ok: boolean; reason?: string } {
    const tech = TECH_MAP[id];
    if (!tech) return { ok: false, reason: "?" };
    if (this.state.researched.includes(id)) return { ok: false, reason: "Concluída" };
    if (!tech.requires.every((r) => this.state.researched.includes(r))) return { ok: false, reason: "Requer tecnologias anteriores" };
    if (this.state.money < tech.cost.money) return { ok: false, reason: "Dinheiro insuficiente" };
    if (this.state.rp < tech.cost.research) return { ok: false, reason: "Pesquisa insuficiente" };
    if (tech.cost.items && !invHas(this.planet.inventory, tech.cost.items)) return { ok: false, reason: "Materiais insuficientes" };
    return { ok: true };
  }

  research(id: string): boolean {
    const can = this.canResearch(id);
    if (!can.ok) {
      this.events.emit("sfx", { name: "error" });
      this.events.emit("toast", { title: can.reason ?? "Indisponível", kind: "error" });
      return false;
    }
    const tech = TECH_MAP[id];
    this.state.money -= tech.cost.money;
    this.state.rp -= tech.cost.research;
    if (tech.cost.items) invSub(this.planet.inventory, tech.cost.items);
    this.state.researched.push(id);
    this.mods = computeModifiers(this.state.researched);
    for (const id2 of Object.keys(this.state.planets)) this.rebuild(id2);
    const unlockNames = [
      ...(tech.unlocks.buildings ?? []).map((b) => BUILDINGS[b].name),
      ...(tech.unlocks.recipes ?? []).map((r) => RECIPES[r].name),
    ];
    this.events.emit("sfx", { name: "unlock" });
    this.events.emit("celebrate", {
      kind: "tech",
      title: tech.name,
      subtitle: unlockNames.length ? `Desbloqueado: ${unlockNames.join(" · ")}` : tech.description,
      color: "#a78bfa",
    });
    this.gainXp(60 * tech.tier);
    return true;
  }

  sell(item: ItemId, qty: number, silent = false, ps: PlanetState = this.planet): number {
    const have = Math.floor(invGet(ps.inventory, item));
    const q = Math.min(have, Math.floor(qty));
    if (q <= 0 || !ITEMS[item].sellable) return 0;
    const entry = (this.state.market[item] ??= { mult: 1, auto: false, keep: 50 });
    const elasticity = 0.0035 / (1 + ITEMS[item].tier * 0.6);
    const before = this.price(item);
    const multAfter = Math.max(0.3, entry.mult * Math.pow(1 - elasticity, q));
    const avgFactor = (1 + multAfter / entry.mult) / 2;
    const revenue = Math.round(before * avgFactor * q * 100) / 100;
    entry.mult = multAfter;
    invAdd(ps.inventory, item, -q);
    this.state.money += revenue;
    this.state.totalEarned += revenue;
    this.state.counters.salesMoney += revenue;
    invAdd(this.state.counters.sold, item, q);
    this.revenueThisSec += revenue;
    this.gainXp(revenue / 12);
    if (!silent) {
      this.events.emit("sfx", { name: "coin" });
      this.events.emit("popup", { planet: ps.id, tile: ps.hqTile, text: `+$${fmtMoney(revenue)}`, color: "#ffd166", big: true });
    }
    return revenue;
  }

  setAutoSell(item: ItemId, auto: boolean, keep?: number): void {
    const entry = (this.state.market[item] ??= { mult: 1, auto: false, keep: 50 });
    entry.auto = auto;
    if (keep !== undefined) entry.keep = Math.max(0, Math.round(keep));
  }

  launchRocket(id: number): void {
    const ps = this.planet;
    const b = this.rt.byId.get(id);
    if (!b || b.type !== "rocketPad" || !b.rocketReady) return;
    b.rocketReady = false;
    b.progress = 0;
    ps.rocketsLaunched++;
    this.events.emit("launch", { planet: ps.id, tile: b.tile });
    this.events.emit("sfx", { name: "launch" });
    const reward = 20000 * ps.rocketsLaunched;
    this.state.money += reward;
    this.gainXp(2000);
    const next = PLANETS.find((p) => !this.state.discovered.includes(p.id));
    setTimeout(() => {
      if (next) {
        this.state.discovered.push(next.id);
        this.state.planets[next.id] = createPlanetState(next.id, false);
        this.initRuntime(next.id);
        this.events.emit("celebrate", {
          kind: "planet",
          title: next.name,
          subtitle: `Novo planeta descoberto · ${next.subtitle}`,
          color: next.atmosphere,
        });
      } else {
        this.events.emit("celebrate", {
          kind: "launch",
          title: "Lançamento perfeito!",
          subtitle: `+$${fmtMoney(reward)} em contratos espaciais`,
          color: "#38bdf8",
        });
      }
    }, 3200);
  }

  travel(planetId: string): void {
    if (!this.state.planets[planetId] || planetId === this.state.activePlanet) return;
    this.state.activePlanet = planetId;
    this.rebuild(planetId);
    this.structureVersion++;
    this.envVersion++;
    this.events.emit("planetChanged", { planet: planetId });
    this.events.emit("sfx", { name: "launch" });
  }

  gainXp(amount: number): void {
    const s = this.state;
    s.xp += amount;
    while (s.xp >= xpForLevel(s.level + 1) && s.level < 60) {
      s.level++;
      const reward = 150 * s.level;
      s.money += reward;
      this.events.emit("sfx", { name: "levelup" });
      this.events.emit("celebrate", {
        kind: "level",
        title: `Nível ${s.level}`,
        subtitle: `${civTitle(s.level)} · +$${fmtMoney(reward)}`,
        color: "#fbbf24",
      });
    }
  }

  // ───────────────────────────── quests ─────────────────────────────
  get quest(): QuestDef {
    return getQuest(this.state.questIndex);
  }

  private questCounter(q: QuestDef): number {
    const g = q.goal;
    const c = this.state.counters;
    if (g.type === "collect") return invGet(c.collected, g.item);
    if (g.type === "produce") return invGet(c.produced, g.item);
    if (g.type === "sales") return c.salesMoney;
    return 0;
  }

  questProgress(): { value: number; target: number } {
    const q = this.quest;
    const g = q.goal;
    const ps = this.planet;
    const rt = this.rt;
    switch (g.type) {
      case "collect":
      case "produce":
      case "sales":
        // Contadores acumulados: o que o jogador já fez antes da missão também conta.
        return { value: this.questCounter(q), target: g.amount };
      case "have":
        return { value: ps.buildings.filter((b) => b.type === g.building).length, target: g.amount };
      case "connect":
        return { value: rt.connectedCount, target: g.amount };
      case "regions":
        return { value: ps.ownedRegions.length, target: g.amount };
      case "research":
        return { value: this.state.researched.includes(g.tech) ? 1 : 0, target: 1 };
      case "powerGen":
        return { value: Math.floor(rt.power.gen), target: g.amount };
      case "buildings":
        return { value: ps.buildings.filter((b) => b.type !== "road" && b.type !== "hq").length, target: g.amount };
      case "launch":
        return {
          value: Object.values(this.state.planets).reduce((s, p) => s + p.rocketsLaunched, 0),
          target: g.amount,
        };
    }
  }

  private checkQuest(): void {
    const { value, target } = this.questProgress();
    if (value < target) return;
    const q = this.quest;
    this.state.money += q.reward.money;
    this.state.questIndex++;
    this.events.emit("sfx", { name: "quest" });
    this.events.emit("celebrate", {
      kind: "quest",
      title: q.title,
      subtitle: `Missão concluída · +$${fmtMoney(q.reward.money)}`,
      color: "#34d399",
    });
    this.gainXp(q.reward.xp);
  }

  // ───────────────────────────── simulação ─────────────────────────────
  /** Tempo de simulação acumulado ainda não processado (para interpolar a renderização). */
  get subTick(): number {
    return this.acc;
  }

  update(realDt: number): void {
    const speed = this.state.settings.speed;
    if (speed <= 0) return;
    this.acc += Math.min(realDt, 0.25) * speed;
    let steps = 0;
    while (this.acc >= TICK && steps < 40) {
      this.tick(TICK);
      this.acc -= TICK;
      steps++;
    }
  }

  tick(dt: number): void {
    const s = this.state;
    s.time += dt;
    s.playTime += dt;
    for (const id of Object.keys(s.planets)) this.simPlanet(id, dt);

    this.secTimer += dt;
    if (this.secTimer >= 1) {
      this.secTimer -= 1;
      this.secondTick();
    }
    this.questTimer += dt;
    if (this.questTimer >= 0.5) {
      this.questTimer = 0;
      this.checkQuest();
    }
  }

  private secondTick(): void {
    const s = this.state;
    // Recuperação de preços + venda automática (planeta ativo e demais)
    for (const item of SELLABLE_ITEMS) {
      const e = s.market[item];
      if (e) e.mult += (1 - e.mult) * 0.015;
    }
    for (const ps of Object.values(s.planets)) {
      for (const item of SELLABLE_ITEMS) {
        const e = s.market[item];
        if (!e?.auto) continue;
        const excess = Math.floor(invGet(ps.inventory, item) - e.keep);
        if (excess >= 1) this.sell(item, Math.min(excess, 6 + ITEMS[item].tier * 2 + Math.floor(excess * 0.15)), true, ps);
      }
    }

    this.revenueWindow.push(this.revenueThisSec);
    this.revenueThisSec = 0;
    if (this.revenueWindow.length > 15) this.revenueWindow.shift();
    this.revenueRate = this.revenueWindow.reduce((a, b) => a + b, 0) / this.revenueWindow.length;

    this.historyTimer++;
    if (this.historyTimer >= 4) {
      this.historyTimer = 0;
      for (const item of SELLABLE_ITEMS) {
        const h = (this.priceHistory[item] ??= []);
        h.push(this.price(item));
        if (h.length > 48) h.shift();
      }
    }
  }

  private simPlanet(planetId: string, dt: number): void {
    const ps = this.state.planets[planetId];
    const rt = this.runtimes.get(planetId)!;
    const world = rt.world;
    const mods = this.mods;

    // ── Energia ──
    let gen = 0;
    rt.genOut.clear();
    const sun = sunDirection(this.state.time, sunTmp);
    const fuelGens: BuildingState[] = [];
    for (const b of ps.buildings) {
      const def = BUILDINGS[b.type];
      if (!def.powerGen) continue;
      const lv = LEVELS[b.level - 1];
      let out = 0;
      if (!b.enabled) {
        b.status = "paused";
      } else if (def.fuel) {
        if (b.fuelTime <= 0) {
          for (const [fuel, burn] of Object.entries(def.fuel) as [ItemId, number][]) {
            if (invGet(b.input, fuel) >= 1) {
              invAdd(b.input, fuel, -1);
              b.fuelTime = burn;
              break;
            }
          }
        }
        if (b.fuelTime > 0) {
          out = def.powerGen * lv.speed;
          fuelGens.push(b);
        } else {
          b.status = rt.links.get(b.id)?.kind === "none" ? "noConnection" : "noFuel";
        }
      } else if (b.type === "windTurbine") {
        const level = Math.max(0, world.tiles[b.tile].level);
        out = (def.powerGen + 2.5 * level) * lv.speed * (0.85 + 0.15 * Math.sin(this.state.time * 0.13 + b.tile));
        b.status = "working";
      } else if (b.type === "solarPanel") {
        const d = world.hex.centers[b.tile].dot(sun);
        out = def.powerGen * lv.speed * (0.08 + 0.92 * Math.max(0, d));
        b.status = out > def.powerGen * 0.2 ? "working" : "idle";
      } else {
        out = def.powerGen * lv.speed;
        b.status = b.type === "hq" ? "idle" : "working";
      }
      if (out > 0) rt.genOut.set(b.id, out);
      gen += out;
    }
    let demand = 0;
    for (const id of rt.wantsPower) {
      const b = rt.byId.get(id);
      if (b) demand += BUILDINGS[b.type].power * LEVELS[b.level - 1].power;
    }
    const ratio = demand <= 0 ? 1 : Math.min(1, gen / demand);
    const util = gen <= 0 ? 0 : Math.min(1, demand / gen);
    for (const b of fuelGens) {
      b.fuelTime -= dt * Math.max(util, 0.04);
      b.status = util > 0.02 ? "working" : "idle";
    }
    rt.power.gen = gen;
    rt.power.demand = demand;
    rt.power.ratio = ratio;
    rt.wantsPower.clear();

    // ── Edifícios ──
    for (const b of ps.buildings) {
      const def = BUILDINGS[b.type];
      if (b.type === "road" || def.hub || def.powerGen) {
        if (def.hub && b.type === "droneHub") rt.wantsPower.add(b.id);
        continue;
      }
      if (!b.enabled) {
        b.status = "paused";
        continue;
      }
      const lv = LEVELS[b.level - 1];
      const pf = def.power > 0 ? ratio : 1;
      const link = rt.links.get(b.id);
      const linked = !!link && link.kind !== "none";
      const outTotal = invTotal(b.output);

      if (def.extractor) {
        const kind = world.tiles[b.tile].deposit;
        if (!kind || ps.deposit[b.tile] <= 0) {
          b.status = "noDeposit";
          continue;
        }
        if (outTotal >= this.outputCap(b)) {
          b.status = linked ? "outputFull" : "noConnection";
          continue;
        }
        rt.wantsPower.add(b.id);
        b.progress += (dt * lv.speed * mods.minerSpeed * pf) / def.extractor.time;
        b.status = pf < 0.5 ? "noPower" : "working";
        while (b.progress >= 1) {
          b.progress -= 1;
          invAdd(b.output, kind, 1);
          ps.deposit[b.tile] -= 1;
          if (ps.deposit[b.tile] <= 0) {
            ps.deposit[b.tile] = 0;
            b.progress = 0;
            this.envVersion++;
            if (planetId === this.state.activePlanet)
              this.events.emit("toast", { title: "Depósito esgotado", body: "Uma mineradora ficou sem minério.", kind: "warning" });
            break;
          }
        }
        continue;
      }

      if (def.harvester) {
        if (outTotal >= this.outputCap(b)) {
          b.status = linked ? "outputFull" : "noConnection";
          continue;
        }
        let target = -1;
        let most = 0;
        for (const { tile } of this.radius(rt, b.tile, def.harvester.radius)) {
          if (tile === b.tile || rt.tileBuilding[tile] >= 0) continue;
          if (ps.trees[tile] > most) {
            most = ps.trees[tile];
            target = tile;
          }
        }
        if (target < 0) {
          b.status = "noTrees";
          b.progress = 0;
          continue;
        }
        b.status = "working";
        b.progress += (dt * lv.speed * mods.harvestSpeed) / def.harvester.time;
        if (b.progress >= 1) {
          b.progress = 0;
          ps.trees[target] -= 1;
          invAdd(b.output, "wood", def.harvester.yield);
          this.envVersion++;
        }
        continue;
      }

      if (b.type === "nursery") {
        rt.wantsPower.add(b.id);
        b.status = pf < 0.5 ? "noPower" : "working";
        b.progress += dt * 0.25 * lv.speed * pf;
        if (b.progress >= 1) {
          b.progress = 0;
          const area = this.radius(rt, b.tile, def.radius!);
          for (let attempt = 0; attempt < 6; attempt++) {
            const { tile } = area[Math.floor(Math.random() * area.length)];
            const t = world.tiles[tile];
            if (rt.tileBuilding[tile] >= 0 || t.level < 0 || (t.deposit && ps.deposit[tile] > 0) || t.biome === "beach") continue;
            if (ps.trees[tile] >= 3) continue;
            ps.trees[tile]++;
            this.envVersion++;
            break;
          }
        }
        continue;
      }

      if (b.type === "purifier") {
        rt.wantsPower.add(b.id);
        b.status = pf < 0.5 ? "noPower" : "working";
        continue;
      }

      if (def.recipes) {
        if (!b.recipe) {
          b.status = "noRecipe";
          continue;
        }
        const r = RECIPES[b.recipe];
        if (b.type === "rocketPad" && b.rocketReady) {
          b.status = "ready";
          continue;
        }
        if (b.progress <= 0) {
          if (!invHas(b.input, r.inputs)) {
            b.status = linked ? "noInput" : "noConnection";
            continue;
          }
          if (outTotal + invTotal(r.outputs) > this.outputCap(b) * (r.outputs.research ? 10 : 1)) {
            b.status = linked ? "outputFull" : "noConnection";
            continue;
          }
          invSub(b.input, r.inputs);
          b.progress = 1e-4;
        }
        rt.wantsPower.add(b.id);
        b.status = pf < 0.5 ? "noPower" : "working";
        b.progress += (dt * lv.speed * pf) / r.time;
        if (b.progress >= 1) {
          b.progress = 0;
          if (b.type === "rocketPad") {
            b.rocketReady = true;
            b.status = "ready";
            if (planetId === this.state.activePlanet) {
              this.events.emit("toast", { title: "Foguete pronto!", body: "Abra a plataforma e aperte Lançar.", kind: "success" });
              this.events.emit("sfx", { name: "quest" });
            }
          } else invAddAll(b.output, r.outputs);
        }
      }
    }

    // ── Logística ──
    this.logistics(ps, rt, dt);

    // ── Poluição e meio ambiente (1×/s) ──
    rt.slowTimer += dt;
    if (rt.slowTimer >= 1) {
      rt.slowTimer -= 1;
      this.environment(ps, rt, 1);
    }
  }

  inputNeeds(b: BuildingState, full = false, ps: PlanetState = this.planet): Inventory {
    const def = BUILDINGS[b.type];
    const needs: Inventory = {};
    if (def.recipes && b.recipe) {
      if (b.type === "rocketPad" && b.rocketReady) return needs;
      const r = RECIPES[b.recipe];
      const mult = b.type === "rocketPad" ? 1 : 3;
      for (const [it, q] of invEntries(r.inputs)) {
        const want = q * mult;
        const have = invGet(b.input, it);
        if (full ? have < want : have < want * 0.67 || (b.type === "rocketPad" && have < want)) needs[it] = want - have;
      }
    }
    if (def.fuel) {
      let total = 0;
      for (const f of Object.keys(def.fuel) as ItemId[]) total += invGet(b.input, f);
      if (total < (full ? 6 : 3)) {
        const inv = ps.inventory;
        const fuels = Object.keys(def.fuel) as ItemId[];
        fuels.sort((a, c) => invGet(inv, c) - invGet(inv, a));
        needs[fuels[0]] = 6 - total;
      }
    }
    return needs;
  }

  private pathFor(rt: PlanetRuntime, b: BuildingState, link: Link): { path: number[]; length: number } {
    if (link.kind === "drone") return { path: [b.tile, link.hubTile], length: Math.max(1, link.dist) };
    const hex = rt.world.hex;
    const path = [b.tile, link.next];
    let cur = link.next;
    for (let guard = 0; guard < 500 && rt.roadDist[cur] > 0; guard++) {
      const d = rt.roadDist[cur];
      let nxt = -1;
      for (const nb of hex.neighbors[cur]) if (rt.roadDist[nb] === d - 1) { nxt = nb; break; }
      if (nxt < 0) break;
      path.push(nxt);
      cur = nxt;
    }
    return { path, length: path.length - 1 };
  }

  private deliver(ps: PlanetState, item: ItemId, qty: number, tile: number, auto: boolean): void {
    if (item === "research") this.state.rp += qty;
    else invAdd(ps.inventory, item, qty);
    invAdd(this.state.counters.produced, item, qty);
    if (auto && ps.id === this.state.activePlanet && Math.random() < 0.5)
      this.events.emit("popup", { planet: ps.id, tile, text: `+${qty} ${ITEMS[item].name}`, color: ITEMS[item].accent });
  }

  private logistics(ps: PlanetState, rt: PlanetRuntime, dt: number): void {
    const inv = ps.inventory;
    const cap = rt.storageCap;
    for (const b of ps.buildings) {
      const link = rt.links.get(b.id);
      if (!link || link.kind === "none") continue;
      const truckCap = this.truckCapacity(b);
      // Saída → hub
      if (!b.outTruck) {
        const total = invTotal(b.output);
        if (total >= 1) {
          b.outTimer += dt;
          if (total >= truckCap || b.outTimer >= 2.5) {
            const cargo: Inventory = {};
            let space = truckCap;
            for (const [it, q] of invEntries(b.output)) {
              const room = ITEMS[it].uncapped ? Infinity : Math.max(0, cap - invGet(inv, it));
              const take = Math.min(Math.floor(q), space, Math.floor(room));
              if (take > 0) {
                cargo[it] = take;
                space -= take;
                invAdd(b.output, it, -take);
              }
              if (space <= 0) break;
            }
            if (invTotal(cargo) > 0) {
              const { path, length } = this.pathFor(rt, b, link);
              const truck: Truck = { id: this.state.nextId++, path, t: 0, length, cargo, kind: "out", building: b.id, drone: link.kind === "drone" };
              ps.trucks.push(truck);
              b.outTruck = truck.id;
              b.outTimer = 0;
            } else if (b.status === "outputFull") b.status = "storageFull";
          }
        }
      }
      // Entrada ← hub
      if (!b.inTruck) {
        const needs = this.inputNeeds(b, false, ps);
        const cargo: Inventory = {};
        let space = truckCap;
        for (const [it, q] of invEntries(needs)) {
          const take = Math.min(Math.ceil(q), Math.floor(invGet(inv, it)), space);
          if (take > 0) {
            cargo[it] = take;
            space -= take;
            invAdd(inv, it, -take);
          }
          if (space <= 0) break;
        }
        if (invTotal(cargo) > 0) {
          const { path, length } = this.pathFor(rt, b, link);
          path.reverse();
          const truck: Truck = { id: this.state.nextId++, path, t: 0, length, cargo, kind: "in", building: b.id, drone: link.kind === "drone" };
          ps.trucks.push(truck);
          b.inTruck = truck.id;
        }
      }
    }
    // Movimento
    const speed = TRUCK_SPEED * this.mods.truckSpeed;
    const arrived: Truck[] = [];
    for (const tr of ps.trucks) {
      tr.t += dt * (tr.drone ? DRONE_SPEED * Math.sqrt(this.mods.truckSpeed) : speed);
      if (tr.t >= tr.length) arrived.push(tr);
    }
    if (arrived.length) {
      ps.trucks = ps.trucks.filter((t) => t.t < t.length);
      for (const tr of arrived) {
        const b = rt.byId.get(tr.building);
        if (tr.kind === "out") {
          const hubTile = tr.path[tr.path.length - 1];
          for (const [it, q] of invEntries(tr.cargo)) this.deliver(ps, it, q, hubTile, true);
          if (b && b.outTruck === tr.id) b.outTruck = 0;
        } else if (b && b.inTruck === tr.id) {
          invAddAll(b.input, tr.cargo);
          b.inTruck = 0;
        } else {
          invAddAll(inv, tr.cargo);
        }
      }
    }
  }

  private environment(ps: PlanetState, rt: PlanetRuntime, dt: number): void {
    const world = rt.world;
    const hex = world.hex;
    const n = hex.count;
    const p = ps.pollution;
    const mods = this.mods;
    for (const b of ps.buildings) {
      const def = BUILDINGS[b.type];
      if (def.pollution > 0 && b.status === "working") p[b.tile] += def.pollution * 2.5 * mods.pollution * LEVELS[b.level - 1].power * dt;
    }
    const next = rt.pBuf;
    const K = 0.22;
    for (let i = 0; i < n; i++) {
      const nbs = hex.neighbors[i];
      let s = 0;
      for (const nb of nbs) s += p[nb];
      next[i] = p[i] + K * (s / nbs.length - p[i]);
    }
    let total = 0;
    let changed = false;
    for (let i = 0; i < n; i++) {
      const absorb = 0.003 + ps.trees[i] * 0.02 + (world.tiles[i].level < 0 ? 0.01 : 0);
      let v = Math.max(0, Math.min(100, next[i] - absorb * dt));
      if (v < 0.001) v = 0;
      p[i] = v;
      total += v;
      // Árvores morrem em ar muito poluído e voltam quando o ar está limpo.
      if (ps.trees[i] > 0 && v > 45 && Math.random() < (v - 45) / 400) {
        ps.trees[i]--;
        changed = true;
      } else if (
        v < 20 &&
        ps.trees[i] < world.tiles[i].treeCap &&
        rt.tileBuilding[i] < 0 &&
        Math.random() < 0.02
      ) {
        ps.trees[i]++;
        changed = true;
      }
    }
    for (const b of ps.buildings) {
      if ((b.type === "purifier" || b.type === "nursery") && b.status === "working") {
        const def = BUILDINGS[b.type];
        const f = b.type === "purifier" ? 0.1 * LEVELS[b.level - 1].speed : 0.035 * LEVELS[b.level - 1].speed;
        for (const { tile } of this.radius(rt, b.tile, def.radius!)) p[tile] *= 1 - f;
      }
    }
    rt.pollutionIndex = Math.min(1, total / n / 10);
    // Multa ambiental quando a poluição passa de 60%.
    rt.fine = rt.pollutionIndex > 0.6 ? (rt.pollutionIndex - 0.6) * 30 : 0;
    if (rt.fine > 0) this.state.money = Math.max(0, this.state.money - rt.fine * dt);
    if (ps.id === this.state.activePlanet && changed) this.envVersion++;
  }

  // ───────────────────────────── save ─────────────────────────────
  serialize(): string {
    const s = this.state;
    const planets: Record<string, PlanetState> = {};
    for (const [id, ps] of Object.entries(s.planets)) {
      planets[id] = { ...ps, pollution: ps.pollution.map((v) => Math.round(v * 10) / 10) };
    }
    return JSON.stringify({ ...s, planets });
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, this.serialize());
    } catch {
      /* armazenamento indisponível */
    }
  }

  static loadState(): GameState | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as GameState;
      if (s.version !== 1 || !s.planets) return null;
      return s;
    } catch {
      return null;
    }
  }

  static hasSave(): boolean {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  static clearSave(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function civTitle(level: number): string {
  return CIV_TITLES[Math.min(CIV_TITLES.length - 1, Math.floor((level - 1) / 2))];
}

export function fmtMoney(v: number): string {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2).replace(".", ",") + " mi";
  if (Math.abs(v) >= 1e4) return Math.round(v).toLocaleString("pt-BR");
  if (Math.abs(v) >= 100) return Math.round(v).toLocaleString("pt-BR");
  return (Math.round(v * 10) / 10).toLocaleString("pt-BR");
}
