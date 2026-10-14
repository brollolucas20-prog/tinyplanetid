import {
  ChartBar,
  CircleHelp,
  CloudFog,
  Coins,
  FastForward,
  FlaskConical,
  Globe,
  Pause,
  Play,
  Settings,
  Store,
  Zap,
} from "lucide-react";
import { PLANET_MAP } from "@/game/data/planets";
import { xpForLevel } from "@/game/data/quests";
import { getGame } from "@/game/session";
import { civTitle, fmtMoney } from "@/game/sim/game";
import { useUI } from "../store";
import { fmtNum } from "../common";

export function TopBar() {
  useUI((s) => s.hudTick);
  const panel = useUI((s) => s.panel);
  const togglePanel = useUI((s) => s.togglePanel);
  const game = getGame();
  const s = game.state;
  const rt = game.rt;
  const def = PLANET_MAP[s.activePlanet];
  const lvlStart = xpForLevel(s.level);
  const lvlEnd = xpForLevel(s.level + 1);
  const lvlPct = Math.min(1, (s.xp - lvlStart) / Math.max(1, lvlEnd - lvlStart));
  const { gen, demand, ratio } = rt.power;
  const powerColor = ratio >= 0.999 ? "#4ade80" : ratio > 0.6 ? "#facc15" : "#f87171";
  const pol = rt.pollutionIndex;
  const polColor = pol < 0.3 ? "#4ade80" : pol < 0.6 ? "#facc15" : "#f87171";
  const speed = s.settings.speed;
  const setSpeed = (v: number) => {
    s.settings.speed = v;
    game.events.emit("sfx", { name: "click" });
    useUI.getState().bumpHud();
  };
  const circ = 2 * Math.PI * 22;

  return (
    <div className="topbar">
      <div className="glass brand">
        <div
          className="brand-planet"
          style={
            {
              background: `radial-gradient(circle at 32% 28%, ${def.palette.grass}, ${def.palette.forest} 45%, ${def.palette.ocean} 75%, ${def.palette.deep})`,
              "--planet-glow": def.atmosphere + "88",
            } as React.CSSProperties
          }
        >
          <svg className="level-ring" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="#ffd166"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${circ * lvlPct} ${circ}`}
              transform="rotate(-90 24 24)"
            />
          </svg>
          <span
            className="num"
            style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 15, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}
          >
            {s.level}
          </span>
        </div>
        <div className="brand-text">
          <span className="brand-title">{def.name}</span>
          <span className="brand-sub">
            {civTitle(s.level)} · {Math.floor(lvlPct * 100)}%
          </span>
        </div>
      </div>

      <div className="glass stats">
        <div className="stat" title="Dinheiro">
          <div className="stat-icon" style={{ background: "rgba(255,209,102,0.16)" }}>
            <Coins size={18} color="#ffd166" />
          </div>
          <div className="stat-body">
            <span className="stat-value num" style={{ color: "#ffe39a" }}>
              ${fmtMoney(s.money)}
            </span>
            <span className="stat-label">
              {game.revenueRate > 0.05 ? `+$${fmtMoney(game.revenueRate)}/s em vendas` : "Dinheiro"}
              {rt.fine > 0 ? ` · multa -$${fmtMoney(rt.fine)}/s` : ""}
            </span>
          </div>
        </div>
        <div className="stat" title="Pontos de Pesquisa">
          <div className="stat-icon" style={{ background: "rgba(167,139,250,0.16)" }}>
            <FlaskConical size={18} color="#c4b5fd" />
          </div>
          <div className="stat-body">
            <span className="stat-value num">{fmtNum(s.rp)}</span>
            <span className="stat-label">Pesquisa</span>
          </div>
        </div>
        <div className="stat" title={`Geração ${gen.toFixed(0)} MW · Consumo ${demand.toFixed(0)} MW`}>
          <div className="stat-icon" style={{ background: `${powerColor}22` }}>
            <Zap size={18} color={powerColor} />
          </div>
          <div className="stat-body">
            <span className="stat-value num">
              {demand.toFixed(0)}
              <span style={{ color: "var(--muted)", fontSize: 13 }}> / {gen.toFixed(0)} MW</span>
            </span>
            <div className="meter">
              <div style={{ width: `${Math.min(100, (demand / Math.max(1, gen)) * 100)}%`, background: powerColor }} />
            </div>
          </div>
        </div>
        <div className="stat" title="Poluição média do planeta">
          <div className="stat-icon" style={{ background: `${polColor}22` }}>
            <CloudFog size={18} color={polColor} />
          </div>
          <div className="stat-body">
            <span className="stat-value num">{Math.round(pol * 100)}%</span>
            <div className="meter">
              <div style={{ width: `${pol * 100}%`, background: polColor }} />
            </div>
          </div>
        </div>
      </div>

      <div className="spacer" />

      <div className="glass toolbar">
        <div className="speed-group">
          <button className={`icon-btn ${speed === 0 ? "active" : ""}`} onClick={() => setSpeed(speed === 0 ? 1 : 0)} title="Pausar (Espaço)">
            {speed === 0 ? <Play size={16} /> : <Pause size={16} />}
          </button>
          {[1, 2, 4].map((v) => (
            <button key={v} className={`icon-btn ${speed === v ? "active" : ""}`} onClick={() => setSpeed(v)} title={`Velocidade ${v}×`}>
              {v === 1 ? <Play size={14} /> : <FastForward size={14} />}
              <span className="num" style={{ fontSize: 12 }}>
                {v}×
              </span>
            </button>
          ))}
        </div>
        <div className="divider" />
        <button className={`icon-btn ${panel === "market" ? "active" : ""}`} onClick={() => togglePanel("market")} title="Mercado (M)">
          <Store size={17} /> <span className="lbl">Mercado</span>
        </button>
        <button className={`icon-btn ${panel === "research" ? "active" : ""}`} onClick={() => togglePanel("research")} title="Pesquisa (T)">
          <FlaskConical size={17} /> <span className="lbl">Pesquisa</span>
        </button>
        <button className={`icon-btn ${panel === "planets" ? "active" : ""}`} onClick={() => togglePanel("planets")} title="Planetas (P)">
          <Globe size={17} /> <span className="lbl">Planetas</span>
        </button>
        <button className={`icon-btn ${panel === "stats" ? "active" : ""}`} onClick={() => togglePanel("stats")} title="Estatísticas">
          <ChartBar size={17} />
        </button>
        <button className={`icon-btn ${panel === "help" ? "active" : ""}`} onClick={() => togglePanel("help")} title="Como jogar (H)">
          <CircleHelp size={17} />
        </button>
        <button className={`icon-btn ${panel === "settings" ? "active" : ""}`} onClick={() => togglePanel("settings")} title="Configurações (Esc)">
          <Settings size={17} />
        </button>
      </div>
    </div>
  );
}
