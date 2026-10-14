import {
  Atom,
  Axe,
  Building2,
  Cog,
  Factory,
  Fan,
  Flame,
  FlaskConical,
  Hammer,
  House,
  Pickaxe,
  Rocket,
  Route,
  SatelliteDish,
  Sprout,
  Sun,
  Warehouse,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { BUILDINGS, CATEGORY_INFO, type BuildingCost, type BuildingTypeId } from "@/game/data/buildings";
import { ITEMS, type Inventory, type ItemId } from "@/game/data/items";
import { fmtMoney } from "@/game/sim/game";
import type { BuildingStatus } from "@/game/sim/types";
import { ItemIcon } from "./ItemIcon";

export const BUILDING_ICONS: Record<BuildingTypeId, LucideIcon> = {
  hq: House,
  road: Route,
  warehouse: Warehouse,
  droneHub: SatelliteDish,
  woodcutter: Axe,
  miner: Pickaxe,
  sawmill: Hammer,
  smelter: Flame,
  assembler: Cog,
  factory: Factory,
  lab: FlaskConical,
  biomassGen: Zap,
  coalGen: Building2,
  windTurbine: Wind,
  solarPanel: Sun,
  fusion: Atom,
  nursery: Sprout,
  purifier: Fan,
  rocketPad: Rocket,
};

export function BuildingArt({ type, size = 54, iconSize = 26 }: { type: BuildingTypeId; size?: number; iconSize?: number }) {
  const def = BUILDINGS[type];
  const color = CATEGORY_INFO[def.category].color;
  const Icon = BUILDING_ICONS[type];
  return (
    <div
      className="bcard-art"
      style={{
        height: size,
        width: "100%",
        background: `radial-gradient(circle at 30% 25%, ${color}cc, ${color}55 55%, ${color}22)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2)`,
      }}
    >
      <Icon size={iconSize} strokeWidth={2.2} color="#fff" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.35))" }} />
    </div>
  );
}

export function fmtNum(v: number): string {
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(".", ",") + " mi";
  if (v >= 1e4) return (v / 1e3).toFixed(1).replace(".", ",") + " mil";
  return Math.floor(v).toLocaleString("pt-BR");
}

export { fmtMoney };

export function CostChips({ cost, inv, money }: { cost: BuildingCost; inv: Inventory; money: number }) {
  return (
    <div className="costs">
      {cost.money > 0 && <span className={`cost money ${money < cost.money ? "lack" : ""}`}>${fmtMoney(cost.money)}</span>}
      {(Object.entries(cost.items) as [ItemId, number][]).map(([id, q]) => (
        <span key={id} className={`cost ${(inv[id] ?? 0) < q ? "lack" : ""}`} title={ITEMS[id].name}>
          <ItemIcon id={id} size={15} />
          {q}
        </span>
      ))}
    </div>
  );
}

export const STATUS_INFO: Record<BuildingStatus, { label: string; color: string; bg: string }> = {
  working: { label: "Trabalhando", color: "#86efac", bg: "rgba(34,197,94,0.15)" },
  idle: { label: "Operacional", color: "#cbd5e1", bg: "rgba(148,163,184,0.15)" },
  noInput: { label: "Aguardando insumos", color: "#fcd34d", bg: "rgba(245,158,11,0.15)" },
  noPower: { label: "Energia insuficiente", color: "#fca5a5", bg: "rgba(239,68,68,0.16)" },
  outputFull: { label: "Saída cheia", color: "#93c5fd", bg: "rgba(59,130,246,0.15)" },
  storageFull: { label: "Armazém da Sede cheio", color: "#93c5fd", bg: "rgba(59,130,246,0.15)" },
  noConnection: { label: "Sem estrada até a Sede", color: "#fdba74", bg: "rgba(249,115,22,0.16)" },
  noDeposit: { label: "Depósito esgotado", color: "#d1d5db", bg: "rgba(107,114,128,0.2)" },
  noTrees: { label: "Sem árvores por perto", color: "#bef264", bg: "rgba(101,163,13,0.16)" },
  noFuel: { label: "Sem combustível", color: "#d6d3d1", bg: "rgba(120,113,108,0.2)" },
  paused: { label: "Pausado", color: "#cbd5e1", bg: "rgba(100,116,139,0.2)" },
  ready: { label: "Foguete pronto!", color: "#86efac", bg: "rgba(34,197,94,0.2)" },
  noRecipe: { label: "Escolha uma receita", color: "#d8b4fe", bg: "rgba(168,85,247,0.16)" },
};

export function StatusChip({ status }: { status: BuildingStatus }) {
  const s = STATUS_INFO[status];
  return (
    <span className="chip" style={{ color: s.color, background: s.bg }}>
      <span style={{ width: 7, height: 7, borderRadius: 9, background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button className={`toggle ${on ? "on" : ""}`} onClick={() => onChange(!on)} aria-pressed={on} aria-label={label} />
  );
}

export function Sparkline({ values, width = 90, height = 26, color = "#60a5fa" }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 3 - ((v - min) / span) * (height - 6)}`);
  const last = pts[pts.length - 1].split(",");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={`0,${height} ${pts.join(" ")} ${width},${height}`} fill={`${color}22`} stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  );
}

export function InvList({ inv }: { inv: Inventory }) {
  const entries = (Object.entries(inv) as [ItemId, number][]).filter(([, q]) => q >= 0.5);
  if (!entries.length) return <span className="empty-note">vazio</span>;
  return (
    <div className="buffers">
      {entries.map(([id, q]) => (
        <span key={id} className="buf" title={ITEMS[id].name}>
          <ItemIcon id={id} size={18} />
          {Math.floor(q)}
        </span>
      ))}
    </div>
  );
}
