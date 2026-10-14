import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { CircleAlert, Pause } from "lucide-react";
import { sound } from "@/audio/sound";
import { BUILDINGS, BUILDABLE } from "@/game/data/buildings";
import { PLANET_MAP } from "@/game/data/planets";
import { cam, getGame, input } from "@/game/session";
import { GameScene } from "@/render/game/GameScene";
import { clearParticles } from "@/render/game/Particles";
import { clearPopups, popupLayer } from "@/render/game/popups";
import { TECH_MAP } from "@/game/data/research";
import { rotateGhostOrSelected } from "../actions";
import { BuildBar } from "../hud/BuildBar";
import { CelebrationOverlay } from "../hud/CelebrationOverlay";
import { HoverTooltip } from "../hud/HoverTooltip";
import { Inspector } from "../hud/Inspector";
import { InventoryPanel } from "../hud/InventoryPanel";
import { QuestCard } from "../hud/QuestCard";
import { RegionDialog } from "../hud/RegionDialog";
import { Toasts } from "../hud/Toasts";
import { TopBar } from "../hud/TopBar";
import { MarketPanel } from "../panels/MarketPanel";
import { HelpPanel, PlanetsPanel, SettingsPanel, StatsPanel } from "../panels/OtherPanels";
import { ResearchPanel } from "../panels/ResearchPanel";
import { useUI } from "../store";

const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", "e"]);

function useGameBridge() {
  useEffect(() => {
    const game = getGame();
    const ui = useUI.getState();
    sound.setSfx(game.state.settings.sfx);
    sound.setMusic(game.state.settings.music);
    const offs = [
      game.events.on("sfx", ({ name }) => sound.play(name)),
      game.events.on("toast", (t) => ui.toast({ title: t.title, body: t.body, kind: t.kind ?? "info" })),
      game.events.on("celebrate", (c) => ui.celebrate(c)),
      game.events.on("planetChanged", () => {
        clearParticles();
        clearPopups();
      }),
    ];
    return () => offs.forEach((o) => o());
  }, []);
}

function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      const ui = useUI.getState();
      const game = getGame();
      sound.unlock();
      if (MOVE_KEYS.has(k)) {
        input.keys.add(k);
        if (k.startsWith("arrow")) e.preventDefault();
        return;
      }
      if (e.repeat) return;
      switch (k) {
        case "escape":
          if (ui.regionPrompt != null) ui.setRegionPrompt(null);
          else if (ui.panel) ui.setPanel(null);
          else if (ui.tool.kind !== "none") ui.setTool({ kind: "none" });
          else if (ui.selected != null) ui.select(null);
          else if (ui.category) ui.setCategory(null);
          else ui.setPanel("settings");
          break;
        case "r":
          rotateGhostOrSelected();
          break;
        case "x":
          ui.setTool(ui.tool.kind === "demolish" ? { kind: "none" } : { kind: "demolish" });
          break;
        case "m":
          ui.togglePanel("market");
          break;
        case "t":
          ui.togglePanel("research");
          break;
        case "p":
          ui.togglePanel("planets");
          break;
        case "h":
          ui.togglePanel("help");
          break;
        case " ":
          e.preventDefault();
          game.state.settings.speed = game.state.settings.speed === 0 ? 1 : 0;
          ui.bumpHud();
          break;
        case "tab":
          e.preventDefault();
          cam.targetDist = cam.targetDist > 20 ? 11 : 48;
          break;
        case "f":
          cam.targetDist = 11;
          break;
        default: {
          const type = BUILDABLE.find((b) => BUILDINGS[b].hotkey === k);
          if (type) {
            if (!game.isUnlocked(type)) {
              ui.toast({ title: "Tecnologia necessária", body: TECH_MAP[BUILDINGS[type].tech!].name, kind: "info" });
              return;
            }
            ui.setCategory(BUILDINGS[type].category);
            ui.setTool(ui.tool.kind === "build" && ui.tool.type === type ? { kind: "none" } : { kind: "build", type });
            game.events.emit("sfx", { name: "click" });
          }
        }
      }
    };
    const up = (e: KeyboardEvent) => input.keys.delete(e.key.toLowerCase());
    const blur = () => input.keys.clear();
    const gesture = () => sound.unlock();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("pointerdown", gesture);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pointerdown", gesture);
    };
  }, []);
}

function StatusBanners() {
  useUI((s) => s.hudTick);
  const game = getGame();
  const paused = game.state.settings.speed === 0;
  const fine = game.rt.fine;
  const lowPower = game.rt.power.ratio < 0.7 && game.rt.power.demand > 0;
  return (
    <>
      {paused && (
        <div className="glass paused-banner">
          <Pause size={15} /> Jogo pausado — Espaço para continuar
        </div>
      )}
      {(fine > 0 || lowPower) && (
        <div className="glass warn-chip">
          <CircleAlert size={15} />
          {lowPower ? `Energia em ${Math.round(game.rt.power.ratio * 100)}% — construa geradores` : `Multa ambiental -$${fine.toFixed(1)}/s`}
        </div>
      )}
    </>
  );
}

export function GameScreen({ onQuit }: { onQuit: () => void }) {
  useGameBridge();
  useKeyboard();
  const panel = useUI((s) => s.panel);
  const tool = useUI((s) => s.tool);
  useUI((s) => s.hudTick);
  const game = getGame();
  const def = PLANET_MAP[game.state.activePlanet];
  const cursorStyle = tool.kind === "build" ? "crosshair" : tool.kind === "demolish" ? "not-allowed" : "default";

  return (
    <div className="game-root">
      <div
        className="game-canvas"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${def.space[1]} 0%, ${def.space[0]} 55%, #03040a 100%)`,
          cursor: cursorStyle,
        }}
      >
        <Canvas
          shadows
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ fov: 50, near: 0.1, far: 2500, position: [0, 0, 60] }}
        >
          <GameScene />
        </Canvas>
      </div>
      <div
        className="popup-layer"
        ref={(el) => {
          popupLayer.el = el;
        }}
      />
      <div className="hud">
        <TopBar />
        <QuestCard />
        <InventoryPanel />
        <BuildBar />
        <Inspector />
        <StatusBanners />
        <Toasts />
        <CelebrationOverlay />
        <HoverTooltip />
        <RegionDialog />
        {panel === "market" && <MarketPanel />}
        {panel === "research" && <ResearchPanel />}
        {panel === "planets" && <PlanetsPanel />}
        {panel === "settings" && <SettingsPanel onQuit={onQuit} />}
        {panel === "help" && <HelpPanel />}
        {panel === "stats" && <StatsPanel />}
      </div>
    </div>
  );
}
