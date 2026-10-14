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
const manifest = {};

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

// ── HUD ──
await E((i) => window.__H.frame(i.playerTile, i.start, 11, 0.62), info);
await sleep(2500);
{
  const pp = await E(() => window.__H.projectVec(window.__tpi.player.pos.clone().addScaledVector(window.__tpi.player.up, 0.45)));
  const hq = await project(info.start, 1.1);
  const brand = await rect(".brand");
  const statsR = await rect(".stats");
  const menus = [];
  const n = await E(() => document.querySelectorAll(".toolbar > .icon-btn").length);
  for (let k = 0; k < n; k++) menus.push(await rect(".toolbar > .icon-btn", k));
  await shot("hud", {
    player: box(pp, 120),
    hq: box(hq, 190),
    brand: pad(brand, 4),
    topLeft: union(brand, statsR),
    stats: pad(statsR, 4),
    money: await rect(".stats .stat", 0),
    research: await rect(".stats .stat", 1),
    power: await rect(".stats .stat", 2),
    pollution: await rect(".stats .stat", 3),
    toolbar: pad(await rect(".toolbar"), 4),
    speed: pad(await rect(".speed-group"), 3),
    menus: pad(union(...menus), 3),
    quest: pad(await rect(".quest"), 4),
    questHint: pad(await rect(".quest-hint"), 4),
    inventory: pad(await rect(".inventory"), 4),
    cats: pad(await rect(".cats"), 4),
    dragFrom: box({ x: 1300, y: 640 }, 40),
    dragTo: box({ x: 980, y: 660 }, 40),
  });
}

// ── Visão geral ──
await E(() => {
  window.__tpi.cam.targetDist = 48;
  window.__tpi.cam.dist = 48;
});
await sleep(4500);
{
  const owned = await E(() => {
    const g = window.__tpi.game();
    const tiles = g.world.regions[0].tiles;
    return window.__H.bbox(tiles, 0.1);
  });
  await shot("overview", { owned: pad(owned, 30) });
}

// ── Recursos ──
await E((i) => window.__H.frame(i.playerTile, i.start, 17, 1.12), info);
await sleep(2500);
{
  const a = {};
  for (const k of ["tree", "stone", "ironOre", "copperOre", "coal"]) a[k === "tree" ? "wood" : k] = box(await project(info[k], 0.3), 100);
  await shot("resources", a);
}

