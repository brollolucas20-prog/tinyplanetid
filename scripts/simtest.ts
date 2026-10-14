/**
 * Teste headless da simulação: monta uma pequena cadeia produtiva e
 * verifica coleta, logística, energia, produção, mercado, pesquisa e missões.
 *   npx tsx scripts/simtest.ts
 */
import { Game, TICK } from "../src/game/sim/game";
import type { BuildingTypeId } from "../src/game/data/buildings";

const g = new Game();
const w = g.world;
const hex = w.hex;
const ps = g.planet;
const rt = g.rt;
const start = ps.hqTile;
let failures = 0;
const check = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✔" : "✘"} ${msg}`);
  if (!cond) failures++;
};
const events: string[] = [];
g.events.on("celebrate", (c) => events.push(`${c.kind}:${c.title}`));
g.events.on("toast", (t) => events.push(`toast:${t.title}`));

function bfs(from: number, ok: (t: number) => boolean, max = 8) {
  const dist = new Map<number, number>([[from, 0]]);
  const q = [from];
  for (let i = 0; i < q.length; i++) {
    const t = q[i];
    if ((dist.get(t) ?? 0) >= max) continue;
    for (const n of hex.neighbors[t]) {
      if (dist.has(n) || !ok(n)) continue;
      dist.set(n, dist.get(t)! + 1);
      q.push(n);
    }
  }
  return dist;
}
const free = (t: number) => rt.tileBuilding[t] < 0 && w.tiles[t].level >= 0 && rt.owned[w.tiles[t].region] === 1;

/** Liga um edifício à rede com estradas (BFS por tiles livres até a rede existente). */
function connect(tile: number) {
  const prev = new Map<number, number>();
  const q = [tile];
  const seen = new Set([tile]);
  let goal = -1;
  for (let i = 0; i < q.length && goal < 0; i++) {
    const t = q[i];
    for (const n of hex.neighbors[t]) {
      if (seen.has(n)) continue;
      if (rt.roadDist[n] >= 0 && t !== tile) {
        goal = t;
        break;
      }
      if (rt.roadDist[n] >= 0 && t === tile) return true;
      if (!free(n) || (w.tiles[n].deposit && ps.deposit[n] > 0)) continue;
      seen.add(n);
      prev.set(n, t);
      q.push(n);
    }
  }
  if (goal < 0) return false;
  for (let t = goal; t !== tile; t = prev.get(t)!) g.place("road", t, -1, true);
  return true;
}

function placeNear(type: BuildingTypeId, pred: (t: number) => boolean): number {
  const d = bfs(start, () => true, 5);
  const tiles = [...d.entries()].sort((a, b) => a[1] - b[1]).map(([t]) => t);
  for (const t of tiles) {
    if (!pred(t)) continue;
    const b = g.place(type, t, -1, true);
    if (b) {
      connect(t);
      return t;
    }
  }
  return -1;
}

function run(seconds: number) {
  const n = Math.round(seconds / TICK);
  for (let i = 0; i < n; i++) g.tick(TICK);
}

// ── 1. Coleta manual ──
for (let i = 0; i < 12; i++) {
  const woodTile = [...bfs(start, () => true, 5).keys()].find((t) => ps.trees[t] > 0 && rt.tileBuilding[t] < 0)!;
  g.harvest(woodTile);
}
const stoneTile = [...bfs(start, () => true, 5).keys()].find((t) => w.tiles[t].deposit === "stone")!;
for (let i = 0; i < 12; i++) g.harvest(stoneTile);
check((ps.inventory.wood ?? 0) >= 32, `coleta manual de madeira (${ps.inventory.wood})`);
check((ps.inventory.stone ?? 0) >= 30, `coleta manual de pedra (${ps.inventory.stone})`);
run(1);
check(g.state.questIndex >= 2, `missões de coleta concluídas (índice ${g.state.questIndex})`);

// ── 2. Lenhador + estrada ──
g.state.money += 5000;
ps.inventory.wood = 200;
ps.inventory.stone = 200;
const wc = placeNear("woodcutter", (t) => free(t) && !w.tiles[t].deposit && hex.neighbors[t].some((n) => ps.trees[n] > 0));
check(wc >= 0, "lenhador construído");
run(1);
const wcB = rt.byId.get(rt.tileBuilding[wc])!;
check(rt.links.get(wcB.id)?.kind === "road", `lenhador conectado por estrada (${rt.links.get(wcB.id)?.kind})`);

