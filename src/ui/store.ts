import { create } from "zustand";
import type { BuildingCategory, BuildingTypeId } from "@/game/data/buildings";
import type { CelebrationKind } from "@/game/sim/types";

export type Tool = { kind: "none" } | { kind: "build"; type: BuildingTypeId } | { kind: "demolish" };
export type Panel = "market" | "research" | "planets" | "settings" | "help" | "stats" | null;

export interface Celebration {
  id: number;
  kind: CelebrationKind;
  title: string;
  subtitle: string;
  color: string;
}

export interface Toast {
  id: number;
  title: string;
  body?: string;
  kind: "info" | "success" | "warning" | "error";
}

interface UIState {
  screen: "title" | "game";
  /** Incrementa ~5×/s para atualizar o HUD. */
  hudTick: number;
  tool: Tool;
  selected: number | null;
  hoverTile: number;
  panel: Panel;
  category: BuildingCategory | null;
  celebrations: Celebration[];
  toasts: Toast[];
  regionPrompt: number | null;
  inventoryOpen: boolean;
  setScreen: (s: UIState["screen"]) => void;
  bumpHud: () => void;
  setTool: (t: Tool) => void;
  select: (id: number | null) => void;
  setHover: (tile: number) => void;
  setPanel: (p: Panel) => void;
  togglePanel: (p: Exclude<Panel, null>) => void;
  setCategory: (c: BuildingCategory | null) => void;
  celebrate: (c: Omit<Celebration, "id">) => void;
  popCelebration: () => void;
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  setRegionPrompt: (r: number | null) => void;
  toggleInventory: () => void;
}

let uid = 1;

export const useUI = create<UIState>((set) => ({
  screen: "title",
  hudTick: 0,
  tool: { kind: "none" },
  selected: null,
  hoverTile: -1,
  panel: null,
  category: null,
  celebrations: [],
  toasts: [],
  regionPrompt: null,
  inventoryOpen: true,
  setScreen: (screen) => set({ screen }),
  bumpHud: () => set((s) => ({ hudTick: s.hudTick + 1 })),
  setTool: (tool) => set((s) => ({ tool, selected: tool.kind === "none" ? s.selected : null })),
  select: (selected) => set({ selected }),
  setHover: (hoverTile) => set({ hoverTile }),
  setPanel: (panel) => set({ panel }),
  togglePanel: (p) => set((s) => ({ panel: s.panel === p ? null : p })),
  setCategory: (category) => set({ category }),
  celebrate: (c) =>
    set((s) => ({ celebrations: s.celebrations.length > 4 ? s.celebrations : [...s.celebrations, { ...c, id: uid++ }] })),
  popCelebration: () => set((s) => ({ celebrations: s.celebrations.slice(1) })),
  toast: (t) =>
    set((s) => {
      // evita repetir o mesmo aviso em sequência
      if (s.toasts.some((x) => x.title === t.title)) return s;
      return { toasts: [...s.toasts.slice(-3), { ...t, id: uid++ }] };
    }),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setRegionPrompt: (regionPrompt) => set({ regionPrompt }),
  toggleInventory: () => set((s) => ({ inventoryOpen: !s.inventoryOpen })),
}));

// Depuração (somente em desenvolvimento)
if (import.meta.env.DEV) (window as unknown as { __tpiUI: typeof useUI }).__tpiUI = useUI;