// ── Coleta ──
const harvestStand = await E((i) => {
  const g = window.__tpi.game();
  const w = g.world;
  return w.hex.neighbors[i.tree].find((n) => g.rt.tileBuilding[n] < 0 && w.tiles[n].level >= 0 && !(w.tiles[n].deposit && g.planet.deposit[n] > 0)) ?? i.playerTile;
}, info);
await E((s, t) => window.__H.frame(s, t, 8, 0.5), harvestStand, info.tree);
await sleep(2000);
await E((t) => {
  window.__tpi.player.harvestTile = t;
  window.__tpi.player.target = t;
  window.__tpi.game().state.settings.speed = 1;
}, info.tree);
{
  const tp = await project(info.tree, 0.3);
  await page.mouse.move(tp.x, tp.y);
  await sleep(1600);
  const popup = await E(() => {
    const els = [...document.querySelectorAll(".popup")];
    const el = els[els.length - 1];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await shot("harvest", { tree: box(tp, 120), popup: pad(popup, 10) });
}
await E(() => {
  window.__tpi.game().state.settings.speed = 0;
  window.__tpi.player.harvestTile = -1;
});

// ── Tooltip de depósito ──
await E((i) => window.__H.frame(i.playerTile, i.ironOre, 12, 0.75), info);
await sleep(2200);
{
  const tp = await project(info.ironOre, 0.2);
  await page.mouse.move(tp.x, tp.y);
  await sleep(900);
  await shot("tooltip", { tile: box(tp, 100), tooltip: pad(await rect(".tooltip"), 6) });
}

// ── Bandeja de construção ──
await page.mouse.move(W - 5, 300);
await E(() => [...document.querySelectorAll(".cat")].find((b) => b.textContent.includes("Extração")).click());
await sleep(700);
{
  const card = await rect(".bcard", 0);
  await page.mouse.move(card.x + card.w / 2, card.y + 20);
  await sleep(700);
  const catIdx = await E(() => [...document.querySelectorAll(".cat")].findIndex((b) => b.textContent.includes("Extração")));
  await shot("tray", {
    tray: pad(await rect(".tray"), 6),
    cat: await rect(".cat", catIdx),
    card: pad(card, 4),
    cost: pad(await rect(".bcard .costs", 0), 5),
  });
}

// ── Fantasma do lenhador ──
const wcTile = await E((i) => {
  const g = window.__tpi.game();
  const w = g.world;
  const cands = g.radius(g.rt, i.start, 3).map((x) => x.tile);
  return cands.find((t) => g.checkPlace("woodcutter", t).ok && w.hex.neighbors[t].filter((n) => g.planet.trees[n] > 0).length >= 2) ?? cands.find((t) => g.checkPlace("woodcutter", t).ok);
}, info);
await E((s, t) => window.__H.frame(s, t, 12, 0.85), info.playerTile, wcTile);
await sleep(2200);
await key("2");
{
  const tp = await project(wcTile, 0.3);
  await page.mouse.move(tp.x, tp.y);
  await sleep(1000);
  const range = await E((t) => window.__H.bbox(window.__H.near(t, 2).map((x) => x.tile), 0.1), wcTile);
  await shot("ghost", { tile: box(tp, 150), chip: pad(await rect(".tool-chip"), 4), range: pad(range, 10), tooltip: pad(await rect(".tooltip"), 6) });
  // local inválido
  const bad = await project(info.ironOre, 0.2);
  if (bad) {
    await page.mouse.move(bad.x, bad.y);
    await sleep(900);
    await shot("ghostBad", { tile: box(bad, 140), tooltip: pad(await rect(".tooltip"), 6) });
  }
}
// ── Mineradora ──
await key("3");
await E((i) => window.__H.frame(i.playerTile, i.ironOre, 11, 0.8), info);
await sleep(2200);
{
  const tp = await project(info.ironOre, 0.2);
  await page.mouse.move(tp.x, tp.y);
  await sleep(900);
  await shot("miner", { tile: box(tp, 150) });
}
await key("Escape");
await key("Escape");

// ── Base produtiva ──
const base = await E(
  (i, wc) => {
    const g = window.__tpi.game();
    const H = window.__H;
    const w = g.world;
    H.rich();
    for (const r of g.world.regions[0].neighbors.slice(0, 3)) g.buyRegion(r);
    const placed = {};
    const put = (type, t) => {
      if (t === undefined || t < 0) return null;
      const b = g.place(type, t, -1, true);
      if (b) H.connect(t);
      return b;
    };
    put("woodcutter", wc);
    const area = g.radius(g.rt, i.start, 6).map((x) => x.tile);
    const dep = (k) => area.filter((t) => w.tiles[t].deposit === k && g.rt.tileBuilding[t] < 0);
    placed.miners = [...dep("ironOre").slice(0, 2), ...dep("stone").slice(0, 1), ...dep("copperOre").slice(0, 1)].map((t) => put("miner", t)?.tile);
    const freeT = () => area.find((t) => H.free(t) && w.hex.neighbors[t].some((n) => g.rt.roadDist[n] >= 0)) ?? area.find((t) => H.free(t));
    placed.gens = [put("biomassGen", freeT())?.tile, put("biomassGen", freeT())?.tile];
    const s1 = put("smelter", freeT());
    const s2 = put("smelter", freeT());
    if (s2) g.setRecipe(s2.id, "smelt_brick");
    const s3 = put("smelter", freeT());
    if (s3) g.setRecipe(s3.id, "smelt_copper");
    put("sawmill", freeT());
    placed.smelter = s1?.tile;
    H.ticks(900);
    return placed;
  },
  info,
  wcTile,
);
console.log("base", base);

// ── Estradas ──
await E((i) => window.__H.frame(i.playerTile, i.start, 15, 0.95), info);
await sleep(2400);
await key("1");
{
  const roadTiles = await E(() => {
    const g = window.__tpi.game();
    return g.planet.buildings.filter((b) => b.type === "road").map((b) => b.tile);
  });
  const area = await E((tiles) => window.__H.bbox(tiles, 0.1), roadTiles);
  const freeNear = await E(() => {
    const g = window.__tpi.game();
    const rt = g.rt;
    for (const b of g.planet.buildings) {
      if (b.type !== "road") continue;
      for (const n of g.world.hex.neighbors[b.tile]) if (g.checkPlace("road", n).ok) return n;
    }
    return -1;
  });
  const fp = freeNear >= 0 ? await project(freeNear, 0.1) : null;
  if (fp) await page.mouse.move(fp.x, fp.y);
  await sleep(900);
  const r0 = await project(roadTiles[0], 0.1);
  const r1 = await project(roadTiles[Math.min(roadTiles.length - 1, 3)], 0.1);
  await shot("roads", { area: pad(area, 40), dragFrom: box(r0 ?? fp, 40), dragTo: box(r1 ?? fp, 40), chip: pad(await rect(".tool-chip"), 4) });
}
await key("Escape");
await key("Escape");
await page.mouse.move(W - 5, 300);

// ── Caminhões ──
await E(() => (window.__tpi.game().state.settings.speed = 1));
await E((i) => window.__H.frame(i.playerTile, i.start, 13, 0.9), info);
await sleep(3500);
{
  const truck = await E(() => {
    const g = window.__tpi.game();
    const w = g.world;
    const tr = g.planet.trucks.filter((t) => !t.drone && t.t > 0.25 && t.t < t.length - 0.25).sort((a, b) => b.length - a.length)[0];
    if (!tr) return null;
    const i = Math.min(tr.path.length - 2, Math.floor(tr.t));
    const f = tr.t - i;
    const a = w.hex.centers[tr.path[i]];
    const b = w.hex.centers[tr.path[i + 1]];
    const v = a.clone().lerp(b, f).normalize().multiplyScalar(w.surfaceRadius(tr.path[i]) + 0.15);
    return window.__H.projectVec(v);
  });
  const baseBox = await E(() => {
    const g = window.__tpi.game();
    return window.__H.bbox(g.planet.buildings.filter((b) => b.type !== "road").map((b) => b.tile), 0.5);
  });
  await shot("trucks", { truck: box(truck ?? { x: W / 2, y: H / 2 }, 110), base: pad(baseBox, 30) });
}
await E(() => (window.__tpi.game().state.settings.speed = 0));

// ── Sem conexão ──
const lonely = await E((i) => {
  const g = window.__tpi.game();
  const w = g.world;
  const area = g.radius(g.rt, i.start, 6).map((x) => x.tile);
  const t = area.find((t) => g.checkPlace("sawmill", t).ok && w.hex.neighbors[t].every((n) => g.rt.tileBuilding[n] < 0));
  const b = g.place("sawmill", t, -1, true);
  b.output = { planks: 6 };
  window.__H.ticks(5);
  return t;
}, info);
await E((s, t) => window.__H.frame(s, t, 10, 0.75), info.playerTile, lonely);
await sleep(2400);
{
  const bp = await project(lonely, 0.25);
  await page.mouse.click(bp.x, bp.y);
  await sleep(1000);
  await page.mouse.move(W - 400, 120);
  await sleep(500);
  const icon = await project(lonely, 1.65);
  await shot("noconn", {
    icon: box(icon, 90),
    status: pad(await rect(".inspector .chip"), 5),
    actions: pad(await rect(".inspector .actions"), 5),
    panel: await rect(".inspector"),
  });
}
await key("Escape");

// ── Falta de energia ──
await E(() => {
  const g = window.__tpi.game();
  for (const b of g.planet.buildings) {
    if (b.type === "biomassGen") b.enabled = false;
    if (b.type === "miner" || b.type === "smelter") b.level = 2;
  }
  g.structureVersion++;
  window.__H.ticks(30);
});
await E((i) => window.__H.frame(i.playerTile, i.start, 13, 0.9), info);
await sleep(3000);
{
  const iconTile = await E(() => window.__tpi.game().planet.buildings.find((b) => b.status === "noPower")?.tile ?? -1);
  const icon = iconTile >= 0 ? await project(iconTile, 2.0) : null;
  const stat = await rect(".stats .stat", 2);
  const warn = await rect(".warn-chip");
  await shot("power", { stat: pad(stat, 4), warn: pad(warn, 4), top: union(stat, warn), icon: box(icon, 90) });
}
await E(() => {
  const g = window.__tpi.game();
  for (const b of g.planet.buildings) if (b.type === "biomassGen") b.enabled = true;
  const area = g.radius(g.rt, g.planet.hqTile, 6).map((x) => x.tile);
  for (let k = 0; k < 3; k++) {
    const t = area.find((t) => window.__H.free(t) && g.world.hex.neighbors[t].some((n) => g.rt.roadDist[n] >= 0));
    if (t !== undefined) g.place("biomassGen", t, -1, true);
  }
  window.__H.ticks(300);
});

// ── Painel do edifício ──
await E((s, t) => window.__H.frame(s, t, 10, 0.7), info.playerTile, base.smelter);
await sleep(2400);
{
  const sp = await project(base.smelter, 0.4);
  await page.mouse.click(sp.x, sp.y);
  await sleep(1000);
  await page.mouse.move(W - 600, 140);
  await sleep(400);
  const panel = await rect(".inspector");
  const sections = await E(() =>
    [...document.querySelectorAll(".inspector .insp-section")].map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, t: el.textContent.slice(0, 20) };
    }),
  );
  const buffers = sections.find((s) => s.t.includes("Entrada"));
  await shot("inspector", {
    building: box(sp, 130),
    panel: pad(panel, 4),
    progress: pad(sections[0], 2),
    recipes: pad(await rect(".inspector .recipe-list"), 5),
    panelBottom: buffers ? { x: panel.x, y: buffers.y, w: panel.w, h: panel.y + panel.h - buffers.y } : panel,
    buffers: pad(buffers, 2),
    upgrade: pad(await rect(".inspector .btn.primary"), 4),
    actions: pad(await rect(".inspector .actions"), 4),
  });
}
await key("Escape");

