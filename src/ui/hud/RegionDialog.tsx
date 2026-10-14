import { Map as MapIcon, X } from "lucide-react";
import { ITEMS, type DepositKind } from "@/game/data/items";
import { getGame } from "@/game/session";
import { fmtMoney } from "@/game/sim/game";
import { ItemIcon } from "../ItemIcon";
import { useUI } from "../store";

export function RegionDialog() {
  useUI((s) => s.hudTick);
  const regionId = useUI((s) => s.regionPrompt);
  const close = () => useUI.getState().setRegionPrompt(null);
  if (regionId == null) return null;
  const game = getGame();
  const world = game.world;
  const reg = world.regions[regionId];
  const price = game.regionPrice(regionId);
  const deposits = new Map<DepositKind, number>();
  let land = 0;
  let trees = 0;
  for (const t of reg.tiles) {
    const info = world.tiles[t];
    if (info.level >= 0) land++;
    trees += game.planet.trees[t];
    if (info.deposit && game.planet.deposit[t] > 0) deposits.set(info.deposit, (deposits.get(info.deposit) ?? 0) + game.planet.deposit[t]);
  }
  const can = game.state.money >= price;
  return (
    <div className="backdrop" onClick={close}>
      <div className="glass modal narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="stat-icon" style={{ background: "rgba(255,209,102,0.16)", width: 42, height: 42 }}>
            <MapIcon size={22} color="#ffd166" />
          </div>
          <div>
            <div className="modal-title">{reg.name}</div>
            <div className="modal-sub">Região disponível para expansão</div>
          </div>
          <button className="close-x" onClick={close} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="kv">
            <span>Tiles de terra</span>
            <span className="num">
              {land} / {reg.tiles.length}
            </span>
          </div>
          <div className="kv">
            <span>Árvores</span>
            <span className="num">{trees}</span>
          </div>
          <div className="insp-label" style={{ marginTop: 12 }}>
            <span>Depósitos</span>
          </div>
          {deposits.size === 0 ? (
            <span className="empty-note">Nenhum depósito mineral visível.</span>
          ) : (
            <div className="buffers">
              {[...deposits.entries()].map(([k, v]) => (
                <span key={k} className="buf" title={ITEMS[k].name}>
                  <ItemIcon id={k} size={18} /> {Math.round(v).toLocaleString("pt-BR")}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={close}>
            Agora não
          </button>
          <button
            className="btn primary"
            disabled={!can}
            onClick={() => {
              if (game.buyRegion(regionId)) close();
            }}
          >
            Comprar por ${fmtMoney(price)}
          </button>
        </div>
      </div>
    </div>
  );
}
