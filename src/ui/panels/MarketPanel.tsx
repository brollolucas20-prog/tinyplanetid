import { Minus, Plus, Store, TrendingDown, TrendingUp, X } from "lucide-react";
import { ITEMS, SELLABLE_ITEMS } from "@/game/data/items";
import { getGame } from "@/game/session";
import { fmtMoney } from "@/game/sim/game";
import { Sparkline, Toggle } from "../common";
import { ItemIcon } from "../ItemIcon";
import { useUI } from "../store";

export function MarketPanel() {
  useUI((s) => s.hudTick);
  const close = () => useUI.getState().setPanel(null);
  const game = getGame();
  const inv = game.planet.inventory;
  const items = SELLABLE_ITEMS.filter((id) => (inv[id] ?? 0) >= 1 || game.state.market[id]?.auto || (game.state.counters.produced[id] ?? 0) > 0 || (game.state.counters.collected[id] ?? 0) > 0);
  const totalValue = items.reduce((s, id) => s + Math.floor(inv[id] ?? 0) * game.price(id), 0);

  return (
    <div className="backdrop" onClick={close}>
      <div className="glass modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="stat-icon" style={{ background: "rgba(255,209,102,0.16)", width: 42, height: 42 }}>
            <Store size={22} color="#ffd166" />
          </div>
          <div>
            <div className="modal-title">Mercado Interplanetário</div>
            <div className="modal-sub">Preços flutuam com a demanda: vender muito de um item derruba o preço temporariamente.</div>
          </div>
          <div className="spacer" />
          <span className="pill" style={{ color: "var(--gold)" }}>
            Estoque vale ${fmtMoney(totalValue)}
          </span>
          <span className="pill" style={{ color: "var(--green)", marginRight: 34 }}>
            +${fmtMoney(game.revenueRate)}/s
          </span>
          <button className="close-x" onClick={close} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          {items.length === 0 ? (
            <div className="empty-note" style={{ padding: 20, textAlign: "center" }}>
              Nada para vender ainda. Colete ou produza recursos!
            </div>
          ) : (
            <div className="market-table">
              <div className="mrow head">
                <span>Item</span>
                <span>Estoque</span>
                <span>Preço</span>
                <span>Tendência</span>
                <span>Vender</span>
                <span>Venda automática</span>
              </div>
              {items.map((id) => {
                const it = ITEMS[id];
                const price = game.price(id);
                const hist = game.priceHistory[id] ?? [];
                const ref = hist.length > 1 ? hist[Math.max(0, hist.length - 8)] : price;
                const delta = (price - ref) / Math.max(0.01, ref);
                const entry = game.state.market[id] ?? { mult: 1, auto: false, keep: 50 };
                const have = Math.floor(inv[id] ?? 0);
                return (
                  <div key={id} className="mrow">
                    <span className="item">
                      <ItemIcon id={id} size={28} />
                      {it.name}
                    </span>
                    <span className="num">{have.toLocaleString("pt-BR")}</span>
                    <span className="num" style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                      <span style={{ color: "var(--gold)", fontWeight: 700 }}>${price.toFixed(price < 10 ? 2 : 1).replace(".", ",")}</span>
                      <span className={delta >= 0 ? "price-up" : "price-down"} style={{ fontSize: 11, display: "inline-flex", gap: 3, alignItems: "center" }}>
                        {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {(delta * 100).toFixed(1).replace(".", ",")}%
                      </span>
                    </span>
                    <span>
                      <Sparkline values={[...hist, price]} color={delta >= 0 ? "#4ade80" : "#f87171"} />
                    </span>
                    <span className="mini-btns">
                      <button className="btn" disabled={have < 1} onClick={() => game.sell(id, 10)}>
                        10
                      </button>
                      <button className="btn" disabled={have < 1} onClick={() => game.sell(id, 100)}>
                        100
                      </button>
                      <button className="btn primary" disabled={have < 1} onClick={() => game.sell(id, have)}>
                        Tudo
                      </button>
                    </span>
                    <span className="auto">
                      <Toggle on={entry.auto} onChange={(v) => { game.setAutoSell(id, v); game.events.emit("sfx", { name: "click" }); useUI.getState().bumpHud(); }} label={`Venda automática de ${it.name}`} />
                      <span style={{ color: "var(--muted)" }}>manter</span>
                      <span className="stepper">
                        <button onClick={() => { game.setAutoSell(id, entry.auto, Math.max(0, entry.keep - 25)); useUI.getState().bumpHud(); }} aria-label="Menos">
                          <Minus size={12} />
                        </button>
                        <span>{entry.keep}</span>
                        <button onClick={() => { game.setAutoSell(id, entry.auto, entry.keep + 25); useUI.getState().bumpHud(); }} aria-label="Mais">
                          <Plus size={12} />
                        </button>
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
