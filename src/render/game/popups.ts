import { Vector3 } from "three";

/** Textos flutuantes ("+5 Madeira") projetados da cena 3D para o DOM (sem re-render do React). */
export interface Popup {
  text: string;
  world: Vector3;
  up: Vector3;
  born: number;
  el: HTMLDivElement;
}

export const POPUP_LIFE = 1.6;
export const popups: Popup[] = [];
export const popupLayer: { el: HTMLDivElement | null } = { el: null };

export function addPopup(text: string, color: string, world: Vector3, up: Vector3, big = false): void {
  const layer = popupLayer.el;
  if (!layer) return;
  if (popups.length > 16) {
    const old = popups.shift();
    old?.el.remove();
  }
  const el = document.createElement("div");
  el.className = big ? "popup popup-big" : "popup";
  el.textContent = text;
  el.style.setProperty("--c", color);
  layer.appendChild(el);
  popups.push({ text, world: world.clone(), up: up.clone(), born: performance.now(), el });
}

export function clearPopups(): void {
  for (const p of popups) p.el.remove();
  popups.length = 0;
}
