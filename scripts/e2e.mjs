/**
 * Teste de ponta a ponta no Chrome headless (requer `npm run dev` rodando).
 *   node scripts/e2e.mjs
 * Gera capturas em out/e2e/.
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const EXE = path.resolve("node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe");
const OUT = path.resolve("out/e2e");
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? "✔" : "✘"} ${msg}`);
  if (!cond) failures++;
};

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: "shell",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
  protocolTimeout: 120000,
});
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") {
    const t = m.text();
    if (!t.includes("Download the React DevTools")) errors.push(`[${m.type()}] ${t}`);
  }
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
const shot = async (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
const T = (fn, ...args) => page.evaluate(fn, ...args);

/** Projeta o topo de um tile para coordenadas de tela. */
const tileScreen = (tile) =>
  T((tile) => {
    const g = window.__tpi.game();
    const cam = window.__tpiCamera;
    const w = g.world;
    const v = w.hex.centers[tile].clone().multiplyScalar(w.surfaceRadius(tile) + 0.05);
    v.project(cam);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight, z: v.z };
  }, tile);

await page.goto("http://localhost:5173", { waitUntil: "networkidle2" });
await T(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });
await sleep(6000);
await shot("01-title");

// Novo jogo
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Jogar")).click());
await sleep(5000);
await shot("02-game-start");
check(await T(() => !!window.__tpi.game()), "partida iniciada");

// Movimento
const d0 = await T(() => window.__tpi.game().planet.player.dir.slice());
await page.keyboard.down("s");
await sleep(1500);
await page.keyboard.up("s");
await page.keyboard.down("d");
await sleep(800);
await page.keyboard.up("d");
const d1 = await T(() => window.__tpi.game().planet.player.dir.slice());
const moved = Math.hypot(d0[0] - d1[0], d0[1] - d1[1], d0[2] - d1[2]);
check(moved > 0.01, `astronauta andou (Δ=${moved.toFixed(3)})`);

// Coleta por clique numa árvore
const treeTile = await T(() => {
  const g = window.__tpi.game();
  const p = window.__tpi.player;
  const near = g.radius(g.rt, p.tile, 4).map((x) => x.tile);
  return near.find((t) => g.planet.trees[t] > 0 && g.rt.tileBuilding[t] < 0) ?? -1;
});
check(treeTile >= 0, "árvore próxima encontrada");
const wood0 = await T(() => window.__tpi.game().planet.inventory.wood ?? 0);
const tp = await tileScreen(treeTile);
await page.mouse.move(tp.x, tp.y);
await sleep(400);
await shot("03-hover-tree");
await page.mouse.click(tp.x, tp.y);
await sleep(6000);
const wood1 = await T(() => window.__tpi.game().planet.inventory.wood ?? 0);
check(wood1 > wood0, `coleta por clique (${wood0} → ${wood1})`);
await shot("04-harvest");

// Construção: lenhador via atalho 2 e clique
const buildTile = await T(() => {
  const g = window.__tpi.game();
  const near = g.radius(g.rt, g.planet.hqTile, 3).map((x) => x.tile);
  return near.find((t) => g.checkPlace("woodcutter", t).ok && g.world.hex.neighbors[t].some((n) => g.planet.trees[n] > 0)) ?? -1;
});
check(buildTile >= 0, "local para lenhador");
await page.keyboard.press("2");
await sleep(300);
const bp = await tileScreen(buildTile);
await page.mouse.move(bp.x, bp.y);
await sleep(600);
await shot("05-ghost");
await page.mouse.click(bp.x, bp.y);
await sleep(1200);
const placed = await T((t) => window.__tpi.game().rt.tileBuilding[t] >= 0, buildTile);
check(placed, "lenhador construído pelo clique");
await page.keyboard.press("Escape");

// Estrada até a Sede (via API) e cadeia produtiva com recursos extras
await T((tile) => {
  const g = window.__tpi.game();
  const w = g.world;
  const rt = g.rt;
  g.state.money += 20000;
  Object.assign(g.planet.inventory, { wood: 300, stone: 300 });
  const connect = (from) => {
    const prev = new Map();
    const q = [from];
    const seen = new Set([from]);
    for (let i = 0; i < q.length; i++) {
      const t = q[i];
      for (const n of w.hex.neighbors[t]) {
        if (seen.has(n)) continue;
        if (rt.roadDist[n] >= 0) {
          for (let x = t; x !== from; x = prev.get(x)) g.place("road", x, -1, true);
          return;
        }
        if (rt.tileBuilding[n] >= 0 || w.tiles[n].level < 0 || !rt.owned[w.tiles[n].region] || (w.tiles[n].deposit && g.planet.deposit[n] > 0)) continue;
        seen.add(n);
        prev.set(n, t);
        q.push(n);
      }
    }
  };
  connect(tile);
  const near = g.radius(rt, g.planet.hqTile, 4).map((x) => x.tile);
  const iron = near.filter((t) => w.tiles[t].deposit === "ironOre" && rt.tileBuilding[t] < 0).slice(0, 2);
  for (const t of iron) if (g.place("miner", t, -1, true)) connect(t);
  const freeT = () => near.find((t) => g.checkPlace("smelter", t).ok);
  for (const type of ["biomassGen", "smelter", "sawmill"]) {
    const t = freeT();
    if (t !== undefined && g.place(type, t, -1, true)) connect(t);
  }
  g.state.settings.speed = 4;
}, buildTile);
await sleep(12000);
await shot("06-factory");
const stats = await T(() => {
  const g = window.__tpi.game();
  return {
    trucks: g.planet.trucks.length,
    plates: g.state.counters.produced.ironPlate ?? 0,
    power: g.rt.power,
    statuses: g.planet.buildings.filter((b) => b.type !== "road").map((b) => `${b.type}:${b.status}`),
  };
});
console.log("  ", JSON.stringify(stats));
check(stats.statuses.some((s) => s.endsWith(":working")), "edifícios trabalhando");

// Inspetor: clique na fundição
const smelterTile = await T(() => window.__tpi.game().planet.buildings.find((b) => b.type === "smelter")?.tile ?? -1);
if (smelterTile >= 0) {
  const sp = await tileScreen(smelterTile);
  await page.mouse.click(sp.x, sp.y);
  await sleep(800);
  await shot("07-inspector");
  check(await T(() => !!document.querySelector(".inspector")), "inspetor aberto ao clicar no edifício");
}

// Painéis
await page.keyboard.press("Escape");
await page.keyboard.press("m");
await sleep(800);
await shot("08-market");
check(await T(() => document.body.textContent.includes("Mercado Interplanetário")), "painel do mercado");
await page.keyboard.press("Escape");
await page.keyboard.press("t");
await sleep(800);
await shot("09-research");
check(await T(() => document.body.textContent.includes("Árvore Tecnológica")), "painel de pesquisa");
await page.keyboard.press("Escape");

// Celebração (Remotion Player)
await T(() => {
  const g = window.__tpi.game();
  Object.assign(g.planet.inventory, { ironPlate: 100 });
  g.research("automation");
});
await sleep(1200);
await shot("10-celebration");
check(await T(() => !!document.querySelector(".celebration")), "celebração Remotion exibida");

// Visão do planeta inteiro
await sleep(2500);
await page.keyboard.press("Tab");
await sleep(2500);
await shot("11-overview");

console.log(errors.length ? `\nErros no console:\n${errors.slice(0, 15).join("\n")}` : "\nSem erros no console.");
console.log(failures ? `${failures} falha(s)` : "Tudo certo!");
await browser.close();
process.exit(failures ? 1 : 0);
