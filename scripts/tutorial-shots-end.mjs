/**
 * Captura as telas reais do jogo para o vídeo tutorial (requer `npm run dev`).
 *   node scripts/tutorial-shots.mjs
 * Saída: remotion-assets/tutorial/shots/*.jpg e src/remotion/tutorial/shots.json (âncoras em px 1920×1080).
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const EXE = path.resolve("node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe");
const SHOTS = path.resolve("remotion-assets/tutorial/shots");
const MANIFEST = path.resolve("src/remotion/tutorial/shots.json");
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 1920;
const H = 1080;
const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: "shell",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  protocolTimeout: 180000,
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
const E = (fn, ...a) => page.evaluate(fn, ...a);

async function shot(name, anchors) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.jpg`), type: "jpeg", quality: 90 });
  manifest[name] = anchors;
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  console.log(`📸 ${name}`, Object.keys(anchors).join(", "));
}

const rect = (sel, idx = 0) =>
  E(
    (sel, idx) => {
      const els = document.querySelectorAll(sel);
      const el = els[idx];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    },
    sel,
    idx,
  );
const union = (...rs) => {
  const v = rs.filter(Boolean);
  if (!v.length) return null;
  const x = Math.min(...v.map((r) => r.x));
  const y = Math.min(...v.map((r) => r.y));
  const x2 = Math.max(...v.map((r) => r.x + r.w));
  const y2 = Math.max(...v.map((r) => r.y + r.h));
  return { x, y, w: x2 - x, h: y2 - y };
};
const box = (p, s = 110) => (p ? { x: Math.round(p.x - s / 2), y: Math.round(p.y - s / 2), w: s, h: s } : null);
const pad = (r, p) => (r ? { x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p } : null);

// ───────────── utilitários dentro da página ─────────────
async function installHelpers() {
  await E(() => {
    const T = window.__tpi;
    const H = {
      g: () => T.game(),
      center(tile) {
        return T.game().world.hex.centers[tile];
      },
      project(tile, lift = 0.2) {
        const g = T.game();
        const cam = window.__tpiCamera;
        const w = g.world;
        const v = w.hex.centers[tile].clone().multiplyScalar(w.surfaceRadius(tile) + lift);
        const facing = v.clone().normalize().dot(cam.position.clone().normalize());
        v.project(cam);
        if (v.z > 1 || facing < 0.05) return null;
        return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
      },
      projectVec(vec) {
        const cam = window.__tpiCamera;
        const v = vec.clone();
        v.project(cam);
        return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
      },
      bbox(tiles, lift = 0.2) {
        const pts = tiles.map((t) => H.project(t, lift)).filter(Boolean);
        if (!pts.length) return null;
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const x = Math.max(0, Math.min(...xs));
        const y = Math.max(0, Math.min(...ys));
        return { x, y, w: Math.min(innerWidth, Math.max(...xs)) - x, h: Math.min(innerHeight, Math.max(...ys)) - y };
      },
      near(from, r) {
        const g = T.game();
        return g.radius(g.rt, from, r);
      },
      /** Posiciona astronauta e câmera olhando para `look`. */
      frame(tile, look, dist = 11, pitch = 0.62) {
        const g = T.game();
        const c = g.world.hex.centers[tile];
        const lc = g.world.hex.centers[look];
        const f = lc.clone().addScaledVector(c, -lc.dot(c)).normalize();
        g.planet.player.dir = [c.x, c.y, c.z];
        g.planet.player.fwd = [f.x, f.y, f.z];
        T.cam.dist = T.cam.targetDist = dist;
        T.cam.pitch = pitch;
        T.cam.initialized = false;
        T.player.target = -1;
        T.player.harvestTile = -1;
        T.player.tile = tile;
        H.day(tile);
      },
      /** Ajusta a hora para o sol iluminar a região do tile. */
      day(tile) {
        const g = T.game();
        const c = g.world.hex.centers[tile];
        let a = Math.atan2(c.z, c.x) - 0.55;
        a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const DAY = 300;
        const base = Math.floor(g.state.time / DAY) * DAY;
        g.state.time = base + (a / (2 * Math.PI)) * DAY;
      },
      connect(from) {
        const g = T.game();
        const w = g.world;
        const rt = g.rt;
        const prev = new Map();
        const q = [from];
        const seen = new Set([from]);
        for (let i = 0; i < q.length; i++) {
          const t = q[i];
          for (const n of w.hex.neighbors[t]) {
            if (seen.has(n)) continue;
            if (rt.roadDist[n] >= 0) {
              for (let x = t; x !== from; x = prev.get(x)) g.place("road", x, -1, true);
              return true;
            }
            if (rt.tileBuilding[n] >= 0 || w.tiles[n].level < 0 || !rt.owned[w.tiles[n].region] || (w.tiles[n].deposit && g.planet.deposit[n] > 0)) continue;
            seen.add(n);
            prev.set(n, t);
            q.push(n);
          }
        }
        return false;
      },
      free(t) {
        const g = T.game();
        return g.checkPlace("smelter", t).ok;
      },
      ticks(n) {
        const g = T.game();
        for (let i = 0; i < n; i++) g.tick(0.1);
      },
      rich() {
        const g = T.game();
        g.state.money = Math.max(g.state.money, 200000);
        Object.assign(g.planet.inventory, { wood: 400, stone: 400, planks: 300, brick: 300, ironPlate: 300, copperPlate: 300, gear: 150, circuit: 150, steel: 200, motor: 80, computer: 60 });
      },
    };
    window.__H = H;
    const st = document.createElement("style");
    st.id = "tut-style";
    st.textContent = ".toasts,.paused-banner{display:none!important} .celebration{display:none!important}";
    document.head.appendChild(st);
  });
}
const setCelebrations = (on) =>
  E((on) => {
    document.getElementById("tut-style").textContent = on
      ? ".toasts,.paused-banner{display:none!important}"
      : ".toasts,.paused-banner{display:none!important} .celebration{display:none!important}";
  }, on);
