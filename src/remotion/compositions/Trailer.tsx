import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useMemo } from "react";
import type { ItemId } from "@/game/data/items";
import { PLANETS } from "@/game/data/planets";
import { TECHS } from "@/game/data/research";
import { getWorld } from "@/game/world/planetGen";
import { demoLayout } from "@/render/world/demoLayout";
import { ItemIcon } from "@/ui/ItemIcon";
import { PlanetDiorama, StaticStars } from "../components/PlanetDiorama";
import { SceneCamera, SceneLights } from "../components/SceneCamera";
import { BODY, DISPLAY } from "../fonts";
import { LogoReveal } from "./LogoReveal";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);

type V3 = [number, number, number];
const lerp3 = (frame: number, input: number[], outputs: V3[]): V3 =>
  [0, 1, 2].map((k) =>
    interpolate(
      frame,
      input,
      outputs.map((o) => o[k]),
      { ...clamp, easing: ease },
    ),
  ) as V3;

/** Fundo 3D contínuo do trailer: um planeta que se industrializa diante da câmera. */
function TrailerWorld() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = useMemo(() => demoLayout(getWorld(PLANETS[0])), []);
  const total = layout.buildings.reduce((m, b) => Math.max(m, b.order), 0) + 4;
  const reveal = interpolate(frame, [255, 440], [-1, total], clamp);
  const keys = [0, 120, 250, 430, 520, 545, 620, 690];
  const camPos = lerp3(frame, keys, [
    [0, 4, 150],
    [0, 6, 54],
    [0, 15, 31],
    [0, 13, 37],
    [0, 9, 46],
    [0, 9, 120],
    [0, 9, 120],
    [0, 6, 62],
  ]);
  const camTarget = lerp3(frame, keys, [
    [0, 0, 0],
    [0, 0, 0],
    [0, 7, 9],
    [0, 6, 10],
    [0, 2, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, -2, 0],
  ]);
  const rotation = interpolate(frame, [0, 250, 430, 690], [-1.6, -0.12, 0.12, 1.2], clamp);
  const multi = frame >= 532 && frame < 622;
  const multiIn = interpolate(frame, [532, 560], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #1f2b70 0%, #0b1032 45%, #04050d 100%)" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ position: [0, 6, 54], fov: 36, near: 0.5, far: 1500 }}>
        <SceneCamera position={camPos} target={camTarget} />
        <SceneLights />
        <StaticStars />
        {!multi && <PlanetDiorama planetId="verdalia" time={frame / fps} rotation={rotation} reveal={reveal} popSpan={5} tilt={0.42} />}
        {multi &&
          PLANETS.map((p, i) => (
            <PlanetDiorama
              key={p.id}
              planetId={p.id}
              time={frame / fps}
              rotation={frame * 0.01 + i}
              showCity={i === 0}
              position={[(i - 1) * 44, 0, 0]}
              scale={Math.max(0.001, multiIn * 0.82)}
            />
          ))}
      </ThreeCanvas>
    </AbsoluteFill>
  );
}

function Caption({ kicker, title, from, to }: { kicker: string; title: string; from: number; to: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  const len = to - from;
  return (
    <div
      style={{
        position: "absolute",
        left: 120,
        bottom: 120,
        display: "flex",
        gap: 24,
        alignItems: "stretch",
        opacity: interpolate(local, [0, 0.4 * fps, len - 0.4 * fps, len], [0, 1, 1, 0], clamp),
        translate: interpolate(local, [0, 0.6 * fps], ["-60px 0px", "0px 0px"], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      }}
    >
      <div style={{ width: 10, borderRadius: 10, background: "linear-gradient(#ffd166, #ff8a3d)" }} />
      <div>
        <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 28, letterSpacing: "0.25em", color: "#9fb4ff", textTransform: "uppercase" }}>
          {kicker}
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 92, color: "#fff", lineHeight: 1.02, textShadow: "0 6px 0 rgba(8,12,40,0.6)" }}>
          {title}
        </div>
      </div>
    </div>
  );
}

function CenterLine({ text, from, to, size = 120 }: { text: string; from: number; to: number; size?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  const len = to - from;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: size,
          color: "#fff",
          textShadow: "0 8px 0 rgba(8,12,40,0.6), 0 20px 50px rgba(0,0,0,0.5)",
          opacity: interpolate(local, [0, 0.35 * fps, len - 0.35 * fps, len], [0, 1, 1, 0], clamp),
          scale: interpolate(local, [0, len], [0.92, 1.06], clamp),
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}

const RESOURCES: ItemId[] = ["wood", "stone", "ironOre", "copperOre", "coal"];

function ResourceBurst() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", right: 140, top: 150, display: "flex", gap: 22 }}>
      {RESOURCES.map((id, i) => {
        const s = 0.25 * fps + i * 5;
        return (
          <div
            key={id}
            style={{
              width: 130,
              height: 130,
              borderRadius: 32,
              background: "rgba(13,18,36,0.72)",
              border: "2px solid rgba(255,255,255,0.12)",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 18px 40px rgba(0,0,0,0.4)",
              scale: interpolate(frame, [s, s + 0.45 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) }),
              translate: `0px ${Math.sin((frame + i * 9) / 9) * 6}px`,
            }}
          >
            <ItemIcon id={id} size={92} />
          </div>
        );
      })}
    </div>
  );
}

