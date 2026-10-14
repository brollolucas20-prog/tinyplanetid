import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BODY, DISPLAY } from "../fonts";

export type LogoRevealProps = {
  readonly tagline: string;
  readonly align: "left" | "center";
};

const WORD = "Tiny Planet";

/** Logo animado: letras saltando, "INDUSTRIES" deslizando e barra dourada crescendo. */
export const LogoReveal: React.FC<LogoRevealProps> = ({ tagline, align }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const centered = align === "center";
  return (
    <AbsoluteFill
      style={{
        justifyContent: centered ? "center" : "flex-start",
        alignItems: centered ? "center" : "flex-start",
        padding: centered ? 0 : "190px 0 0 135px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: centered ? "center" : "flex-start" }}>
        <div
          style={{
            fontFamily: BODY,
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: "0.32em",
            color: "#9fb4ff",
            textTransform: "uppercase",
            opacity: interpolate(frame, [0, 0.6 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            translate: interpolate(frame, [0, 0.6 * fps], ["0px 18px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            marginBottom: 6,
          }}
        >
          {tagline}
        </div>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontWeight: 700, fontSize: 168, lineHeight: 1 }}>
          {WORD.split("").map((ch, i) => {
            const start = 0.25 * fps + i * 2;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  whiteSpace: "pre",
                  background: "linear-gradient(180deg, #ffffff 0%, #d6f5ff 55%, #8fe3c4 100%)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  filter: "drop-shadow(0 8px 0 rgba(10,16,48,0.55)) drop-shadow(0 18px 30px rgba(0,0,0,0.45))",
                  scale: interpolate(frame, [start, start + 0.5 * fps], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.out(Easing.back(2.2)),
                  }),
                  translate: interpolate(frame, [start, start + 0.5 * fps], ["0px 60px", "0px 0px"], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  }),
                  rotate: interpolate(frame, [start, start + 0.5 * fps], ["-14deg", "0deg"], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  }),
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 70,
            color: "#ffd166",
            marginTop: 2,
            filter: "drop-shadow(0 5px 0 rgba(10,16,48,0.55))",
            letterSpacing: interpolate(frame, [0.9 * fps, 1.7 * fps], ["0.9em", "0.36em"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            opacity: interpolate(frame, [0.9 * fps, 1.4 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          INDUSTRIES
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 8,
            marginTop: 18,
            background: "linear-gradient(90deg, #ffd166, #ff8a3d, #f43f5e)",
            width: interpolate(frame, [1.3 * fps, 2.2 * fps], [0, 420], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.65, 0, 0.35, 1),
            }),
            boxShadow: "0 0 24px rgba(255,170,80,0.6)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
