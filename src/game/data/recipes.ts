import type { Inventory } from "./items";

export type RecipeId =
  | "smelt_iron"
  | "smelt_copper"
  | "smelt_brick"
  | "smelt_steel"
  | "smelt_titanium"
  | "saw_planks"
  | "asm_gear"
  | "asm_wire"
  | "asm_circuit"
  | "fab_motor"
  | "fab_computer"
  | "lab_basic"
  | "lab_advanced"
  | "lab_elite"
  | "rocket_build";

export interface RecipeDef {
  id: RecipeId;
  name: string;
  inputs: Inventory;
  outputs: Inventory;
  /** Segundos por ciclo no nível 1 com energia total. */
  time: number;
  /** Tecnologia necessária (ausente = disponível desde o início). */
  tech?: string;
}

export const RECIPES: Record<RecipeId, RecipeDef> = {
  smelt_iron: { id: "smelt_iron", name: "Placa de Ferro", inputs: { ironOre: 2 }, outputs: { ironPlate: 1 }, time: 3.2 },
  smelt_copper: { id: "smelt_copper", name: "Placa de Cobre", inputs: { copperOre: 2 }, outputs: { copperPlate: 1 }, time: 3.2 },
  smelt_brick: { id: "smelt_brick", name: "Tijolo", inputs: { stone: 2 }, outputs: { brick: 1 }, time: 3 },
  smelt_steel: { id: "smelt_steel", name: "Aço", inputs: { ironPlate: 3, coal: 1 }, outputs: { steel: 1 }, time: 7, tech: "metallurgy" },
  smelt_titanium: { id: "smelt_titanium", name: "Placa de Titânio", inputs: { titaniumOre: 3, coal: 1 }, outputs: { titaniumPlate: 1 }, time: 6, tech: "metallurgy" },
  saw_planks: { id: "saw_planks", name: "Tábuas", inputs: { wood: 1 }, outputs: { planks: 2 }, time: 2.2 },
  asm_gear: { id: "asm_gear", name: "Engrenagem", inputs: { ironPlate: 2 }, outputs: { gear: 1 }, time: 3, tech: "automation" },
  asm_wire: { id: "asm_wire", name: "Fio de Cobre", inputs: { copperPlate: 1 }, outputs: { wire: 2 }, time: 2, tech: "automation" },
  asm_circuit: { id: "asm_circuit", name: "Circuito", inputs: { ironPlate: 1, wire: 3 }, outputs: { circuit: 1 }, time: 5, tech: "electronics" },
  fab_motor: { id: "fab_motor", name: "Motor", inputs: { gear: 2, steel: 1, wire: 2 }, outputs: { motor: 1 }, time: 9, tech: "mechanics" },
  fab_computer: { id: "fab_computer", name: "Computador", inputs: { circuit: 4, copperPlate: 2, steel: 1 }, outputs: { computer: 1 }, time: 15, tech: "computing" },
  lab_basic: { id: "lab_basic", name: "Pesquisa Básica", inputs: { copperPlate: 1, gear: 1 }, outputs: { research: 8 }, time: 6, tech: "science" },
  lab_advanced: { id: "lab_advanced", name: "Pesquisa Avançada", inputs: { circuit: 1, steel: 1 }, outputs: { research: 30 }, time: 8, tech: "advResearch" },
  lab_elite: { id: "lab_elite", name: "Pesquisa Quântica", inputs: { computer: 1 }, outputs: { research: 160 }, time: 12, tech: "computing" },
  rocket_build: {
    id: "rocket_build",
    name: "Montar Foguete",
    inputs: { circuit: 80, motor: 30, computer: 15, steel: 120 },
    outputs: {},
    time: 45,
    tech: "spaceflight",
  },
};
