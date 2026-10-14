import type { DepositKind, Inventory } from "./items";
import type { RecipeId } from "./recipes";

export type BuildingTypeId =
  | "hq"
  | "road"
  | "warehouse"
  | "droneHub"
  | "woodcutter"
  | "miner"
  | "sawmill"
  | "smelter"
  | "assembler"
  | "factory"
  | "lab"
  | "biomassGen"
  | "coalGen"
  | "windTurbine"
  | "solarPanel"
  | "fusion"
  | "nursery"
  | "purifier"
  | "rocketPad";

export type BuildingCategory = "logistics" | "extraction" | "production" | "power" | "environment" | "special";

export const CATEGORY_INFO: Record<BuildingCategory, { name: string; color: string }> = {
  logistics: { name: "Logística", color: "#64748b" },
  extraction: { name: "Extração", color: "#b7791f" },
  production: { name: "Produção", color: "#3b82f6" },
  power: { name: "Energia", color: "#eab308" },
  environment: { name: "Ambiente", color: "#22c55e" },
  special: { name: "Especial", color: "#a855f7" },
};

export interface BuildingCost {
  money: number;
  items: Inventory;
}

export interface BuildingDef {
  id: BuildingTypeId;
  name: string;
  description: string;
  category: BuildingCategory;
  cost: BuildingCost;
  /** Consumo de energia (MW) quando trabalhando. */
  power: number;
  /** Geração de energia (MW). */
  powerGen?: number;
  /** Combustível aceito e segundos de queima por unidade. */
  fuel?: Partial<Record<"wood" | "planks" | "coal", number>>;
  recipes?: RecipeId[];
  /** Extrai o depósito do tile. */
  extractor?: { kinds: DepositKind[]; time: number };
  /** Corta árvores ao redor. */
  harvester?: { radius: number; time: number; yield: number };
  /** Ponto de entrega da rede logística. */
  hub?: boolean;
  /** Raio de cobertura (drones, viveiro, purificador). */
  radius?: number;
  storageBonus?: number;
  /** Poluição emitida por segundo trabalhando. */
  pollution: number;
  /** Poluição absorvida por segundo no raio. */
  absorbs?: number;
  tech?: string;
  placement: "land" | "deposit" | "any";
  /** Não aparece no menu de construção. */
  hidden?: boolean;
  /** Altura visual aproximada (bloqueio do jogador e UI). */
  height: number;
  hotkey?: string;
}

