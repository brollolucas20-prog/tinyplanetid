import { useState } from "react";
import {
  ChartBar,
  CircleHelp,
  Globe,
  Hand,
  Keyboard,
  LogOut,
  MousePointer2,
  Music,
  RefreshCw,
  Rocket,
  Save,
  Settings,
  Sparkles,
  Sun,
  Truck,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { sound } from "@/audio/sound";
import { BUILDINGS } from "@/game/data/buildings";
import { ITEMS, ITEM_LIST } from "@/game/data/items";
import { PLANETS } from "@/game/data/planets";
import { getGame } from "@/game/session";
import { fmtMoney } from "@/game/sim/game";
import { Toggle, fmtNum } from "../common";
import { ItemIcon } from "../ItemIcon";
import { useUI } from "../store";

function ModalShell({
  icon,
  color,
  title,
  sub,
  size = "mid",
  children,
  onClose,
  foot,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  sub?: string;
  size?: "narrow" | "mid" | "wide";
  children: React.ReactNode;
  onClose: () => void;
  foot?: React.ReactNode;
}) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div className={`glass modal ${size === "wide" ? "" : size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="stat-icon" style={{ background: `${color}2a`, width: 42, height: 42, color }}>
            {icon}
          </div>
          <div>
            <div className="modal-title">{title}</div>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="close-x" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  );
}

const closePanel = () => useUI.getState().setPanel(null);

// ───────────────────────────── Planetas ─────────────────────────────
export function PlanetsPanel() {
  useUI((s) => s.hudTick);
  const game = getGame();
  const s = game.state;
  return (
    <ModalShell icon={<Globe size={22} />} color="#38bdf8" title="Sistema Planetário" sub="Lance foguetes para descobrir novos mundos com recursos exclusivos." size="wide" onClose={closePanel}>
      <div className="planets">
        {PLANETS.map((p) => {
          const known = s.discovered.includes(p.id);
          const current = s.activePlanet === p.id;
          const ps = s.planets[p.id];
          return (
            <div key={p.id} className={`planet-card ${current ? "current" : ""}`}>
              <div
                className={`planet-ball ${known ? "" : "unknown"}`}
                style={
                  {
                    background: `radial-gradient(circle at 34% 30%, ${p.palette.grass}, ${p.palette.forest} 40%, ${p.palette.ocean} 70%, ${p.palette.deep})`,
                    "--glow": p.atmosphere + "77",
                  } as React.CSSProperties
                }
              />
              <div className="modal-title" style={{ fontSize: 20 }}>
                {known ? p.name : "???"}
              </div>
              <div style={{ color: known ? p.atmosphere : "var(--faint)", fontWeight: 800, fontSize: 13 }}>{known ? p.subtitle : "Não descoberto"}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", minHeight: 54 }}>
                {known ? p.description : "Construa uma Plataforma de Lançamento e lance um foguete para revelar este planeta."}
              </div>
              {known && p.special && (
                <span className="pill">
                  <ItemIcon id={p.special} size={16} /> {ITEMS[p.special].name}
                </span>
              )}
              {known && ps && (
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {ps.buildings.length - 1} edifícios · {ps.ownedRegions.length} regiões
                </div>
              )}
              {current ? (
                <span className="pill" style={{ color: "var(--gold)" }}>
                  Você está aqui
                </span>
              ) : known ? (
                <button
                  className="btn primary"
                  onClick={() => {
                    game.travel(p.id);
                    useUI.getState().select(null);
                    closePanel();
                  }}
                >
                  <Rocket size={15} /> Viajar
                </button>
              ) : (
                <span className="pill" style={{ color: "var(--faint)" }}>
                  🔒 Bloqueado
                </span>
              )}
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}

// ───────────────────────────── Configurações ─────────────────────────────
export function SettingsPanel({ onQuit }: { onQuit: () => void }) {
  useUI((s) => s.hudTick);
  const game = getGame();
  const st = game.state.settings;
  const [confirmReset, setConfirmReset] = useState(false);
  const bump = () => useUI.getState().bumpHud();
  return (
    <ModalShell icon={<Settings size={22} />} color="#94a3b8" title="Configurações" size="narrow" onClose={closePanel}>
      <div className="settings-row">
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Music size={16} /> Música ambiente
        </span>
        <Toggle
          on={st.music}
          onChange={(v) => {
            st.music = v;
            sound.setMusic(v);
            bump();
          }}
        />
      </div>
      <div className="settings-row">
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Volume2 size={16} /> Efeitos sonoros
        </span>
        <Toggle
          on={st.sfx}
          onChange={(v) => {
            st.sfx = v;
            sound.setSfx(v);
            bump();
          }}
        />
      </div>
      <div className="settings-row">
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Sun size={16} /> Sombras (desligue em PCs mais fracos)
        </span>
        <Toggle
          on={st.shadows}
          onChange={(v) => {
            st.shadows = v;
            bump();
          }}
        />
      </div>
      <div className="settings-row" style={{ gap: 8 }}>
        <button
          className="btn"
          onClick={() => {
            game.save();
            useUI.getState().toast({ title: "Jogo salvo", kind: "success" });
          }}
        >
          <Save size={15} /> Salvar agora
        </button>
        <button className="btn" onClick={onQuit}>
          <LogOut size={15} /> Menu principal
        </button>
      </div>
      <div className="settings-row">
        {confirmReset ? (
          <>
            <span style={{ color: "var(--red)", fontWeight: 700 }}>Apagar todo o progresso?</span>
            <span style={{ display: "flex", gap: 6 }}>
              <button className="btn" onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  localStorage.removeItem("tiny-planet-industries/save-v1");
                  window.location.reload();
                }}
              >
                Apagar
              </button>
            </span>
          </>
        ) : (
          <button className="btn danger" onClick={() => setConfirmReset(true)}>
            <RefreshCw size={15} /> Reiniciar progresso
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 8 }}>O jogo salva automaticamente a cada 20 segundos.</div>
    </ModalShell>
  );
}

// ───────────────────────────── Ajuda ─────────────────────────────
export function HelpContent() {
  return (
    <div className="help-grid">
      <div>
        <h4>
          <Keyboard size={16} /> Controles
        </h4>
        <ul>
          <li>
            <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> andar · <kbd>Shift</kbd> correr (jetpack)
          </li>
          <li>
            <kbd>E</kbd> coletar recurso próximo (árvores, rochas, minérios)
          </li>
          <li>Arraste o mouse para girar a câmera · roda do mouse para zoom</li>
          <li>
            <kbd>Tab</kbd> visão do planeta inteiro · <kbd>Espaço</kbd> pausar
          </li>
          <li>
            <kbd>1</kbd>–<kbd>6</kbd> atalhos de construção · <kbd>R</kbd> girar · <kbd>X</kbd> demolir · <kbd>Esc</kbd> cancelar
          </li>
          <li>
            <kbd>M</kbd> mercado · <kbd>T</kbd> pesquisa · <kbd>P</kbd> planetas
          </li>
        </ul>
      </div>
      <div>
        <h4>
          <MousePointer2 size={16} /> Clique
        </h4>
        <ul>
          <li>Num recurso: o astronauta vai até lá e coleta sozinho.</li>
          <li>Num edifício: abre o painel com receitas, melhorias e status.</li>
          <li>Numa área escura: compra uma nova região do planeta.</li>
          <li>Estradas: escolha a ferramenta e arraste para traçar.</li>
        </ul>
      </div>
      <div>
        <h4>
          <Truck size={16} /> Logística
        </h4>
        <p>
          Edifícios precisam de uma <b>estrada até a Sede</b> (ou um Armazém). Caminhões levam a produção para o armazém e trazem insumos e
          combustível. Sem estrada, use os botões <b>Coletar</b> e <b>Abastecer</b> no painel do edifício.
        </p>
      </div>
      <div>
        <h4>
          <Zap size={16} /> Energia e poluição
        </h4>
        <p>
          Máquinas consomem energia; se faltar, tudo desacelera. Geradores queimam combustível e poluem. Poluição mata árvores, deixa o céu
          marrom e gera multas acima de 60% — use energia limpa, Viveiros e Purificadores.
        </p>
      </div>
      <div>
        <h4>
          <Hand size={16} /> Progressão
        </h4>
        <p>
          Siga as missões, venda no Mercado, compre regiões e pesquise tecnologias. Melhore edifícios para produzir mais rápido. No fim, monte
          um foguete para descobrir novos planetas.
        </p>
      </div>
      <div>
        <h4>
          <Sparkles size={16} /> Dicas
        </h4>
        <ul>
          <li>Mineradora: ~0,5 minério/s. Uma Fundição consome ~0,6/s.</li>
          <li>Venda automática mantém um estoque mínimo e vende o resto.</li>
          <li>Turbinas eólicas rendem mais no alto das montanhas.</li>
          <li>Painéis solares param à noite — o sol gira ao redor do planeta.</li>
        </ul>
      </div>
    </div>
  );
}

export function HelpPanel() {
  return (
    <ModalShell icon={<CircleHelp size={22} />} color="#60a5fa" title="Como jogar" sub="Transforme um planeta vazio numa civilização industrial." size="wide" onClose={closePanel}>
      <HelpContent />
    </ModalShell>
  );
}

// ───────────────────────────── Estatísticas ─────────────────────────────
export function StatsPanel() {
  useUI((s) => s.hudTick);
  const game = getGame();
  const s = game.state;
  const produced = ITEM_LIST.map((i) => ({ item: i, v: (s.counters.produced[i.id] ?? 0) + (s.counters.collected[i.id] ?? 0) }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 10);
  const max = Math.max(1, ...produced.map((p) => p.v));
  const buildingCount = Object.values(s.planets).reduce((n, p) => n + p.buildings.filter((b) => b.type !== "road" && b.type !== "hq").length, 0);
  const roads = Object.values(s.planets).reduce((n, p) => n + p.buildings.filter((b) => b.type === "road").length, 0);
  const mins = Math.floor(s.playTime / 60);
  const byType = new Map<string, number>();
  for (const b of game.planet.buildings) if (b.type !== "road" && b.type !== "hq") byType.set(b.type, (byType.get(b.type) ?? 0) + 1);
  return (
    <ModalShell icon={<ChartBar size={22} />} color="#4ade80" title="Estatísticas" size="mid" onClose={closePanel}>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="v num">{mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`}</div>
          <div className="l">Tempo de jogo</div>
        </div>
        <div className="stat-card">
          <div className="v num" style={{ color: "var(--gold)" }}>
            ${fmtMoney(s.totalEarned)}
          </div>
          <div className="l">Faturamento total</div>
        </div>
        <div className="stat-card">
          <div className="v num">{buildingCount}</div>
          <div className="l">Edifícios · {roads} estradas</div>
        </div>
        <div className="stat-card">
          <div className="v num">{s.researched.length}</div>
          <div className="l">Tecnologias</div>
        </div>
      </div>
      <div className="insp-label">
        <span>Itens produzidos</span>
      </div>
      <div className="bars">
        {produced.length === 0 && <span className="empty-note">Nada produzido ainda.</span>}
        {produced.map(({ item, v }) => (
          <div key={item.id} className="bar-row">
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <ItemIcon id={item.id} size={20} /> {item.name}
            </span>
            <div className="bar-track">
              <div style={{ width: `${(v / max) * 100}%`, background: item.color }} />
            </div>
            <span className="num" style={{ textAlign: "right" }}>
              {fmtNum(v)}
            </span>
          </div>
        ))}
      </div>
      {byType.size > 0 && (
        <>
          <div className="insp-label" style={{ marginTop: 16 }}>
            <span>Edifícios neste planeta</span>
          </div>
          <div className="buffers">
            {[...byType.entries()].map(([t, n]) => (
              <span key={t} className="pill">
                {BUILDINGS[t as keyof typeof BUILDINGS].name} × {n}
              </span>
            ))}
          </div>
        </>
      )}
    </ModalShell>
  );
}
