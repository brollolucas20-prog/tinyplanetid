import fs from "node:fs";
const raw = JSON.parse(fs.readFileSync("out/voice-raw.json", "utf8"));
const out = {};
for (const [id, v] of Object.entries(raw)) {
  const buf = fs.readFileSync(`remotion-assets/tutorial/voice/${id}.wav`);
  const byteRate = buf.readUInt32LE(28);
  let off = 12, dataSize = 0;
  while (off < buf.length - 8) {
    const idc = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (idc === "data") { dataSize = size; break; }
    off += 8 + size;
  }
  out[id] = { ms: Math.round((dataSize / byteRate) * 1000), words: v.words };
}
fs.writeFileSync("src/remotion/tutorial/voice.json", JSON.stringify(out));
const total = Object.values(out).reduce((s, v) => s + v.ms, 0);
console.log("narração total:", (total / 1000).toFixed(1), "s");

// Música ambiente procedural (loop de 32 s, mono 22,05 kHz)
const SR = 22050, LEN = 32 * SR;
const data = new Float32Array(LEN);
const chords = [[261.63, 329.63, 392.0, 493.88], [220.0, 261.63, 329.63, 392.0], [174.61, 220.0, 261.63, 329.63], [196.0, 246.94, 293.66, 392.0]];
for (let c = 0; c < 4; c++) {
  const start = c * 8 * SR;
  for (const f of chords[c]) {
    for (const det of [-0.003, 0.003]) {
      const fr = (f / 2) * (1 + det);
      for (let i = 0; i < 9.5 * SR; i++) {
        const idx = (start + i) % LEN;
        const t = i / SR;
        const env = Math.min(1, t / 2.2) * Math.min(1, Math.max(0, (9.5 - t) / 3));
        const tri = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * fr * t));
        data[idx] += tri * env * 0.035;
      }
    }
  }
}
const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let k = 0; k < 40; k++) {
  const st = Math.floor(rnd() * LEN);
  const f = scale[Math.floor(rnd() * scale.length)];
  for (let i = 0; i < 1.6 * SR; i++) {
    const t = i / SR;
    data[(st + i) % LEN] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2.6) * 0.05;
  }
}
// eco simples
const d = Math.floor(0.42 * SR);
for (let i = d; i < LEN; i++) data[i] += data[i - d] * 0.32;
let peak = 0;
for (const v of data) peak = Math.max(peak, Math.abs(v));
const pcm = Buffer.alloc(44 + LEN * 2);
pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + LEN * 2, 4); pcm.write("WAVE", 8); pcm.write("fmt ", 12);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write("data", 36); pcm.writeUInt32LE(LEN * 2, 40);
for (let i = 0; i < LEN; i++) pcm.writeInt16LE(Math.round((data[i] / peak) * 0.8 * 32767), 44 + i * 2);
fs.writeFileSync("remotion-assets/tutorial/music.wav", pcm);
console.log("música ok");
