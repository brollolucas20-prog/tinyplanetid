/**
 * Catálogo de itens. Para adicionar um item novo basta registrar aqui
 * (e usá-lo em receitas/depósitos). A UI e o mercado leem esta tabela.
 */
export type ItemId =
  | "wood"
  | "stone"
  | "ironOre"
  | "copperOre"
  | "coal"
  | "titaniumOre"
  | "crystal"
  | "planks"
  | "brick"
  | "ironPlate"
  | "copperPlate"
  | "titaniumPlate"
  | "gear"
  | "wire"
  | "circuit"
  | "steel"
  | "motor"
  | "computer"
  | "research";

/** Forma usada para desenhar o ícone vetorial do item. */
export type ItemShape =
  | "log"
  | "rock"
  | "ore"
  | "crystal"
  | "plank"
  | "brick"
  | "plate"
  | "gear"
  | "coil"
  | "chip"
  | "ingot"
  | "motor"
  | "computer"
  | "flask";

export interface ItemDef {
  id: ItemId;
  name: string;
  shape: ItemShape;
  color: string;
  accent: string;
  basePrice: number;
  sellable: boolean;
  tier: number;
  /** Sem limite de armazenamento (ex.: pontos de pesquisa). */
  uncapped?: boolean;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  wood: { id: "wood", name: "Madeira", shape: "log", color: "#b07a45", accent: "#e3b77a", basePrice: 2, sellable: true, tier: 0 },
  stone: { id: "stone", name: "Pedra", shape: "rock", color: "#9aa3ad", accent: "#d5dbe1", basePrice: 2, sellable: true, tier: 0 },
  ironOre: { id: "ironOre", name: "Minério de Ferro", shape: "ore", color: "#a86b55", accent: "#e8b29a", basePrice: 3, sellable: true, tier: 0 },
  copperOre: { id: "copperOre", name: "Minério de Cobre", shape: "ore", color: "#d9824a", accent: "#4fd1b5", basePrice: 3, sellable: true, tier: 0 },
  coal: { id: "coal", name: "Carvão", shape: "ore", color: "#3b3f4a", accent: "#7c8494", basePrice: 3, sellable: true, tier: 0 },
  titaniumOre: { id: "titaniumOre", name: "Minério de Titânio", shape: "ore", color: "#7d8fb3", accent: "#cfe0ff", basePrice: 12, sellable: true, tier: 2 },
  crystal: { id: "crystal", name: "Cristal Glacial", shape: "crystal", color: "#7fe3ff", accent: "#e6fbff", basePrice: 120, sellable: true, tier: 3 },
  planks: { id: "planks", name: "Tábuas", shape: "plank", color: "#d9a066", accent: "#f3cf9b", basePrice: 6, sellable: true, tier: 1 },
  brick: { id: "brick", name: "Tijolo", shape: "brick", color: "#c8553d", accent: "#f08a6c", basePrice: 6, sellable: true, tier: 1 },
  ironPlate: { id: "ironPlate", name: "Placa de Ferro", shape: "plate", color: "#9fb0c3", accent: "#e4ecf5", basePrice: 9, sellable: true, tier: 1 },
  copperPlate: { id: "copperPlate", name: "Placa de Cobre", shape: "plate", color: "#e08a4c", accent: "#ffc89a", basePrice: 9, sellable: true, tier: 1 },
  titaniumPlate: { id: "titaniumPlate", name: "Placa de Titânio", shape: "plate", color: "#8ea6d6", accent: "#e2ecff", basePrice: 48, sellable: true, tier: 2 },
  gear: { id: "gear", name: "Engrenagem", shape: "gear", color: "#8c9bb0", accent: "#d7e0ea", basePrice: 22, sellable: true, tier: 2 },
  wire: { id: "wire", name: "Fio de Cobre", shape: "coil", color: "#e3934f", accent: "#ffd2a6", basePrice: 6, sellable: true, tier: 2 },
  circuit: { id: "circuit", name: "Circuito", shape: "chip", color: "#2fae66", accent: "#ffd166", basePrice: 60, sellable: true, tier: 3 },
  steel: { id: "steel", name: "Aço", shape: "ingot", color: "#6f7d8f", accent: "#c3ccd8", basePrice: 45, sellable: true, tier: 3 },
  motor: { id: "motor", name: "Motor", shape: "motor", color: "#3d6bd8", accent: "#a9c2ff", basePrice: 190, sellable: true, tier: 4 },
  computer: { id: "computer", name: "Computador", shape: "computer", color: "#27324a", accent: "#59e3ff", basePrice: 720, sellable: true, tier: 5 },
  research: { id: "research", name: "Pontos de Pesquisa", shape: "flask", color: "#8b5cf6", accent: "#d9c8ff", basePrice: 0, sellable: false, tier: 0, uncapped: true },
};

export const ITEM_LIST: ItemDef[] = Object.values(ITEMS);
export const SELLABLE_ITEMS: ItemId[] = ITEM_LIST.filter((i) => i.sellable).map((i) => i.id);

export type Inventory = Partial<Record<ItemId, number>>;

/** Tipos de depósito natural encontrados nos tiles. */
export type DepositKind = "stone" | "ironOre" | "copperOre" | "coal" | "titaniumOre" | "crystal";

export const DEPOSIT_COLORS: Record<DepositKind, { rock: string; ore: string }> = {
  stone: { rock: "#a3abb5", ore: "#d0d6dc" },
  ironOre: { rock: "#9a8378", ore: "#d0663f" },
  copperOre: { rock: "#9a8c7c", ore: "#3fd1b0" },
  coal: { rock: "#6f737c", ore: "#26292f" },
  titaniumOre: { rock: "#6e7486", ore: "#b9cdf5" },
  crystal: { rock: "#8fa9c2", ore: "#86ecff" },
};
