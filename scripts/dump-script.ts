import fs from "node:fs";
import { SCENES } from "../src/remotion/tutorial/script";
fs.writeFileSync("out/tts-input.json", JSON.stringify(SCENES.map((s) => ({ id: s.id, text: s.text }))), "utf8");
console.log(SCENES.length, "cenas");
