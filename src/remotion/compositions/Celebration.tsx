import { Crown, FlaskConical, Globe, Map as MapIcon, Rocket, Target } from "lucide-react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import type { CelebrationKind } from "@/game/sim/types";
import { BODY, DISPLAY } from "../fonts";

export type CelebrationProps = {
  readonly kind: CelebrationKind;
  readonly title: string;
  readonly subtitle: string;
  readonly color: string;
};

const LABELS: Record<CelebrationKind, string> = {
  tech: "Tecnologia desbloqueada",
  quest: "Missão concluída",
  level: "Novo nível de civilização",
  region: "Território expandido",
  planet: "Novo planeta descoberto",
  launch: "Lançamento",
};

const ICONS = { tech: FlaskConical, quest: Target, level: Crown, region: MapIcon, planet: Globe, launch: Rocket };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Banner comemorativo transparente exibido sobre o jogo via <Player>. */
export const Celebration: React.FC<CelebrationProps> = ({ kind, title, subtitle, color }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const Icon = ICONS[kind];
  const out = durationInFrames - 0.45 * fps;
  const confetti = Array.from({ length: 34 }, (_, i) => i);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: interpolate(frame, [out, durationInFrames], [1, 0], clamp),
        scale: interpolate(frame, [out, durationInFrames], [1, 0.94], clamp),
      }}
    >
      {/* raios */}
      <svg
        width={720}
        height={720}
        viewBox="-360 -360 720 720"
        style={{
          position: "absolute",
          top: -150,
          opacity: interpolate(frame, [0, 0.3 * fps, 1.6 * fps], [0, 0.55, 0.25], clamp),
          rotate: `${frame * 0.6}deg`,
          scale: interpolate(frame, [0, 0.5 * fps], [0.3, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
        }}
      >
        <defs>
          <radialGradient id="rg">
            <stop offset="0" stopColor={color} stopOpacity="0.9" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 14 }, (_, i) => (
          <polygon key={i} points="0,0 -26,-340 26,-340" fill="url(#rg)" transform={`rotate(${(i * 360) / 14})`} />
        ))}
      </svg>

      {/* confete */}
      {confetti.map((i) => {
        const delay = random(`d${i}`) * 0.4 * fps;
        const x0 = (random(`x${i}`) - 0.5) * width * 0.7;
        const vx = (random(`vx${i}`) - 0.5) * 9;
        const vy = -10 - random(`vy${i}`) * 9;
        const t = Math.max(0, frame - 0.15 * fps - delay);
        const x = x0 * 0.2 + vx * t;
        const y = 60 + vy * t + 0.32 * t * t;
        const palette = [color, "#ffd166", "#ffffff", "#f472b6", "#60a5fa"];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 10 + random(`w${i}`) * 8,
              height: 6 + random(`h${i}`) * 6,
              borderRadius: 2,
              background: palette[i % palette.length],
              translate: `${x}px ${y}px`,
              rotate: `${t * (8 + random(`r${i}`) * 14)}deg`,
              opacity: t <= 0 ? 0 : interpolate(t, [0, 4, 36, 54], [0, 1, 1, 0], clamp),
            }}
          />
        );
      })}

      <div style={{ display: "flex", alignItems: "center", gap: 30, position: "relative" }}>
        {/* medalha */}
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: `radial-gradient(circle at 32% 28%, #ffffff55, ${color} 45%, ${color}aa)`,
            boxShadow: `0 0 0 8px rgba(255,255,255,0.12), 0 0 60px ${color}aa, 0 14px 0 rgba(0,0,0,0.25)`,
            scale: interpolate(frame, [0.05 * fps, 0.55 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.6)) }),
            rotate: interpolate(frame, [0.05 * fps, 0.55 * fps], ["-40deg", "0deg"], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
          }}
        >
          <Icon size={74} color="#ffffff" strokeWidth={2.2} style={{ filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.25))" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <div
            style={{
              fontFamily: BODY,
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color,
              textShadow: "0 2px 0 rgba(0,0,0,0.4)",
              opacity: interpolate(frame, [0.25 * fps, 0.55 * fps], [0, 1], clamp),
              translate: interpolate(frame, [0.25 * fps, 0.6 * fps], ["-30px 0px", "0px 0px"], {
                ...clamp,
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          >
            {LABELS[kind]}
          </div>
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: title.length > 18 ? 66 : 84,
              lineHeight: 1.02,
              color: "#ffffff",
              textShadow: "0 6px 0 rgba(10,16,48,0.6), 0 12px 34px rgba(0,0,0,0.45)",
              opacity: interpolate(frame, [0.3 * fps, 0.6 * fps], [0, 1], clamp),
              translate: interpolate(frame, [0.3 * fps, 0.75 * fps], ["0px 34px", "0px 0px"], {
                ...clamp,
                easing: Easing.out(Easing.back(1.6)),
              }),
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: BODY,
              fontWeight: 700,
              fontSize: 28,
              color: "#e2e8ff",
              marginTop: 8,
              textShadow: "0 2px 6px rgba(0,0,0,0.6)",
              opacity: interpolate(frame, [0.55 * fps, 0.9 * fps], [0, 1], clamp),
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
