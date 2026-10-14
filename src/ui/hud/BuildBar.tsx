import { useState } from "react";
import { Cpu, Leaf, Lock, Pickaxe, RotateCw, Sparkles, Trash2, Truck, X, Zap } from "lucide-react";
import { BUILDABLE, BUILDINGS, CATEGORY_INFO, type BuildingCategory, type BuildingTypeId } from "@/game/data/buildings";
import { TECH_MAP } from "@/game/data/research";
import { getGame } from "@/game/session";
import { rotateGhostOrSelected } from "../actions";
import { BuildingArt, CostChips } from "../common";
import { useUI } from "../store";

const CATS: { id: BuildingCategory; icon: typeof Truck }[] = [
  { id: "logistics", icon: Truck },
  { id: "extraction", icon: Pickaxe },
  { id: "production", icon: Cpu },
  { id: "power", icon: Zap },
  { id: "environment", icon: Leaf },
  { id: "special", icon: Sparkles },
];

export function BuildBar() {
  useUI((s) => s.hudTick);
  const category = useUI((s) => s.category);
  const setCategory = useUI((s) => s.setCategory);
  const tool = useUI((s) => s.tool);
  const setTool = useUI((s) => s.setTool);
  const game = getGame();
  const [hover, setHover] = useState<BuildingTypeId | null>(null);

  const list = category ? BUILDABLE.filter((b) => BUILDINGS[b].category === category) : [];
  const pick = (type: BuildingTypeId) => {
    if (!game.isUnlocked(type)) {
      game.events.emit("sfx", { name: "error" });
      useUI.getState().toast({ title: "Tecnologia necessária", body: `Pesquise “${TECH_MAP[BUILDINGS[type].tech!].name}”.`, kind: "info" });
      return;
    }
    game.events.emit("sfx", { name: "click" });
    setTool(tool.kind === "build" && tool.type === type ? { kind: "none" } : { kind: "build", type });
  };

  const hovered = hover ? BUILDINGS[hover] : null;

  return (
    <div className="buildbar">
      {tool.kind !== "none" && (
        <div className="glass tool-chip">
          {tool.kind === "build" ? (
            <>
              <span>
                Construindo: <b>{BUILDINGS[tool.type].name}</b>
              </span>
              <span className="k">
                <kbd>R</kbd> girar · {tool.type === "road" ? "arraste para traçar · " : ""}
                <kbd>Esc</kbd> / botão direito cancela
              </span>
            </>
          ) : (
            <>
              <span style={{ color: "var(--red)" }}>
                <b>Modo demolição</b>
              </span>
              <span className="k">Clique num edifício · reembolso de 50%</span>
            </>
          )}
          <button className="icon-btn" style={{ height: 28, minWidth: 28 }} onClick={() => setTool({ kind: "none" })} aria-label="Cancelar">
            <X size={15} />
          </button>
        </div>
      )}

      {hovered && (
        <div className="glass" style={{ padding: "10px 14px", maxWidth: 420, fontSize: 13 }}>
          <div style={{ fontWeight: 800, marginBottom: 3 }}>{hovered.name}</div>
          <div style={{ color: "var(--muted)" }}>{hovered.description}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12 }}>
            {hovered.power > 0 && <span style={{ color: "#fca5a5" }}>⚡ consome {hovered.power} MW</span>}
            {hovered.powerGen ? <span style={{ color: "#86efac" }}>⚡ gera {hovered.powerGen} MW</span> : null}
            {hovered.pollution > 0 && <span style={{ color: "#fcd34d" }}>☁ polui {hovered.pollution}/s</span>}
            {hovered.absorbs ? <span style={{ color: "#86efac" }}>🌿 limpa o ar</span> : null}
          </div>
        </div>
      )}

      {category && (
        <div className="glass tray">
          {list.map((type) => {
            const def = BUILDINGS[type];
            const unlocked = game.isUnlocked(type);
            const selected = tool.kind === "build" && tool.type === type;
            return (
              <button
                key={type}
                className={`bcard ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}`}
                onClick={() => pick(type)}
                onMouseEnter={() => setHover(type)}
                onMouseLeave={() => setHover(null)}
              >
                {def.hotkey && <span className="hotkey">{def.hotkey}</span>}
                <BuildingArt type={type} />
                <div className="bcard-name">{def.name}</div>
                {unlocked ? (
                  <CostChips cost={def.cost} inv={game.planet.inventory} money={game.state.money} />
                ) : (
                  <span className="lock-note">
                    <Lock size={11} /> {TECH_MAP[def.tech!].name}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="glass cats">
        {CATS.map(({ id, icon: Icon }) => {
          const info = CATEGORY_INFO[id];
          return (
            <button
              key={id}
              className={`cat ${category === id ? "active" : ""}`}
              onClick={() => {
                game.events.emit("sfx", { name: "click" });
                setCategory(category === id ? null : id);
              }}
            >
              <span className="cat-dot" style={{ background: `${info.color}33`, color: info.color }}>
                <Icon size={17} />
              </span>
              <span className="lbl">{info.name}</span>
            </button>
          );
        })}
        <div className="divider" />
        <button
          className={`cat ${tool.kind === "demolish" ? "active" : ""}`}
          onClick={() => setTool(tool.kind === "demolish" ? { kind: "none" } : { kind: "demolish" })}
          title="Demolir (X)"
        >
          <span className="cat-dot" style={{ background: "rgba(248,113,113,0.18)", color: "#f87171" }}>
            <Trash2 size={17} />
          </span>
        </button>
        {tool.kind === "build" && (
          <button className="cat" onClick={rotateGhostOrSelected} title="Girar (R)">
            <span className="cat-dot" style={{ background: "rgba(255,255,255,0.08)" }}>
              <RotateCw size={17} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