export const BUILDINGS: Record<BuildingTypeId, BuildingDef> = {
  hq: {
    id: "hq",
    name: "Sede da Colônia",
    description: "Seu módulo de pouso. Armazena recursos, gera um pouco de energia e é o centro da rede de estradas.",
    category: "special",
    cost: { money: 0, items: {} },
    power: 0,
    powerGen: 14,
    hub: true,
    pollution: 0,
    placement: "land",
    hidden: true,
    height: 2.2,
  },
  road: {
    id: "road",
    name: "Estrada",
    description: "Conecta edifícios à Sede ou a um Armazém. Caminhões só circulam por estradas.",
    category: "logistics",
    cost: { money: 5, items: {} },
    power: 0,
    pollution: 0,
    placement: "any",
    height: 0.05,
    hotkey: "1",
  },
  warehouse: {
    id: "warehouse",
    name: "Armazém",
    description: "Novo ponto de entrega da rede (sincronizado com a Sede) e +300 de capacidade por item.",
    category: "logistics",
    cost: { money: 400, items: { planks: 30, brick: 30 } },
    power: 0,
    hub: true,
    storageBonus: 300,
    pollution: 0,
    tech: "logistics",
    placement: "land",
    height: 1.4,
  },
  droneHub: {
    id: "droneHub",
    name: "Central de Drones",
    description: "Drones transportam cargas sem estradas para edifícios num raio de 4 tiles.",
    category: "logistics",
    cost: { money: 3000, items: { circuit: 30, steel: 20, motor: 10 } },
    power: 8,
    hub: true,
    radius: 4,
    pollution: 0,
    tech: "aerial",
    placement: "land",
    height: 1.8,
  },
  woodcutter: {
    id: "woodcutter",
    name: "Lenhador",
    description: "Corta árvores num raio de 2 tiles. Não precisa de energia. As árvores voltam a crescer.",
    category: "extraction",
    cost: { money: 40, items: { wood: 8 } },
    power: 0,
    harvester: { radius: 2, time: 4, yield: 2 },
    pollution: 0,
    placement: "land",
    height: 1.2,
    hotkey: "2",
  },
  miner: {
    id: "miner",
    name: "Mineradora",
    description: "Construa sobre um depósito (pedra, ferro, cobre, carvão...) para extrair automaticamente.",
    category: "extraction",
    cost: { money: 90, items: { wood: 10, stone: 10 } },
    power: 3,
    extractor: { kinds: ["stone", "ironOre", "copperOre", "coal", "titaniumOre", "crystal"], time: 2 },
    pollution: 0.25,
    placement: "deposit",
    height: 1.6,
    hotkey: "3",
  },
  sawmill: {
    id: "sawmill",
    name: "Serraria",
    description: "Transforma madeira em tábuas. Tábuas valem mais e queimam melhor.",
    category: "production",
    cost: { money: 80, items: { wood: 15, stone: 5 } },
    power: 2,
    recipes: ["saw_planks"],
    pollution: 0.1,
    placement: "land",
    height: 1.2,
    hotkey: "4",
  },
  smelter: {
    id: "smelter",
    name: "Fundição",
    description: "Funde minérios em placas e pedra em tijolos. Polui bastante.",
    category: "production",
    cost: { money: 150, items: { stone: 20 } },
    power: 4,
    recipes: ["smelt_iron", "smelt_copper", "smelt_brick", "smelt_steel", "smelt_titanium"],
    pollution: 0.6,
    placement: "land",
    height: 1.6,
    hotkey: "5",
  },
  assembler: {
    id: "assembler",
    name: "Montadora",
    description: "Monta engrenagens, fios e circuitos a partir de placas.",
    category: "production",
    cost: { money: 350, items: { ironPlate: 20, brick: 10 } },
    power: 5,
    recipes: ["asm_gear", "asm_wire", "asm_circuit"],
    pollution: 0.15,
    tech: "automation",
    placement: "land",
    height: 1.4,
  },
  factory: {
    id: "factory",
    name: "Fábrica Avançada",
    description: "Produz motores e computadores — os itens mais valiosos.",
    category: "production",
    cost: { money: 2000, items: { steel: 30, circuit: 20, gear: 20 } },
    power: 12,
    recipes: ["fab_motor", "fab_computer"],
    pollution: 0.4,
    tech: "mechanics",
    placement: "land",
    height: 1.9,
  },
  lab: {
    id: "lab",
    name: "Laboratório",
    description: "Converte itens em Pontos de Pesquisa para desbloquear tecnologias.",
    category: "production",
    cost: { money: 600, items: { ironPlate: 20, copperPlate: 20, brick: 20 } },
    power: 6,
    recipes: ["lab_basic", "lab_advanced", "lab_elite"],
    pollution: 0.05,
    tech: "science",
    placement: "land",
    height: 1.7,
  },
  biomassGen: {
    id: "biomassGen",
    name: "Gerador a Biomassa",
    description: "Queima madeira ou tábuas para gerar 15 MW.",
    category: "power",
    cost: { money: 120, items: { wood: 15, stone: 10 } },
    power: 0,
    powerGen: 15,
    fuel: { wood: 4, planks: 3 },
    pollution: 0.5,
    placement: "land",
    height: 1.4,
    hotkey: "6",
  },
  coalGen: {
    id: "coalGen",
    name: "Usina a Carvão",
    description: "Queima carvão para gerar 40 MW. Muito poluente.",
    category: "power",
    cost: { money: 800, items: { brick: 40, ironPlate: 20 } },
    power: 0,
    powerGen: 40,
    fuel: { coal: 5 },
    pollution: 1.5,
    tech: "combustion",
    placement: "land",
    height: 2.2,
  },
  windTurbine: {
    id: "windTurbine",
    name: "Turbina Eólica",
    description: "Energia limpa. Gera 6 MW + 2,5 MW por nível de altitude do terreno.",
    category: "power",
    cost: { money: 700, items: { ironPlate: 20, gear: 10 } },
    power: 0,
    powerGen: 6,
    pollution: 0,
    tech: "wind",
    placement: "land",
    height: 2.8,
  },
  solarPanel: {
    id: "solarPanel",
    name: "Painel Solar",
    description: "Até 16 MW quando o sol está a pino. Gera pouco à noite.",
    category: "power",
    cost: { money: 1200, items: { circuit: 10, copperPlate: 15 } },
    power: 0,
    powerGen: 16,
    pollution: 0,
    tech: "photovoltaic",
    placement: "land",
    height: 0.8,
  },
  fusion: {
    id: "fusion",
    name: "Reator de Fusão",
    description: "300 MW de energia limpa e estável. O ápice da engenharia.",
    category: "power",
    cost: { money: 25000, items: { computer: 30, steel: 100, motor: 40 } },
    power: 0,
    powerGen: 300,
    pollution: 0,
    tech: "fusion",
    placement: "land",
    height: 2.2,
  },
  nursery: {
    id: "nursery",
    name: "Viveiro",
    description: "Planta árvores num raio de 3 tiles e absorve poluição.",
    category: "environment",
    cost: { money: 300, items: { planks: 40 } },
    power: 1,
    radius: 3,
    absorbs: 0.4,
    pollution: 0,
    tech: "reforestation",
    placement: "land",
    height: 1.1,
  },
  purifier: {
    id: "purifier",
    name: "Purificador de Ar",
    description: "Filtra o ar num raio de 4 tiles, absorvendo muita poluição.",
    category: "environment",
    cost: { money: 1500, items: { circuit: 20, steel: 20 } },
    power: 6,
    radius: 4,
    absorbs: 3,
    pollution: 0,
    tech: "ecology",
    placement: "land",
    height: 2.1,
  },
  rocketPad: {
    id: "rocketPad",
    name: "Plataforma de Lançamento",
    description: "Monte e lance um foguete para descobrir um novo planeta.",
    category: "special",
    cost: { money: 30000, items: { steel: 200, motor: 40, computer: 20 } },
    power: 20,
    recipes: ["rocket_build"],
    pollution: 0.3,
    tech: "spaceflight",
    placement: "land",
    height: 3.5,
  },
};

export const BUILDABLE: BuildingTypeId[] = (Object.keys(BUILDINGS) as BuildingTypeId[]).filter(
  (id) => !BUILDINGS[id].hidden,
);

/** Multiplicadores por nível de melhoria. */
export const LEVELS = [
  { speed: 1, power: 1, costMult: 0 },
  { speed: 1.6, power: 1.4, costMult: 1.5 },
  { speed: 2.4, power: 2, costMult: 3 },
];
