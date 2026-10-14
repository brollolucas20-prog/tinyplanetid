import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { BUILDINGS } from "@/game/data/buildings";
import { ITEMS } from "@/game/data/items";
import type { Biome } from "@/game/data/planets";
import { cursor, getGame } from "@/game/session";
import { fmtMoney } from "@/game/sim/game";
import { ItemIcon } from "../ItemIcon";
import { useUI } from "../store";

const BIOME_NAMES: Record<Biome, string> = {
  deep: "Oceano profundo",
  ocean: "Águas rasas",
  beach: "Praia",
  grass: "Campo",
  forest: "Floresta",
  dry: "Terra seca",
  rock: "Montanha",
  snow: "Neve",
};

/** Informações do tile sob o mouse, seguindo o cursor. */
export function HoverTooltip() {
  useUI((s) => s.hudTick);
  const tile = useUI((s) => s.hoverTile);
  const tool = useUI((s) => s.tool);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = ref.current;
      if (el) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        let x = cursor.screenX + 18;
        let y = cursor.screenY + 18;
        if (x + w > window.innerWidth - 8) x = cursor.screenX - w - 14;
        if (y + h > window.innerHeight - 8) y = cursor.screenY - h - 14;
        el.style.transform = `translate(${x}px, ${y}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (tile < 0) return null;
  const game = getGame();
  const world = game.world;
  const t = world.tiles[tile];
  const rt = game.rt;
  const ps = game.planet;
  const region = world.regions[t.region];
  const owned = !!rt.owned[t.region];
  const bid = rt.tileBuilding[tile];
  const b = bid >= 0 ? rt.byId.get(bid) : undefined;
  const check = tool.kind === "build" ? game.checkPlace(tool.type, tile) : null;
  const pol = ps.pollution[tile];

  return (
    <div ref={ref} className="glass tooltip" style={{ left: 0, top: 0 }}>
      <div className="t-title">
        {b ? BUILDINGS[b.type].name : BIOME_NAMES[t.biome]}
        {t.level > 0 && !b && <span style={{ color: "var(--faint)", fontWeight: 600 }}>· altitude {t.level}</span>}
      </div>
      <div className="t-row">
        <MapPin size={12} /> {region.name}
        {!owned && <span style={{ color: "var(--gold)" }}>· bloqueada</span>}
      </div>
      {t.deposit && ps.deposit[tile] > 0 && (
        <div className="t-row">
          <ItemIcon id={t.deposit} size={15} /> {ITEMS[t.deposit].name}: {Math.floor(ps.deposit[tile]).toLocaleString("pt-BR")}
        </div>
      )}
      {ps.trees[tile] > 0 && !b && <div className="t-row">🌲 {ps.trees[tile]} árvore(s)</div>}
      {pol > 3 && <div className="t-row" style={{ color: pol > 45 ? "var(--red)" : "#fcd34d" }}>☁ poluição local {Math.round(pol)}%</div>}
      {!owned && tool.kind === "none" && (
        <div className={game.regionBuyable(t.region) ? "t-ok" : "t-warn"} style={{ color: game.regionBuyable(t.region) ? "var(--gold)" : undefined }}>
          {game.regionBuyable(t.region) ? `Clique para comprar · $${fmtMoney(game.regionPrice(t.region))}` : "Compre uma região vizinha antes"}
        </div>
      )}
      {tool.kind === "none" && owned && !b && game.harvestable(tile) && <div className="t-ok">Clique ou segure E para coletar</div>}
      {check && (check.ok ? <div className="t-ok">Clique para construir</div> : <div className="t-warn">{check.reason}</div>)}
    </div>
  );
}
