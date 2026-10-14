import type { DepositKind } from "./items";

export type Biome = "deep" | "ocean" | "beach" | "grass" | "forest" | "dry" | "rock" | "snow";

export interface PlanetDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  seed: number;
  /** Frequência da subdivisão geodésica (tiles = 10f² + 2). */
  frequency: number;
  radius: number;
  /** Proporção de oceano (0–1). */
  ocean: number;
  /** Amplitude do relevo. */
  roughness: number;
  /** Tendência de temperatura (−1 frio … +1 quente). */
  warmth: number;
  /** Umidade base (florestas). */
  moisture: number;
  regions: number;
  palette: Record<Biome, string>;
  water: string;
  atmosphere: string;
  /** Céu ao fundo. */
  space: [string, string];
  deposits: Partial<Record<DepositKind, number>>;
  /** Item exótico que torna o planeta especial. */
  special?: DepositKind;
  startMoney: number;
}

export const PLANETS: PlanetDef[] = [
  {
    id: "verdalia",
    name: "Verdália",
    subtitle: "Planeta temperado",
    description: "Florestas, mares rasos e depósitos equilibrados. O lugar perfeito para começar.",
    seed: 1337,
    frequency: 10,
    radius: 16,
    ocean: 0.34,
    roughness: 1,
    warmth: 0.15,
    moisture: 0.55,
    regions: 22,
    palette: {
      deep: "#1d4e89",
      ocean: "#2f77b5",
      beach: "#f2d98d",
      grass: "#7bc950",
      forest: "#4f9d3a",
      dry: "#c9b458",
      rock: "#8d8f99",
      snow: "#f4f7fb",
    },
    water: "#3fa7e6",
    atmosphere: "#7cc8ff",
    space: ["#0b1030", "#1a1145"],
    deposits: { stone: 1, ironOre: 1, copperOre: 0.9, coal: 0.8 },
    startMoney: 500,
  },
  {
    id: "ferrus",
    name: "Ferrus",
    subtitle: "Deserto vermelho",
    description: "Seco e escaldante, mas repleto de ferro e de titânio — um metal valioso.",
    seed: 4242,
    frequency: 11,
    radius: 17.5,
    ocean: 0.12,
    roughness: 1.35,
    warmth: 0.8,
    moisture: 0.2,
    regions: 26,
    palette: {
      deep: "#5a2a3a",
      ocean: "#8a3e45",
      beach: "#e8b07a",
      grass: "#d9894e",
      forest: "#9c6b3a",
      dry: "#c8643b",
      rock: "#7a4b3f",
      snow: "#f3d9c2",
    },
    water: "#d06a4f",
    atmosphere: "#ffb27a",
    space: ["#1a0b14", "#2b1020"],
    deposits: { stone: 1, ironOre: 1.6, copperOre: 0.6, coal: 0.6, titaniumOre: 1 },
    special: "titaniumOre",
    startMoney: 4000,
  },
  {
    id: "glacies",
    name: "Glacies",
    subtitle: "Mundo de gelo",
    description: "Oceanos congelados e cavernas de cristal glacial, o item mais caro da galáxia.",
    seed: 9001,
    frequency: 12,
    radius: 19,
    ocean: 0.3,
    roughness: 1.15,
    warmth: -0.8,
    moisture: 0.45,
    regions: 30,
    palette: {
      deep: "#1b3a5c",
      ocean: "#3c6e99",
      beach: "#d7e6f2",
      grass: "#b7d6e8",
      forest: "#6fa3a0",
      dry: "#9fb7c9",
      rock: "#6b7d92",
      snow: "#ffffff",
    },
    water: "#9ad7ff",
    atmosphere: "#c9f0ff",
    space: ["#050d1c", "#0c1a33"],
    deposits: { stone: 0.9, ironOre: 0.8, copperOre: 0.8, coal: 1.2, crystal: 1 },
    special: "crystal",
    startMoney: 8000,
  },
];

export const PLANET_MAP: Record<string, PlanetDef> = Object.fromEntries(PLANETS.map((p) => [p.id, p]));

/** Altura de cada degrau do terreno. */
export const HEIGHT_STEP = 0.32;
export const MIN_LEVEL = -3;
export const MAX_LEVEL = 5;
