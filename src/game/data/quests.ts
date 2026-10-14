import type { ItemId } from "./items";
import type { BuildingTypeId } from "./buildings";

export type QuestGoal =
  | { type: "collect"; item: ItemId; amount: number }
  | { type: "produce"; item: ItemId; amount: number }
  | { type: "have"; building: BuildingTypeId; amount: number }
  | { type: "connect"; amount: number }
  | { type: "sales"; amount: number }
  | { type: "regions"; amount: number }
  | { type: "research"; tech: string }
  | { type: "powerGen"; amount: number }
  | { type: "buildings"; amount: number }
  | { type: "launch"; amount: number };

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  hint: string;
  goal: QuestGoal;
  reward: { money: number; xp: number };
}

export const QUESTS: QuestDef[] = [
  {
    id: "q_wood",
    title: "Primeiros passos",
    description: "Colete 10 de madeira com as próprias mãos.",
    hint: "Caminhe até uma árvore (WASD) e segure E — ou clique nela.",
    goal: { type: "collect", item: "wood", amount: 10 },
    reward: { money: 60, xp: 20 },
  },
  {
    id: "q_stone",
    title: "Pedra sobre pedra",
    description: "Colete 10 pedras de rochas cinzentas.",
    hint: "Rochas cinzas são depósitos de pedra. Segure E perto delas.",
    goal: { type: "collect", item: "stone", amount: 10 },
    reward: { money: 60, xp: 20 },
  },
  {
    id: "q_woodcutter",
    title: "Trabalho automático",
    description: "Construa um Lenhador perto de uma floresta.",
    hint: "Abra o menu Extração (barra inferior) e escolha o Lenhador.",
    goal: { type: "have", building: "woodcutter", amount: 1 },
    reward: { money: 80, xp: 30 },
  },
  {
    id: "q_connect",
    title: "Todos os caminhos",
    description: "Conecte um edifício à Sede usando estradas.",
    hint: "Estradas (tecla 1) ligam edifícios à Sede. Arraste para construir várias.",
    goal: { type: "connect", amount: 1 },
    reward: { money: 120, xp: 40 },
  },
  {
    id: "q_miner",
    title: "Riquezas do subsolo",
    description: "Construa 2 Mineradoras sobre depósitos.",
    hint: "Ferro é avermelhado, cobre tem veios verde-água e carvão é preto.",
    goal: { type: "have", building: "miner", amount: 2 },
    reward: { money: 150, xp: 50 },
  },
  {
    id: "q_power",
    title: "Faça-se a luz",
    description: "Construa um Gerador a Biomassa.",
    hint: "Ele queima madeira entregue pelos caminhões. Conecte-o à rede!",
    goal: { type: "have", building: "biomassGen", amount: 1 },
    reward: { money: 150, xp: 50 },
  },
  {
    id: "q_plates",
    title: "Metalurgia básica",
    description: "Produza 20 Placas de Ferro numa Fundição.",
    hint: "Fundição conectada + Mineradora de ferro conectada = placas.",
    goal: { type: "produce", item: "ironPlate", amount: 20 },
    reward: { money: 250, xp: 80 },
  },
  {
    id: "q_sales",
    title: "Primeiras vendas",
    description: "Fature $500 vendendo no Mercado.",
    hint: "Abra o Mercado (tecla M). Ative a venda automática para itens excedentes.",
    goal: { type: "sales", amount: 500 },
    reward: { money: 200, xp: 80 },
  },
  {
    id: "q_region",
    title: "Além da fronteira",
    description: "Compre uma nova região do planeta.",
    hint: "Clique numa área escura vizinha ao seu território.",
    goal: { type: "regions", amount: 2 },
    reward: { money: 300, xp: 100 },
  },
  {
    id: "q_automation",
    title: "Era das máquinas",
    description: "Pesquise Automação.",
    hint: "Abra a Pesquisa (tecla R).",
    goal: { type: "research", tech: "automation" },
    reward: { money: 300, xp: 100 },
  },
  {
    id: "q_gears",
    title: "Engrenando",
    description: "Produza 30 Engrenagens.",
    hint: "Construa uma Montadora e escolha a receita Engrenagem.",
    goal: { type: "produce", item: "gear", amount: 30 },
    reward: { money: 400, xp: 140 },
  },
  {
    id: "q_lab",
    title: "Mentes brilhantes",
    description: "Pesquise o Método Científico e construa um Laboratório.",
    hint: "Laboratórios consomem placas de cobre e engrenagens.",
    goal: { type: "have", building: "lab", amount: 1 },
    reward: { money: 500, xp: 160 },
  },
  {
    id: "q_rp",
    title: "Eureka!",
    description: "Gere 100 Pontos de Pesquisa.",
    hint: "Mais laboratórios = pesquisa mais rápida.",
    goal: { type: "produce", item: "research", amount: 100 },
    reward: { money: 600, xp: 200 },
  },
  {
    id: "q_power60",
    title: "Rede elétrica",
    description: "Alcance 60 MW de geração de energia.",
    hint: "Combine geradores, turbinas eólicas e usinas.",
    goal: { type: "powerGen", amount: 60 },
    reward: { money: 800, xp: 240 },
  },
  {
    id: "q_circuits",
    title: "Silício e cobre",
    description: "Produza 25 Circuitos.",
    hint: "Pesquise Eletrônica. Circuitos usam fios + placas de ferro.",
    goal: { type: "produce", item: "circuit", amount: 25 },
    reward: { money: 1500, xp: 320 },
  },
  {
    id: "q_steel",
    title: "Forjado no fogo",
    description: "Produza 30 de Aço.",
    hint: "Pesquise Siderurgia. Aço usa placas de ferro + carvão.",
    goal: { type: "produce", item: "steel", amount: 30 },
    reward: { money: 1500, xp: 320 },
  },
  {
    id: "q_green",
    title: "Pulmão verde",
    description: "Construa um Viveiro para combater a poluição.",
    hint: "Pesquise Reflorestamento.",
    goal: { type: "have", building: "nursery", amount: 1 },
    reward: { money: 1000, xp: 260 },
  },
  {
    id: "q_industrial",
    title: "Polo industrial",
    description: "Tenha 40 edifícios (sem contar estradas).",
    hint: "Expanda regiões para ter mais espaço e depósitos.",
    goal: { type: "buildings", amount: 40 },
    reward: { money: 3000, xp: 500 },
  },
  {
    id: "q_motors",
    title: "Motores a todo vapor",
    description: "Produza 20 Motores.",
    hint: "Pesquise Mecânica e construa uma Fábrica Avançada.",
    goal: { type: "produce", item: "motor", amount: 20 },
    reward: { money: 5000, xp: 700 },
  },
  {
    id: "q_computers",
    title: "Era digital",
    description: "Produza 10 Computadores.",
    hint: "Pesquise Computação.",
    goal: { type: "produce", item: "computer", amount: 10 },
    reward: { money: 10000, xp: 1000 },
  },
  {
    id: "q_pad",
    title: "Rumo às estrelas",
    description: "Construa a Plataforma de Lançamento.",
    hint: "Pesquise Engenharia Espacial.",
    goal: { type: "have", building: "rocketPad", amount: 1 },
    reward: { money: 10000, xp: 1200 },
  },
  {
    id: "q_launch",
    title: "Contagem regressiva",
    description: "Monte e lance um foguete.",
    hint: "Abasteça a plataforma com circuitos, motores, computadores e aço.",
    goal: { type: "launch", amount: 1 },
    reward: { money: 25000, xp: 2500 },
  },
];

export const CIV_TITLES = [
  "Posto Avançado",
  "Acampamento",
  "Vila Operária",
  "Vila Industrial",
  "Cidade Fabril",
  "Polo Industrial",
  "Metrópole",
  "Megaindústria",
  "Planeta Fábrica",
  "Civilização Estelar",
];

export function xpForLevel(level: number): number {
  // XP total necessário para atingir `level` (nível 1 = 0).
  if (level <= 1) return 0;
  return Math.round(120 * (Math.pow(1.75, level - 1) - 1) / 0.75);
}
