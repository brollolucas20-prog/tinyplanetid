import { CircleArrowUp, Hand, Pause, Play, Rocket, RotateCw, Trash2, Truck, X } from "lucide-react";
import { BUILDINGS, LEVELS } from "@/game/data/buildings";
import { ITEMS, type ItemId } from "@/game/data/items";
import { RECIPES } from "@/game/data/recipes";
import { TECH_MAP } from "@/game/data/research";
import { getGame } from "@/game/session";
import { invTotal } from "@/game/sim/inventory";
import { BuildingArt, CostChips, InvList, StatusChip, fmtMoney } from "../common";
import { ItemIcon } from "../ItemIcon";
import { useUI } from "../store";

export function Inspector() {
  useUI((s) => s.hudTick);
  const selected = useUI((s) => s.selected);
  const select = useUI((s) => s.select);
  const game = getGame();
  if (selected == null) return null;
  const b = game.rt.byId.get(selected);
  if (!b) return null;
  const def = BUILDINGS[b.type];
  const rt = game.rt;
  const link = rt.links.get(b.id);
  const lv = LEVELS[b.level - 1];
  const upCost = game.upgradeCost(b);
  const inv = game.planet.inventory;
  const deposit = game.world.tiles[b.tile].deposit;

  if (b.type === "hq") {
    const buildings = game.planet.buildings.filter((x) => x.type !== "road" && x.type !== "hq");
    const working = buildings.filter((x) => x.status === "working").length;
    return (
      <div className="glass inspector">
        <div className="insp-head">
          <div className="insp-art" style={{ width: 52 }}>
            <BuildingArt type="hq" size={52} />
          </div>
          <div>
            <div className="insp-title">{def.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Centro da colônia</div>
          </div>
          <button className="close-x" onClick={() => select(null)} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="insp-section" style={{ fontSize: 13, color: "#cdd6ee" }}>
          {def.description}
        </div>
        <div className="insp-section">
          <div className="kv">
            <span>Capacidade por item</span>
            <span className="num">{rt.storageCap}</span>
          </div>
          <div className="kv">
            <span>Energia base</span>
            <span className="num">+{def.powerGen} MW</span>
          </div>
          <div className="kv">
            <span>Edifícios ativos</span>
            <span className="num">
              {working} / {buildings.length}
            </span>
          </div>
          <div className="kv">
            <span>Conectados à rede</span>
            <span className="num">{rt.connectedCount}</span>
          </div>
          <div className="kv">
            <span>Caminhões em rota</span>
            <span className="num">{game.planet.trucks.length}</span>
          </div>
          <div className="kv">
            <span>Regiões</span>
            <span className="num">
              {game.planet.ownedRegions.length} / {game.world.regions.length}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const recipe = b.recipe ? RECIPES[b.recipe] : null;
  const genOut = rt.genOut.get(b.id) ?? 0;
  const linkText =
    !link || link.kind === "none"
      ? "Sem conexão"
      : link.kind === "drone"
        ? `Drones (${link.dist} tiles)`
        : `Estrada (${link.dist} tiles)`;

  return (
    <div className="glass inspector">
      <div className="insp-head">
        <div className="insp-art" style={{ width: 52 }}>
          <BuildingArt type={b.type} size={52} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="insp-title">
            {def.name}{" "}
            <span className="num" style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600 }}>
              Nv. {b.level}
            </span>
          </div>
          <StatusChip status={b.status} />
        </div>
        <button className="close-x" onClick={() => select(null)} aria-label="Fechar">
          <X size={16} />
        </button>
      </div>

      {(recipe || def.extractor || def.harvester || b.type === "nursery") && (
        <div className="insp-section">
          <div className="insp-label">
            <span>Progresso</span>
            <span className="num">{Math.round(b.progress * 100)}%</span>
          </div>
          <div className="progress" style={{ marginTop: 0 }}>
            <div style={{ width: `${Math.min(100, b.progress * 100)}%`, transition: "width 0.2s linear" }} />
          </div>
          {def.extractor && deposit && (
            <div className="kv" style={{ marginTop: 8 }}>
              <span>Depósito</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <ItemIcon id={deposit} size={16} />
                <span className="num">{Math.floor(game.planet.deposit[b.tile]).toLocaleString("pt-BR")} restantes</span>
              </span>
            </div>
          )}
          {def.extractor && (
            <div className="kv">
              <span>Ritmo</span>
              <span className="num">{((lv.speed * game.mods.minerSpeed) / def.extractor.time).toFixed(2)} /s</span>
            </div>
          )}
          {def.harvester && (
            <div className="kv" style={{ marginTop: 8 }}>
              <span>Ritmo</span>
              <span className="num">
                {((def.harvester.yield * lv.speed * game.mods.harvestSpeed) / def.harvester.time).toFixed(2)} madeira/s
              </span>
            </div>
          )}
        </div>
      )}

      {def.recipes && b.type !== "rocketPad" && (
        <div className="insp-section">
          <div className="insp-label">
            <span>Receita</span>
          </div>
          <div className="recipe-list">
            {def.recipes.map((rid) => {
              const r = RECIPES[rid];
              const unlocked = game.recipeUnlocked(rid);
              return (
                <button
                  key={rid}
                  className={`recipe ${b.recipe === rid ? "on" : ""}`}
                  disabled={!unlocked}
                  onClick={() => game.setRecipe(b.id, rid)}
                  title={unlocked ? `${r.time}s por ciclo` : `Requer ${TECH_MAP[r.tech!].name}`}
                >
                  {(Object.entries(r.inputs) as [ItemId, number][]).map(([id, q]) => (
                    <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 2 }} className="num">
                      {q}
                      <ItemIcon id={id} size={17} />
                    </span>
                  ))}
                  <span className="arrow">→</span>
                  {(Object.entries(r.outputs) as [ItemId, number][]).map(([id, q]) => (
                    <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 2 }} className="num">
                      {q}
                      <ItemIcon id={id} size={17} />
                    </span>
                  ))}
                  <span className="rname">{unlocked ? r.name : `🔒 ${TECH_MAP[r.tech!].name}`}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {b.type === "rocketPad" && recipe && (
        <div className="insp-section">
          <div className="insp-label">
            <span>Componentes do foguete</span>
          </div>
          {(Object.entries(recipe.inputs) as [ItemId, number][]).map(([id, q]) => {
            const have = b.rocketReady || b.progress > 0 ? q : Math.min(q, b.input[id] ?? 0);
            return (
              <div key={id} style={{ marginBottom: 6 }}>
                <div className="kv">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <ItemIcon id={id} size={16} /> {ITEMS[id].name}
                  </span>
                  <span className="num">
                    {Math.floor(have)} / {q}
                  </span>
                </div>
                <div className="progress" style={{ marginTop: 2, height: 5 }}>
                  <div style={{ width: `${(have / q) * 100}%` }} />
                </div>
              </div>
            );
          })}
          <button className="btn green big" style={{ width: "100%", marginTop: 8 }} disabled={!b.rocketReady} onClick={() => game.launchRocket(b.id)}>
            <Rocket size={18} /> {b.rocketReady ? "Lançar foguete!" : b.progress > 0 ? `Montando… ${Math.round(b.progress * 100)}%` : "Aguardando componentes"}
          </button>
        </div>
      )}

      <div className="insp-section">
        {b.type !== "rocketPad" && (recipe || def.fuel) && (
          <>
            <div className="insp-label">
              <span>Entrada</span>
            </div>
            <InvList inv={b.input} />
          </>
        )}
        {(recipe || def.extractor || def.harvester) && b.type !== "rocketPad" && (
          <>
            <div className="insp-label" style={{ marginTop: 10 }}>
              <span>Saída</span>
              <span className="num">
                {Math.floor(invTotal(b.output))} / {game.outputCap(b)}
              </span>
            </div>
            <InvList inv={b.output} />
          </>
        )}
        <div style={{ marginTop: 10 }}>
          <div className="kv">
            <span>Logística</span>
            <span style={{ color: link && link.kind !== "none" ? "var(--green)" : "var(--orange)", display: "inline-flex", gap: 5, alignItems: "center" }}>
              <Truck size={14} /> {linkText}
            </span>
          </div>
          {def.power > 0 && (
            <div className="kv">
              <span>Consumo</span>
              <span className="num">{(def.power * lv.power).toFixed(1)} MW</span>
            </div>
          )}
          {def.powerGen ? (
            <div className="kv">
              <span>Geração atual</span>
              <span className="num" style={{ color: "var(--green)" }}>
                {genOut.toFixed(1)} MW
              </span>
            </div>
          ) : null}
          {def.fuel && (
            <div className="kv">
              <span>Combustível</span>
              <span>
                {Object.keys(def.fuel)
                  .map((f) => ITEMS[f as ItemId].name)
                  .join(" ou ")}
              </span>
            </div>
          )}
          {def.pollution > 0 && (
            <div className="kv">
              <span>Poluição</span>
              <span className="num" style={{ color: "#fcd34d" }}>
                {(def.pollution * game.mods.pollution * lv.power).toFixed(2)}/s
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="insp-section">
        {upCost && (
          <div style={{ marginBottom: 8 }}>
            <button className="btn primary" style={{ width: "100%" }} disabled={!game.canAfford(upCost)} onClick={() => game.upgrade(b.id)}>
              <CircleArrowUp size={17} /> Melhorar para Nv. {b.level + 1} (+{Math.round((LEVELS[b.level].speed / lv.speed - 1) * 100)}% velocidade)
            </button>
            <div style={{ marginTop: 6 }}>
              <CostChips cost={upCost} inv={inv} money={game.state.money} />
            </div>
          </div>
        )}
        {!upCost && b.level < 3 && b.type !== "road" && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Pesquise Otimização para o nível 3.</div>
        )}
        <div className="actions">
          {invTotal(b.output) >= 1 && (!link || link.kind === "none") && (
            <button className="btn" onClick={() => game.collectFrom(b.id)}>
              <Hand size={15} /> Coletar
            </button>
          )}
          {(recipe || def.fuel) && b.type !== "rocketPad" && (
            <button className="btn" onClick={() => game.supply(b.id)} title="Leva insumos da Sede manualmente">
              <Truck size={15} /> Abastecer
            </button>
          )}
          <button className="btn icon-only" onClick={() => game.toggle(b.id)} title={b.enabled ? "Pausar" : "Retomar"} aria-label={b.enabled ? "Pausar" : "Retomar"}>
            {b.enabled ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button className="btn icon-only" onClick={() => game.rotate(b.id)} title="Girar (R)" aria-label="Girar">
            <RotateCw size={15} />
          </button>
          <button
            className="btn danger icon-only"
            title={`Demolir — reembolso de $${fmtMoney(def.cost.money * 0.5)} e metade dos materiais`}
            aria-label="Demolir"
            onClick={() => {
              game.demolish(b.id);
              select(null);
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