// ── Mercado ──
await E(() => {
  const g = window.__tpi.game();
  g.setAutoSell("wood", true, 100);
  window.__H.ticks(200);
});
await key("m");
await sleep(1200);
{
  const row = 1; // primeira linha após o cabeçalho
  const cells = await E((row) => {
    const r = document.querySelectorAll(".mrow")[row];
    return [...r.children].map((c) => {
      const b = c.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
  }, row);
  const rows = await E(() =>
    [...document.querySelectorAll(".mrow")].slice(1).map((r) => {
      const b = r.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    }),
  );
  const allRows = union(...rows);
  await shot("market", {
    modal: await rect(".modal"),
    sell: pad(cells[4], 6),
    price: pad(cells[2], 6),
    trend: pad(cells[3], 6),
    auto: pad(cells[5], 6),
    priceArea: { x: cells[2].x - 20, y: allRows.y, w: cells[3].x + cells[3].w - cells[2].x + 40, h: allRows.h },
    autoArea: { x: cells[4].x - 20, y: allRows.y, w: cells[5].x + cells[5].w - cells[4].x + 40, h: allRows.h },
  });
}
await key("Escape");

// ── Região ──
const regionTile = await E((i) => {
  const g = window.__tpi.game();
  const w = g.world;
  const cands = g.radius(g.rt, i.start, 10).filter((x) => x.dist >= 4).map((x) => x.tile);
  return cands.find((t) => !g.rt.owned[w.tiles[t].region] && g.regionBuyable(w.tiles[t].region) && w.tiles[t].level >= 0) ?? -1;
}, info);
await E((s, t) => window.__H.frame(s, t, 20, 0.95), info.playerTile, regionTile);
await sleep(2600);
{
  const tp = await project(regionTile, 0.2);
  await page.mouse.move(tp.x, tp.y);
  await sleep(1200);
  await shot("regionHover", { tile: box(tp, 90), tooltip: pad(await rect(".tooltip"), 6) });
  await page.mouse.click(tp.x, tp.y);
  await sleep(900);
  await shot("regionDialog", { modal: pad(await rect(".modal"), 4), buy: pad(await rect(".modal-foot .btn.primary"), 5) });
}
await key("Escape");
await page.mouse.move(W - 5, 300);

// ── Pesquisa ──
await E(() => {
  const g = window.__tpi.game();
  window.__H.rich();
  g.research("automation");
  g.research("logistics");
  g.state.rp = 45;
});
await key("t");
await sleep(1200);
{
  const techs = await E(() =>
    [...document.querySelectorAll(".tech")].map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
  const minX = Math.min(...techs.map((t) => t.x));
  const era1 = union(...techs.filter((t) => Math.abs(t.x - minX) < 5));
  const pills = await E(() =>
    [...document.querySelectorAll(".modal-head .pill")].map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, t: el.textContent };
    }),
  );
  await shot("research", { era1: pad(era1, 8), head: await rect(".modal-head"), rp: pad(pills.find((p) => p.t.includes("PP")), 5), modal: await rect(".modal") });
}
await key("Escape");