function BuildCounter({ from }: { from: number }) {
  const frame = useCurrentFrame();
  const layout = useMemo(() => demoLayout(getWorld(PLANETS[0])), []);
  const total = layout.buildings.reduce((m, b) => Math.max(m, b.order), 0) + 4;
  const reveal = interpolate(frame + from, [255, 440], [-1, total], clamp);
  const built = layout.buildings.filter((b) => b.order <= reveal).length;
  return (
    <div
      style={{
        position: "absolute",
        right: 140,
        top: 140,
        padding: "22px 34px",
        borderRadius: 30,
        background: "rgba(13,18,36,0.72)",
        border: "2px solid rgba(255,255,255,0.12)",
        fontFamily: DISPLAY,
        color: "#fff",
        textAlign: "right",
      }}
    >
      <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 22, color: "#9fb4ff", letterSpacing: "0.2em" }}>EDIFÍCIOS</div>
      <div style={{ fontSize: 110, fontWeight: 700, lineHeight: 1, color: "#ffd166" }}>{built}</div>
    </div>
  );
}

function TechCascade() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const techs = TECHS.slice(0, 12);
  return (
    <AbsoluteFill style={{ alignItems: "flex-end", justifyContent: "center", paddingRight: 120 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 250px)", gap: 16 }}>
        {techs.map((t, i) => {
          const s = 0.2 * fps + i * 3;
          const lit = interpolate(frame, [s + 0.5 * fps, s + 0.8 * fps], [0, 1], clamp);
          return (
            <div
              key={t.id}
              style={{
                borderRadius: 22,
                padding: "16px 18px",
                background: `rgba(${Math.round(30 + 110 * lit)}, ${Math.round(40 + 52 * lit)}, ${Math.round(80 + 166 * lit)}, 0.55)`,
                border: `2px solid rgba(167,139,250,${0.15 + lit * 0.7})`,
                boxShadow: `0 0 ${30 * lit}px rgba(139,92,246,0.55)`,
                color: "#fff",
                fontFamily: DISPLAY,
                fontSize: 30,
                fontWeight: 600,
                scale: interpolate(frame, [s, s + 0.4 * fps], [0.6, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) }),
                opacity: interpolate(frame, [s, s + 0.25 * fps], [0, 1], clamp),
              }}
            >
              {t.name}
              <div style={{ fontFamily: BODY, fontSize: 17, fontWeight: 700, color: "#c7d2fe", marginTop: 4 }}>Tier {t.tier}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function PlanetNames() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: 150 }}>
      <div style={{ display: "flex", justifyContent: "space-around", padding: "0 150px" }}>
        {PLANETS.map((p, i) => (
          <div
            key={p.id}
            style={{
              textAlign: "center",
              opacity: interpolate(frame, [0.6 * fps + i * 6, 0.9 * fps + i * 6], [0, 1], clamp),
              translate: interpolate(frame, [0.6 * fps + i * 6, 1 * fps + i * 6], ["0px 30px", "0px 0px"], {
                ...clamp,
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          >
            <div style={{ fontFamily: DISPLAY, fontSize: 64, fontWeight: 700, color: "#fff", textShadow: "0 5px 0 rgba(8,12,40,0.6)" }}>{p.name}</div>
            <div style={{ fontFamily: BODY, fontSize: 26, fontWeight: 800, color: p.atmosphere }}>{p.subtitle}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function EndCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: `rgba(4,6,18,${interpolate(frame, [0, 0.6 * fps], [0, 0.55], clamp)})` }}>
      <LogoReveal tagline="Construa sua indústria planetária" align="center" />
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 130 }}>
        <div
          style={{
            fontFamily: BODY,
            fontWeight: 800,
            fontSize: 34,
            color: "#3a2300",
            background: "linear-gradient(180deg, #ffd978, #f4a72c)",
            padding: "18px 46px",
            borderRadius: 999,
            boxShadow: "0 14px 40px rgba(244,167,44,0.45)",
            scale: interpolate(frame, [1.6 * fps, 2.1 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) }),
          }}
        >
          Jogue agora no navegador
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** Trailer de 23 s (1920×1080) — renderize com `npm run render:trailer`. */
export const Trailer: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#04050d" }}>
      <TrailerWorld />
      <Sequence name="Linha 1" from={0.6 * fps} durationInFrames={1.6 * fps} premountFor={fps}>
        <CenterLine text="Um pequeno planeta." from={0} to={1.6 * fps} />
      </Sequence>
      <Sequence name="Linha 2" from={2.2 * fps} durationInFrames={1.7 * fps} premountFor={fps}>
        <CenterLine text="Uma indústria gigante." from={0} to={1.7 * fps} />
      </Sequence>
      <Sequence name="Coleta" from={4.1 * fps} durationInFrames={4.1 * fps} premountFor={fps}>
        <Caption kicker="Comece do zero" title="Colete recursos" from={0} to={4.1 * fps} />
        <ResourceBurst />
      </Sequence>
      <Sequence name="Construção" from={8.4 * fps} durationInFrames={5.8 * fps} premountFor={fps}>
        <Caption kicker="Estradas, energia, fábricas" title="Construa e automatize" from={0} to={5.8 * fps} />
        <BuildCounter from={8.4 * fps} />
      </Sequence>
      <Sequence name="Pesquisa" from={14.4 * fps} durationInFrames={3.2 * fps} premountFor={fps}>
        <Caption kicker="22 tecnologias" title="Pesquise e evolua" from={0} to={3.2 * fps} />
        <TechCascade />
      </Sequence>
      <Sequence name="Planetas" from={17.75 * fps} durationInFrames={3 * fps} premountFor={fps}>
        <PlanetNames />
        <CenterLine text="Descubra novos mundos" from={0} to={3 * fps} size={96} />
      </Sequence>
      <Sequence name="Final" from={20.7 * fps} durationInFrames={2.3 * fps} premountFor={fps}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
