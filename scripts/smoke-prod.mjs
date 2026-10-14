/** Teste rápido da build de produção:  npx vite preview --port 4173  e depois  node scripts/smoke-prod.mjs */
import path from "node:path";
import puppeteer from "puppeteer-core";

const EXE = path.resolve("node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe");
const URL = process.argv[2] ?? "http://localhost:4173";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: "shell",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  defaultViewport: { width: 1600, height: 900 },
  protocolTimeout: 120000,
});
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (r) => errors.push(`falhou: ${r.url()}`));
await page.goto(URL, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });
await sleep(6000);
await page.screenshot({ path: "out/prod-title.png" });
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Jogar")).click());
await sleep(6000);
await page.keyboard.down("s");
await sleep(1200);
await page.keyboard.up("s");
await page.keyboard.press("3");
await sleep(800);
await page.screenshot({ path: "out/prod-game.png" });
const ok = await page.evaluate(() => ({
  canvas: !!document.querySelector(".game-canvas canvas"),
  hud: document.body.textContent.includes("Armazém da Sede") || document.body.textContent.includes("ARMAZÉM"),
  quest: document.body.textContent.includes("Primeiros passos"),
  saved: !!localStorage.getItem("tiny-planet-industries/save-v1") || "ainda não (autosave em 20s)",
}));
console.log(JSON.stringify(ok));
console.log(errors.length ? "ERROS:\n" + errors.join("\n") : "Sem erros no console.");
await browser.close();
