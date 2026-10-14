import type { Inventory } from "./items";
import type { BuildingTypeId } from "./buildings";
import type { RecipeId } from "./recipes";

export interface Modifiers {
  truckSpeed: number;
  minerSpeed: number;
  pollution: number;
  sellBonus: number;
  maxLevel: number;
  storage: number;
  harvestSpeed: number;
}

export const BASE_MODIFIERS: Modifiers = {
  truckSpeed: 1,
  minerSpeed: 1,
  pollution: 1,
  sellBonus: 0,
  maxLevel: 2,
  storage: 0,
  harvestSpeed: 1,
};

export interface TechDef {
  id: string;
  name: string;
  description: string;
  tier: number;
  /** Posição na grade da árvore (coluna = tier, linha). */
  row: number;
  cost: { money: number; research: number; items?: Inventory };
  requires: string[];
  unlocks: { buildings?: BuildingTypeId[]; recipes?: RecipeId[] };
  apply?: (m: Modifiers) => void;
}

export const TECHS: TechDef[] = [
  // Tier 1 — dinheiro e materiais
  {
    id: "automation",
    name: "Automação",
    description: "Montadoras produzem engrenagens e fios automaticamente.",
    tier: 1,
    row: 0,
    cost: { money: 400, research: 0, items: { ironPlate: 20 } },
    requires: [],
    unlocks: { buildings: ["assembler"], recipes: ["asm_gear", "asm_wire"] },
  },
  {
    id: "logistics",
    name: "Logística",
    description: "Armazéns como novos pontos de entrega e caminhões 50% mais rápidos.",
    tier: 1,
    row: 1,
    cost: { money: 350, research: 0, items: { brick: 20 } },
    requires: [],
    unlocks: { buildings: ["warehouse"] },
    apply: (m) => {
      m.truckSpeed *= 1.5;
    },
  },
  {
    id: "commerce",
    name: "Comércio",
    description: "Rotas comerciais melhores: +15% no preço de venda.",
    tier: 1,
    row: 2,
    cost: { money: 500, research: 0, items: { planks: 30 } },
    requires: [],
    unlocks: {},
    apply: (m) => {
      m.sellBonus += 0.15;
    },
  },
  {
    id: "science",
    name: "Método Científico",
    description: "Laboratórios geram Pontos de Pesquisa.",
    tier: 1,
    row: 3,
    cost: { money: 600, research: 0, items: { copperPlate: 20, gear: 10 } },
    requires: ["automation"],
    unlocks: { buildings: ["lab"], recipes: ["lab_basic"] },
  },
  // Tier 2 — pesquisa
  {
    id: "combustion",
    name: "Combustão",
    description: "Usinas a carvão: muita energia, muita fumaça.",
    tier: 2,
    row: 0,
    cost: { money: 800, research: 60 },
    requires: ["science"],
    unlocks: { buildings: ["coalGen"] },
  },
  {
    id: "electronics",
    name: "Eletrônica",
    description: "Montadoras passam a produzir circuitos.",
    tier: 2,
    row: 1,
    cost: { money: 1000, research: 80 },
    requires: ["science"],
    unlocks: { recipes: ["asm_circuit"] },
  },
  {
    id: "metallurgy",
    name: "Siderurgia",
    description: "Fundições produzem aço (e titânio em planetas que o possuem).",
    tier: 2,
    row: 2,
    cost: { money: 1200, research: 100 },
    requires: ["science"],
    unlocks: { recipes: ["smelt_steel", "smelt_titanium"] },
  },
  {
    id: "wind",
    name: "Energia Eólica",
    description: "Turbinas eólicas — rendem mais no alto das montanhas.",
    tier: 2,
    row: 3,
    cost: { money: 900, research: 80 },
    requires: ["science"],
    unlocks: { buildings: ["windTurbine"] },
  },
  {
    id: "reforestation",
    name: "Reflorestamento",
    description: "Viveiros plantam árvores e limpam o ar.",
    tier: 2,
    row: 4,
    cost: { money: 700, research: 60 },
    requires: ["science"],
    unlocks: { buildings: ["nursery"] },
    apply: (m) => {
      m.harvestSpeed *= 1.25;
    },
  },
  {
    id: "asphalt",
    name: "Asfalto",
    description: "Estradas pavimentadas: caminhões 60% mais rápidos.",
    tier: 2,
    row: 5,
    cost: { money: 800, research: 70 },
    requires: ["logistics", "science"],
    unlocks: {},
    apply: (m) => {
      m.truckSpeed *= 1.6;
    },
  },
  // Tier 3
  {
    id: "deepMining",
    name: "Mineração Profunda",
    description: "Mineradoras 50% mais rápidas.",
    tier: 3,
    row: 0,
    cost: { money: 1500, research: 140 },
    requires: ["metallurgy"],
    unlocks: {},
    apply: (m) => {
      m.minerSpeed *= 1.5;
    },
  },
  {
    id: "photovoltaic",
    name: "Fotovoltaica",
    description: "Painéis solares: energia limpa durante o dia.",
    tier: 3,
    row: 1,
    cost: { money: 2500, research: 220 },
    requires: ["electronics"],
    unlocks: { buildings: ["solarPanel"] },
  },
  {
    id: "mechanics",
    name: "Mecânica",
    description: "Fábricas avançadas produzem motores.",
    tier: 3,
    row: 2,
    cost: { money: 3000, research: 250 },
    requires: ["metallurgy", "electronics"],
    unlocks: { buildings: ["factory"], recipes: ["fab_motor"] },
  },
  {
    id: "advResearch",
    name: "Pesquisa Avançada",
    description: "Laboratórios usam circuitos e aço para gerar muito mais pesquisa.",
    tier: 3,
    row: 3,
    cost: { money: 2500, research: 200 },
    requires: ["electronics", "metallurgy"],
    unlocks: { recipes: ["lab_advanced"] },
  },
  {
    id: "filters",
    name: "Filtros Industriais",
    description: "Todas as emissões de poluição caem 40%.",
    tier: 3,
    row: 4,
    cost: { money: 2000, research: 200 },
    requires: ["electronics", "reforestation"],
    unlocks: {},
    apply: (m) => {
      m.pollution *= 0.6;
    },
  },
  {
    id: "aerial",
    name: "Logística Aérea",
    description: "Centrais de drones dispensam estradas.",
    tier: 3,
    row: 5,
    cost: { money: 4000, research: 300 },
    requires: ["asphalt", "electronics"],
    unlocks: { buildings: ["droneHub"] },
  },
  // Tier 4
  {
    id: "optimization",
    name: "Otimização",
    description: "Edifícios podem ser melhorados até o nível 3.",
    tier: 4,
    row: 0,
    cost: { money: 5000, research: 400 },
    requires: ["mechanics"],
    unlocks: {},
    apply: (m) => {
      m.maxLevel = 3;
    },
  },
  {
    id: "computing",
    name: "Computação",
    description: "Fábricas produzem computadores; laboratórios fazem pesquisa quântica.",
    tier: 4,
    row: 1,
    cost: { money: 8000, research: 600 },
    requires: ["mechanics", "advResearch"],
    unlocks: { recipes: ["fab_computer", "lab_elite"] },
  },
  {
    id: "ecology",
    name: "Ecologia",
    description: "Purificadores de ar de alta capacidade.",
    tier: 4,
    row: 3,
    cost: { money: 3000, research: 260 },
    requires: ["filters"],
    unlocks: { buildings: ["purifier"] },
  },
  {
    id: "megastorage",
    name: "Megaarmazenagem",
    description: "+400 de capacidade por item na Sede.",
    tier: 4,
    row: 4,
    cost: { money: 6000, research: 350 },
    requires: ["aerial"],
    unlocks: {},
    apply: (m) => {
      m.storage += 400;
    },
  },
  // Tier 5
  {
    id: "fusion",
    name: "Fusão Nuclear",
    description: "Reatores de fusão: 300 MW limpos.",
    tier: 5,
    row: 1,
    cost: { money: 20000, research: 1200 },
    requires: ["computing", "photovoltaic"],
    unlocks: { buildings: ["fusion"] },
  },
  {
    id: "spaceflight",
    name: "Engenharia Espacial",
    description: "Plataformas de lançamento — descubra novos planetas!",
    tier: 5,
    row: 2,
    cost: { money: 25000, research: 1500 },
    requires: ["computing"],
    unlocks: { buildings: ["rocketPad"], recipes: ["rocket_build"] },
  },
];

export const TECH_MAP: Record<string, TechDef> = Object.fromEntries(TECHS.map((t) => [t.id, t]));

export function computeModifiers(researched: string[]): Modifiers {
  const m: Modifiers = { ...BASE_MODIFIERS };
  for (const id of researched) TECH_MAP[id]?.apply?.(m);
  return m;
}