const project = (tile, lift) => E((t, l) => window.__H.project(t, l), tile, lift);
const key = async (k) => {
  await page.keyboard.press(k);
  await sleep(300);
};

// ───────────── início ─────────────
await page.goto("http://localhost:5173", { waitUntil: "networkidle2" });
await E(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });
await sleep(4000);
await E(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Jogar")).click());
await sleep(5000);
await installHelpers();
await E(() => (window.__tpi.game().state.settings.speed = 0));
await page.mouse.move(W - 5, H / 2);

const info = await E(() => {
  const g = window.__tpi.game();
  const w = g.world;
  const start = g.planet.hqTile;
  const area = g.radius(g.rt, start, 4);
  const find = (pred) => area.filter((a) => pred(a.tile)).sort((a, b) => a.dist - b.dist)[0]?.tile ?? -1;
  return {
    start,
    playerTile: w.hex.neighbors[start][0],
    tree: find((t) => g.planet.trees[t] >= 2 && g.rt.tileBuilding[t] < 0 && !w.tiles[t].deposit),
    stone: find((t) => w.tiles[t].deposit === "stone"),
    ironOre: find((t) => w.tiles[t].deposit === "ironOre"),
    copperOre: find((t) => w.tiles[t].deposit === "copperOre"),
    coal: find((t) => w.tiles[t].deposit === "coal"),
  };
});
console.log(info);

// ── Plataforma de lançamento ──
const ALL = ["automation", "logistics", "commerce", "science", "combustion", "electronics", "metallurgy", "wind", "reforestation", "asphalt", "deepMining", "photovoltaic", "mechanics", "advResearch", "filters", "aerial", "optimization", "computing", "ecology", "megastorage", "fusion", "spaceflight"];
const pad3 = await E((all) => {
  const g = window.__tpi.game();
  g.state.rp = 100000;
  for (const id of all) {
    window.__H.rich();
    g.research(id);
  }
  window.__H.rich();
  const area = g.radius(g.rt, g.planet.hqTile, 6).map((x) => x.tile);
  const t = area.find((t) => window.__H.free(t) && g.world.hex.neighbors[t].some((n) => g.rt.roadDist[n] >= 0)) ?? area.find((t) => window.__H.free(t));
  const b = g.place("rocketPad", t, -1, true);
  window.__H.connect(t);
  b.rocketReady = true;
  window.__H.ticks(5);
  return t;
}, ALL);
await E((s, t) => window.__H.frame(s, t, 12, 0.6), info.playerTile, pad3);
await sleep(2600);
{
  const pp = await project(pad3, 0.4);
  await E((t) => {
    const g = window.__tpi.game();
    window.__tpiUI.getState().select(g.rt.tileBuilding[t]);
  }, pad3);
  await sleep(1200);
  await page.mouse.move(W - 600, 140);
  await sleep(400);
  const comp = await E(() => {
    const s = [...document.querySelectorAll(".inspector .insp-section")].find((el) => el.textContent.includes("Componentes"));
    const r = s.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await shot("rocketpad", { components: pad(comp, 2), launch: pad(await rect(".inspector .btn.green"), 5), pad: box(pp, 160) });
  // Lançamento
  await E(() => document.querySelector(".inspector .btn.green").click());
  await key("Escape");
  await page.mouse.move(W - 5, 300);
  await sleep(2600);
  await shot("launch", {});
}
await sleep(3000);

// ── Planetas ──
await key("p");
await sleep(1200);
await shot("planets", { cards: pad(await rect(".planets"), 8), modal: await rect(".modal") });
await E(() => [...document.querySelectorAll(".planet-card button")].find((b) => b.textContent.includes("Viajar")).click());
await sleep(6000);
await E(() => {
  const g = window.__tpi.game();
  const s = g.planet.hqTile;
  const n = g.world.hex.neighbors[s][0];
  window.__H.frame(n, s, 26, 1.0);
});
await sleep(4000);
await shot("ferrus", {});

await browser.close();
console.log("Capturas:", Object.keys(manifest).length);