// ── Celebração ──
await setCelebrations(true);
await E(() => window.__tpi.game().research("commerce"));
await sleep(1500);
await shot("celebration", { banner: pad(await rect(".celebration"), -30) });
await sleep(3500);
await setCelebrations(false);

// ── Poluição ──
await E((i) => {
  const g = window.__tpi.game();
  const ps = g.planet;
  for (const { tile, dist } of g.radius(g.rt, i.start, 6)) {
    ps.pollution[tile] = Math.max(0, 80 - dist * 8);
    if (dist <= 4 && ps.trees[tile] > 0 && Math.random() < 0.6) ps.trees[tile] = Math.max(0, ps.trees[tile] - 2);
  }
  for (let k = 0; k < g.world.hex.count; k++) ps.pollution[k] = Math.max(ps.pollution[k], 9);
  g.envVersion++;
  window.__H.ticks(12);
}, info);
await E((i) => window.__H.frame(i.playerTile, i.start, 16, 0.85), info);
await sleep(3500);
{
  const area = await E((i) => window.__H.bbox(window.__H.near(i.start, 3).map((x) => x.tile), 0.2), info);
  const stat = await rect(".stats .stat", 3);
  const warn = await rect(".warn-chip");
  await shot("pollution", { area: pad(area, 20), stat: pad(stat, 4), warn: pad(warn, 4), top: union(stat, warn) });
}
await E(() => {
  const g = window.__tpi.game();
  g.planet.pollution.fill(0);
  g.envVersion++;
  window.__H.ticks(12);
});

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
  await page.mouse.click(pp.x, pp.y);
  await sleep(1000);
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
