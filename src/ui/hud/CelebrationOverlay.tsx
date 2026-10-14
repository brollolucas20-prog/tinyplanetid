import { useEffect, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Celebration } from "@/remotion/compositions/Celebration";
import { useUI } from "../store";

const DURATION = 96;

/** Toca a composição Remotion "Celebration" sobre o jogo, em fila. */
export function CelebrationOverlay() {
  const current = useUI((s) => s.celebrations[0]);
  const pop = useUI((s) => s.popCelebration);
  const ref = useRef<PlayerRef>(null);

  useEffect(() => {
    if (!current) return;
    const p = ref.current;
    const done = () => pop();
    p?.addEventListener("ended", done);
    const fallback = window.setTimeout(done, (DURATION / 30) * 1000 + 600);
    return () => {
      p?.removeEventListener("ended", done);
      window.clearTimeout(fallback);
    };
  }, [current, pop]);

  if (!current) return null;
  return (
    <div className="celebration">
      <Player
        key={current.id}
        ref={ref}
        component={Celebration}
        inputProps={{ kind: current.kind, title: current.title, subtitle: current.subtitle, color: current.color }}
        durationInFrames={DURATION}
        fps={30}
        compositionWidth={1280}
        compositionHeight={480}
        autoPlay
        controls={false}
        clickToPlay={false}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      />
    </div>
  );
}
