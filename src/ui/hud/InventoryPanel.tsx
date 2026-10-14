import { ChevronDown, ChevronUp, Package } from "lucide-react";
import { ITEM_LIST } from "@/game/data/items";
import { getGame } from "@/game/session";
import { ItemIcon } from "../ItemIcon";
import { useUI } from "../store";

export function InventoryPanel() {
  useUI((s) => s.hudTick);
  const open = useUI((s) => s.inventoryOpen);
  const toggle = useUI((s) => s.toggleInventory);
  const game = getGame();
  const inv = game.planet.inventory;
  const cap = game.rt.storageCap;
  const items = ITEM_LIST.filter((i) => !i.uncapped && (inv[i.id] ?? 0) >= 1);
  return (
    <div className="glass inventory">
      <div className="inv-head">
        <div className="eyebrow">
          <Package size={13} /> Armazém da Sede
        </div>
        <button className="icon-btn" style={{ height: 26, minWidth: 26 }} onClick={toggle} aria-label="Expandir inventário">
          {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>
      {open && (
        <div className="inv-grid">
          {items.length === 0 && <span className="empty-note">Colete recursos para começar.</span>}
          {items.map((it) => {
            const q = Math.floor(inv[it.id] ?? 0);
            const full = q >= cap;
            return (
              <div key={it.id} className={`inv-item ${full ? "full" : ""}`} title={`${it.name} — ${q} / ${cap}`}>
                <ItemIcon id={it.id} size={26} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="qty">{q.toLocaleString("pt-BR")}</div>
                  <div className="name">{it.name}</div>
                  <div className="cap-bar">
                    <div style={{ width: `${Math.min(100, (q / cap) * 100)}%`, background: full ? "var(--orange)" : undefined }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
