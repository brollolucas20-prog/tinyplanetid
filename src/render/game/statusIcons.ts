import { CanvasTexture, SpriteMaterial, SRGBColorSpace } from "three";
import type { BuildingStatus } from "@/game/sim/types";

const ICONS: Partial<Record<BuildingStatus, { bg: string; glyph: string; fg?: string }>> = {
  noPower: { bg: "#ef4444", glyph: "⚡", fg: "#fff7cc" },
  noInput: { bg: "#f59e0b", glyph: "?" },
  noConnection: { bg: "#f97316", glyph: "⛓" },
  outputFull: { bg: "#3b82f6", glyph: "▣" },
  storageFull: { bg: "#3b82f6", glyph: "▣" },
  noDeposit: { bg: "#6b7280", glyph: "✕" },
  noTrees: { bg: "#65a30d", glyph: "✕" },
  noFuel: { bg: "#78716c", glyph: "🔥" },
  paused: { bg: "#64748b", glyph: "❚❚" },
  noRecipe: { bg: "#a855f7", glyph: "?" },
  ready: { bg: "#22c55e", glyph: "★" },
};

const cache = new Map<string, SpriteMaterial>();

export function statusMaterial(status: BuildingStatus): SpriteMaterial | null {
  const icon = ICONS[status];
  if (!icon) return null;
  let m = cache.get(status);
  if (m) return m;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = icon.bg;
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.stroke();
  ctx.fillStyle = icon.fg ?? "#ffffff";
  ctx.font = `bold ${size * 0.46}px "Segoe UI Symbol", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(icon.glyph, size / 2, size / 2 + 4);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  m = new SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  cache.set(status, m);
  return m;
}