// ── 3. Mineradoras, fundição e energia ──
const ironTile = placeNear("miner", (t) => free(t) && w.tiles[t].deposit === "ironOre");
const ironTile2 = placeNear("miner", (t) => free(t) && w.tiles[t].deposit === "ironOre");
check(ironTile >= 0 && ironTile2 >= 0, "2 mineradoras de ferro");
const gen = placeNear("biomassGen", (t) => free(t) && !w.tiles[t].deposit);
check(gen >= 0, "gerador a biomassa");
const smelter = placeNear("smelter", (t) => free(t) && !w.tiles[t].deposit);
check(smelter >= 0, "fundição");
const wood0 = ps.inventory.wood ?? 0;
run(60);
const sB = rt.byId.get(rt.tileBuilding[smelter])!;
console.log("   status:", ps.buildings.filter((b) => b.type !== "road").map((b) => `${b.type}=${b.status}`).join(", "));
console.log(`   energia: ${rt.power.gen.toFixed(1)} / ${rt.power.demand.toFixed(1)} MW · caminhões ${ps.trucks.length}`);
check(sB.recipe === "smelt_iron", "receita padrão de fundição = ferro");
check((g.state.counters.produced.ironPlate ?? 0) > 5, `placas de ferro produzidas (${g.state.counters.produced.ironPlate})`);
check((g.state.counters.produced.wood ?? 0) > 5, `madeira automática entregue (${g.state.counters.produced.wood}; estoque ${wood0}→${ps.inventory.wood})`);
check(rt.power.gen > 14, `gerador queimando combustível (${rt.power.gen.toFixed(1)} MW)`);

// ── 4. Mercado ──
const before = g.state.money;
const rev = g.sell("ironPlate", 10);
check(rev > 0 && g.state.money > before, `venda de placas (+$${rev.toFixed(1)})`);
g.setAutoSell("wood", true, 50);
ps.inventory.wood = 300;
run(5);
check((ps.inventory.wood ?? 0) < 300, `venda automática (madeira ${ps.inventory.wood})`);

// ── 5. Região ──
const reg = w.regions.find((r) => g.regionBuyable(r.id))!;
const okReg = g.buyRegion(reg.id);
check(okReg && ps.ownedRegions.length === 2, `compra de região (${reg.name})`);

// ── 6. Pesquisa ──
ps.inventory.ironPlate = 100;
ps.inventory.copperPlate = 100;
ps.inventory.gear = 50;
ps.inventory.brick = 100;
g.state.money += 10000;
check(g.research("automation"), "pesquisa Automação");
check(g.research("science"), "pesquisa Método Científico");
const lab = placeNear("lab", (t) => free(t) && !w.tiles[t].deposit);
check(lab >= 0, "laboratório construído");
run(40);
check(g.state.rp > 0, `pontos de pesquisa gerados (${g.state.rp})`);

// ── 7. Poluição ──
console.log(`   poluição: ${(rt.pollutionIndex * 100).toFixed(1)}% · máx tile ${Math.max(...ps.pollution).toFixed(1)}`);
check(Math.max(...ps.pollution) > 0, "fundição polui o ambiente");

// ── 7b. Indústria pesada: poluição deve crescer de forma visível ──
ps.inventory.stone = 2000;
ps.inventory.wood = 2000;
g.state.money += 50000;
for (let k = 0; k < 8; k++) {
  const t = placeNear("smelter", (x) => free(x) && !w.tiles[x].deposit);
  const b = rt.byId.get(rt.tileBuilding[t]);
  if (b) g.setRecipe(b.id, "smelt_brick");
}
for (let k = 0; k < 4; k++) placeNear("biomassGen", (x) => free(x) && !w.tiles[x].deposit);
for (let k = 0; k < 3; k++) placeNear("miner", (x) => free(x) && w.tiles[x].deposit === "stone");
run(240);
const working = ps.buildings.filter((b) => b.status === "working").length;
const tally = new Map<string, number>();
for (const b of ps.buildings) if (b.type !== "road") tally.set(`${b.type}:${b.status}`, (tally.get(`${b.type}:${b.status}`) ?? 0) + 1);
console.log("   ", [...tally.entries()].map(([k, v]) => `${k}×${v}`).join(", "), `· energia ${rt.power.gen.toFixed(0)}/${rt.power.demand.toFixed(0)}`);
console.log(`   após 4 min com ${working} edifícios trabalhando: poluição ${(rt.pollutionIndex * 100).toFixed(1)}% · máx tile ${Math.max(...ps.pollution).toFixed(1)} · árvores ${ps.trees.reduce((a, b) => a + b, 0)}`);
check(rt.pollutionIndex > 0.05, "poluição perceptível com indústria pesada");

// ── 8. Upgrade e demolição ──
const lvBefore = sB.level;
g.upgrade(sB.id);
check(sB.level === lvBefore + 1, "melhoria de nível");
const nBefore = ps.buildings.length;
g.demolish(rt.tileBuilding[gen]);
check(ps.buildings.length === nBefore - 1, "demolição");

// ── 9. Save/Load ──
const json = g.serialize();
const g2 = new Game(JSON.parse(json));
check(g2.planet.buildings.length === ps.buildings.length && Math.abs(g2.state.money - g.state.money) < 0.01, `save/load (${(json.length / 1024).toFixed(0)} KB)`);

console.log(`\nMissão atual: ${g.quest.title} · nível ${g.state.level} · eventos: ${events.slice(0, 12).join(" | ")}`);
console.log(failures ? `\n${failures} falha(s)` : "\nTudo certo!");
process.exit(failures ? 1 : 0);
