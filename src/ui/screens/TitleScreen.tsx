import { useEffect, useState } from "react";
import { Player } from "@remotion/player";
import { CircleHelp, Play, Plus, X } from "lucide-react";
import { sound } from "@/audio/sound";
import { Game } from "@/game/sim/game";
import { LogoReveal } from "@/remotion/compositions/LogoReveal";
import { TitleBackground } from "@/remotion/compositions/TitleBackground";
import { HelpContent } from "../panels/OtherPanels";

/** Tamanho que cobre a tela mantendo 16:9 (como object-fit: cover). */
function useCoverSize() {
  const calc = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const width = Math.max(w, (h * 16) / 9);
    return { width, height: (width * 9) / 16 };
  };
  const [size, setSize] = useState(calc);
  useEffect(() => {
    const onResize = () => setSize(calc());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

export function TitleScreen({ onStart }: { onStart: (fresh: boolean) => void }) {
  const size = useCoverSize();
  const hasSave = Game.hasSave();
  const [help, setHelp] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const start = (fresh: boolean) => {
    sound.unlock();
    sound.play("unlock");
    onStart(fresh);
  };

  return (
    <div className="title-root">
      <div style={{ position: "absolute", left: "50%", top: "50%", width: size.width, height: size.height, translate: "-50% -50%" }}>
        <Player
          component={TitleBackground}
          durationInFrames={720}
          fps={30}
          compositionWidth={1920}
          compositionHeight={1080}
          autoPlay
          loop
          controls={false}
          clickToPlay={false}
          style={{ width: "100%", height: "100%" }}
        />
        <div className="title-shade" />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <Player
            component={LogoReveal}
            inputProps={{ tagline: "Um simulador de indústria planetária", align: "left" as const }}
            durationInFrames={90}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1080}
            autoPlay
            loop={false}
            moveToBeginningWhenEnded={false}
            controls={false}
            clickToPlay={false}
            style={{ width: "100%", height: "100%", background: "transparent" }}
          />
        </div>
      </div>

      <div className="title-ui">
        <div className="menu">
          {hasSave && (
            <button className="btn primary" onClick={() => start(false)}>
              <Play size={18} /> Continuar
            </button>
          )}
          {hasSave && confirmNew ? (
            <div className="glass" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13 }}>Começar de novo apaga o progresso salvo.</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn danger" style={{ height: 38, fontSize: 13 }} onClick={() => start(true)}>
                  Apagar e começar
                </button>
                <button className="btn" style={{ height: 38, fontSize: 13 }} onClick={() => setConfirmNew(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button className={`btn ${hasSave ? "" : "primary"}`} onClick={() => (hasSave ? setConfirmNew(true) : start(true))}>
              {hasSave ? <Plus size={18} /> : <Play size={18} />} {hasSave ? "Novo jogo" : "Jogar"}
            </button>
          )}
          <button className="btn" onClick={() => setHelp(true)}>
            <CircleHelp size={18} /> Como jogar
          </button>
        </div>
        <div className="menu-foot">v0.1 · Planeta inicial Verdália · Feito com React, Three.js e Remotion</div>
      </div>

      {help && (
        <div className="backdrop" onClick={() => setHelp(false)}>
          <div className="glass modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Como jogar</div>
              <button className="close-x" onClick={() => setHelp(false)} aria-label="Fechar">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <HelpContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
