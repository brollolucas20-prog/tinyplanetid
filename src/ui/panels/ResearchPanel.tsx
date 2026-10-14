import { Check, FlaskConical, Lock, X } from "lucide-react";
import { BUILDINGS } from "@/game/data/buildings";
import type { ItemId } from "@/game/data/items";
import { TECHS, TECH_MAP, type TechDef } from "@/game/data/research";
import { getGame } from "@/game/session";
import { fmtMoney } from "@/game/sim/game";
import { fmtNum } from "../common";
import { ItemIcon } from "../ItemIcon";
import { useUI } from "../store";

const COL_W = 178;
const COL_GAP = 34;
const ROW_H = 96;
const ROW_GAP = 12;
const LABEL_H = 26;

function techPos(t: TechDef) {
  return { x: (t.tier - 1) * (COL_W + COL_GAP), y: LABEL_H + ROW_GAP + t.row * (ROW_H + ROW_GAP) };
}

export function ResearchPanel() {
  useUI((s) => s.hudTick);
  const close = () => useUI.getState().setPanel(null);
  const game = getGame();
  const s = game.state;
  const rows = Math.max(...TECHS.map((t) => t.row)) + 1;
  const height = LABEL_H + ROW_GAP + rows * (ROW_H + ROW_GAP);
  const width = 5 * COL_W + 4 * COL_GAP;

  const state = (t: TechDef) =>
    s.researched.includes(t.id) ? "done" : t.requires.every((r) => s.researched.includes(r)) ? "available" : "locked";

  return (
    <div className="backdrop" onClick={close}>
      <div className="glass modal" style={{ width: "min(1180px, calc(100vw - 32px))" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="stat-icon" style={{ background: "rgba(167,139,250,0.18)", width: 42, height: 42 }}>
            <FlaskConical size={22} color="#c4b5fd" />
          </div>
          <div>
            <div className="modal-title">Árvore Tecnológica</div>
            <div className="modal-sub">
              {s.researched.length} de {TECHS.length} tecnologias · Laboratórios geram Pontos de Pesquisa
            </div>
          </div>
          <div className="spacer" />
          <span className="pill" style={{ color: "#c4b5fd" }}>
            <FlaskConical size={14} /> {fmtNum(s.rp)} PP
          </span>
          <span className="pill" style={{ color: "var(--gold)", marginRight: 34 }}>
            ${fmtMoney(s.money)}
          </span>
          <button className="close-x" onClick={close} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" style={{ overflowX: "auto" }}>
          <div style={{ position: "relative", width, height, margin: "0 auto" }}>
            <svg className="tree-lines" width={width} height={height}>
              {TECHS.flatMap((t) =>
                t.requires.map((r) => {
                  const a = techPos(TECH_MAP[r]);
                  const b = techPos(t);
                  const x1 = a.x + COL_W;
                  const y1 = a.y + ROW_H / 2;
                  const x2 = b.x;
                  const y2 = b.y + ROW_H / 2;
                  const st = state(t);
                  const color = st === "done" ? "#4ade80" : st === "available" ? "#a78bfa" : "rgba(255,255,255,0.14)";
                  return (
                    <path
                      key={`${r}-${t.id}`}
                      d={`M${x1},${y1} C${x1 + COL_GAP},${y1} ${x2 - COL_GAP},${y2} ${x2},${y2}`}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      strokeDasharray={st === "locked" ? "4 5" : undefined}
                    />
                  );
                }),
              )}
            </svg>
            {[1, 2, 3, 4, 5].map((tier) => (
              <div key={tier} className="tier-label" style={{ position: "absolute", left: (tier - 1) * (COL_W + COL_GAP), top: 0, width: COL_W }}>
                Era {["", "I", "II", "III", "IV", "V"][tier]}
              </div>
            ))}
            {TECHS.map((t) => {
              const st = state(t);
              const pos = techPos(t);
              const can = game.canResearch(t.id);
              const unlocks = [...(t.unlocks.buildings ?? []).map((b) => BUILDINGS[b].name)];
              return (
                <button
                  key={t.id}
                  className={`tech ${st}`}
                  style={{ position: "absolute", left: pos.x, top: pos.y, width: COL_W, height: ROW_H, overflow: "hidden" }}
                  onClick={() => st === "available" && game.research(t.id)}
                  title={`${t.description}${unlocks.length ? `\nDesbloqueia: ${unlocks.join(", ")}` : ""}${st === "available" && !can.ok ? `\n${can.reason}` : ""}`}
                >
                  <div className="tech-name">
                    {st === "done" ? <Check size={14} color="#4ade80" /> : st === "locked" ? <Lock size={13} color="#94a3b8" /> : <FlaskConical size={14} color="#c4b5fd" />}
                    {t.name}
                  </div>
                  <div className="tech-desc" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {t.description}
                  </div>
                  {st !== "done" && (
                    <div className="costs">
                      <span className={`cost money ${s.money < t.cost.money ? "lack" : ""}`}>${fmtMoney(t.cost.money)}</span>
                      {t.cost.research > 0 && (
                        <span className={`cost ${s.rp < t.cost.research ? "lack" : ""}`} style={{ color: s.rp < t.cost.research ? undefined : "#c4b5fd" }}>
                          <ItemIcon id="research" size={14} />
                          {t.cost.research}
                        </span>
                      )}
                      {t.cost.items &&
                        (Object.entries(t.cost.items) as [ItemId, number][]).map(([id, q]) => (
                          <span key={id} className={`cost ${(game.planet.inventory[id] ?? 0) < q ? "lack" : ""}`}>
                            <ItemIcon id={id} size={14} />
                            {q}
                          </span>
                        ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
