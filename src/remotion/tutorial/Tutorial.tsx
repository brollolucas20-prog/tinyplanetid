import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Easing,
  Img,
  Series,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PlanetDiorama, StaticStars } from "../components/PlanetDiorama";
import { SceneCamera, SceneLights } from "../components/SceneCamera";
import { BODY, DISPLAY } from "../fonts";
import { CHAPTERS, SCENES, type Highlight, type Scene } from "./script";
import shotsJson from "./shots.json";
import voiceJson from "./voice.json";

type Rect = { x: number; y: number; w: number; h: number };
const SHOTS = shotsJson as unknown as Record<string, Record<string, Rect | null>>;
const VOICE = voiceJson as unknown as Record<string, { ms: number; words: { c: number; n: number; t: number }[] }>;

export const FPS = 30;
const LEAD = 0.35; // segundos antes de a narração começar
export const sceneFrames = (s: Scene) => Math.ceil(((VOICE[s.id]?.ms ?? 3000) / 1000 + LEAD + (s.kind === "chapter" ? 0.6 : 0.75)) * FPS);
export const TUTORIAL_FRAMES = SCENES.reduce((n, s) => n + sceneFrames(s), 0);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

// Janela da captura de tela
const WIN = { x: 160, y: 22, w: 1600, h: 900 };
const K = WIN.w / 1920;

function anchor(ref: string | undefined): Rect | null {
  if (!ref) return null;
  const [shot, name] = ref.split(".");
  return SHOTS[shot]?.[name] ?? null;
}

// ───────────────────────── legendas sincronizadas ─────────────────────────
function Subtitle({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps - LEAD) * 1000;
  const words = VOICE[scene.id]?.words ?? [];
  let spokenTo = 0;
  for (const w of words) if (w.t <= ms) spokenTo = w.c + w.n;
  const text = scene.text;
  return (
    <div
      style={{
        position: "absolute",
        left: WIN.x,
        width: WIN.w,
        top: WIN.y + WIN.h + 14,
        height: 1080 - (WIN.y + WIN.h + 14) - 14,
        display: "flex",
        alignItems: "center",
        gap: 26,
        opacity: interpolate(frame, [0, 8], [0, 1], clamp),
      }}
    >
      <div
        style={{
          flex: "none",
          width: 128,
          fontFamily: BODY,
          fontWeight: 800,
          fontSize: 17,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#ffd166",
          lineHeight: 1.25,
        }}
      >
        {scene.chapter > 0 ? `Cap. ${scene.chapter}` : "Início"}
        <div style={{ color: "#8ea0cc", fontSize: 14, letterSpacing: "0.04em", marginTop: 4, textTransform: "none" }}>{CHAPTERS[scene.chapter]}</div>
      </div>
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 31, lineHeight: 1.32, color: "#f5f7ff" }}>
        <span>{text.slice(0, spokenTo)}</span>
        <span style={{ color: "rgba(225,232,255,0.45)" }}>{text.slice(spokenTo)}</span>
      </div>
    </div>
  );
}

// ───────────────────────── teclas ─────────────────────────
export function KeyCap({ k, big = false }: { k: string; big?: boolean }) {
  if (k === "+") return <span style={{ fontFamily: DISPLAY, fontSize: 40, color: "#cbd5ff", margin: "0 4px" }}>+</span>;
  const wide = k.length > 2;
  return (
    <span
      style={{
        display: "inline-grid",
        placeItems: "center",
        minWidth: big ? 86 : 74,
        height: big ? 86 : 74,
        padding: wide ? "0 22px" : 0,
        borderRadius: 16,
        background: "linear-gradient(180deg, #f8fafc, #cbd5e1)",
        boxShadow: "0 7px 0 #64748b, 0 12px 24px rgba(0,0,0,0.45)",
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: wide ? 30 : 38,
        color: "#1e293b",
      }}
    >
      {k}
    </span>
  );
}

function KeysOverlay({ keys }: { keys: string[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        right: 34,
        bottom: 34,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "18px 24px 26px",
        borderRadius: 24,
        background: "rgba(8,12,30,0.82)",
        border: "2px solid rgba(255,255,255,0.12)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        scale: interpolate(frame, [0.3 * fps, 0.75 * fps], [0.6, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) }),
        opacity: interpolate(frame, [0.3 * fps, 0.55 * fps], [0, 1], clamp),
      }}
    >
      {keys.map((k, i) => {
        const s = 0.45 * fps + i * 4;
        return (
          <span
            key={i}
            style={{
              translate: interpolate(frame, [s, s + 6, s + 10], ["0px 0px", "0px 6px", "0px 0px"], clamp),
            }}
          >
            <KeyCap k={k} />
          </span>
        );
      })}
    </div>
  );
}

// ───────────────────────── destaques ─────────────────────────
function HighlightBox({ h, S, dur }: { h: Highlight; S: number; dur: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = anchor(h.target);
  if (!r) return null;
  const start = LEAD * fps + (h.at ?? 0) * dur;
  const t = frame - start;
  if (t < 0) return null;
  const inv = 1 / S;
  const appear = interpolate(t, [0, 0.45 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const pulse = 1 + Math.sin(t / 7) * 0.04;
  const circle = h.shape === "circle";
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const rad = Math.max(r.w, r.h) / 2;
  const side = h.side ?? "bottom";
  const gap = 18 * inv;
  const lx = side === "left" ? r.x - gap : side === "right" ? r.x + r.w + gap : cx;
  const ly = side === "top" ? (circle ? cy - rad : r.y) - gap : side === "bottom" ? (circle ? cy + rad : r.y + r.h) + gap : cy;
  const anchorT = side === "left" ? "-100% -50%" : side === "right" ? "0% -50%" : side === "top" ? "-50% -100%" : "-50% 0%";
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: circle ? cx - rad : r.x,
          top: circle ? cy - rad : r.y,
          width: circle ? rad * 2 : r.w,
          height: circle ? rad * 2 : r.h,
          borderRadius: circle ? "50%" : 14 * inv,
          border: `${5 * inv}px solid #ffd166`,
          boxShadow: `0 0 ${24 * inv}px rgba(255,209,102,0.85), inset 0 0 ${14 * inv}px rgba(255,209,102,0.45)`,
          scale: appear * pulse,
          opacity: interpolate(t, [0, 6], [0, 1], clamp),
        }}
      />
      {h.label && (
        <div
          style={{
            position: "absolute",
            left: lx,
            top: ly,
            translate: anchorT,
            whiteSpace: "nowrap",
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 30 * inv,
            color: "#2a1a00",
            background: "linear-gradient(180deg, #ffe08a, #f4a72c)",
            padding: `${6 * inv}px ${16 * inv}px`,
            borderRadius: 999,
            boxShadow: `0 ${6 * inv}px ${18 * inv}px rgba(0,0,0,0.45)`,
            scale: interpolate(t, [4, 0.5 * fps], [0.4, 1], { ...clamp, easing: Easing.out(Easing.back(2)) }),
            opacity: interpolate(t, [4, 10], [0, 1], clamp),
          }}
        >
          {h.label}
        </div>
      )}
    </>
  );
}

function DimMask({ highlights, dur }: { highlights: Highlight[]; dur: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shown = highlights.filter((h) => frame >= LEAD * fps + (h.at ?? 0) * dur);
  const op = interpolate(frame, [LEAD * fps, LEAD * fps + 10], [0, 0.42], clamp);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <mask id="holes">
          <rect width={1920} height={1080} fill="white" />
          {shown.map((h, i) => {
            const r = anchor(h.target);
            if (!r) return null;
            if (h.shape === "circle") {
              const rad = Math.max(r.w, r.h) / 2;
              return <circle key={i} cx={r.x + r.w / 2} cy={r.y + r.h / 2} r={rad} fill="black" />;
            }
            return <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={14} fill="black" />;
          })}
        </mask>
      </defs>
      <rect width={1920} height={1080} fill={`rgba(4,6,18,${op})`} mask="url(#holes)" />
    </svg>
  );
}

// ───────────────────────── cursor ─────────────────────────
function Cursor({ c, S, dur }: { c: NonNullable<Scene["cursor"]>; S: number; dur: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const to = anchor(c.target);
  if (!to) return null;
  const tx = to.x + to.w / 2;
  const ty = to.y + to.h / 2;
  const t0 = LEAD * fps + 0.1 * dur;
  const t1 = t0 + 0.9 * fps;
  let x = interpolate(frame, [t0, t1], [tx + 260, tx], { ...clamp, easing: easeOut });
  let y = interpolate(frame, [t0, t1], [ty + 200, ty], { ...clamp, easing: easeOut });
  const drag = anchor(c.drag);
  let pressed = false;
  if (drag) {
    const d0 = t1 + 0.3 * fps;
    const d1 = d0 + 1.6 * fps;
    pressed = frame >= d0 - 4 && frame <= d1 + 4;
    x = interpolate(frame, [d0, d1], [x, drag.x + drag.w / 2], { ...clamp, easing: Easing.inOut(Easing.quad) });
    y = interpolate(frame, [d0, d1], [y, drag.y + drag.h / 2], { ...clamp, easing: Easing.inOut(Easing.quad) });
  }
  const clickT = frame - (t1 + 4);
  const inv = 1 / S;
  return (
    <>
      {c.click && clickT >= 0 && clickT < 24 && (
        <div
          style={{
            position: "absolute",
            left: tx,
            top: ty,
            width: 90 * inv,
            height: 90 * inv,
            translate: "-50% -50%",
            borderRadius: "50%",
            border: `${5 * inv}px solid #ffffff`,
            scale: interpolate(clickT, [0, 24], [0.2, 1.4], clamp),
            opacity: interpolate(clickT, [0, 24], [1, 0], clamp),
          }}
        />
      )}
      <svg
        width={44 * inv}
        height={52 * inv}
        viewBox="0 0 44 52"
        style={{
          position: "absolute",
          left: x,
          top: y,
          opacity: interpolate(frame, [t0, t0 + 6], [0, 1], clamp),
          scale: (c.click && clickT >= 0 && clickT < 6) || pressed ? 0.86 : 1,
          transformOrigin: "0 0",
          filter: `drop-shadow(0 ${4 * inv}px ${6 * inv}px rgba(0,0,0,0.6))`,
        }}
      >
        <path d="M3 2 L3 40 L13 31 L20 48 L28 44 L21 28 L36 28 Z" fill="#ffffff" stroke="#111827" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </>
  );
}

// ───────────────────────── cena com captura ─────────────────────────
function ShotScene({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const dur = durationInFrames - LEAD * fps;
  const z = anchor(scene.zoom);
  const zs = scene.zoomScale ?? 1;
  const p = interpolate(frame, [0.15 * fps, 1.1 * fps], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  // leve "respiração" de câmera nas cenas sem zoom
  const drift = z ? 1 : interpolate(frame, [0, durationInFrames], [1, 1.04], clamp);
  const s = (1 + (zs - 1) * (z ? p : 0)) * drift;
  const S = K * s;
  const cx = z ? z.x + z.w / 2 : 960;
  const cy = z ? z.y + z.h / 2 : 540;
  const fx = 960 + (cx - 960) * (z ? p : 0);
  const fy = 540 + (cy - 540) * (z ? p : 0);
  let tx = WIN.w / 2 - fx * S;
  let ty = WIN.h / 2 - fy * S;
  tx = Math.min(0, Math.max(WIN.w - 1920 * S, tx));
  ty = Math.min(0, Math.max(WIN.h - 1080 * S, ty));
  const hs = scene.highlights ?? [];
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: WIN.x,
          top: WIN.y,
          width: WIN.w,
          height: WIN.h,
          overflow: "hidden",
          borderRadius: 22,
          boxShadow: "0 0 0 2px rgba(255,255,255,0.1), 0 30px 80px rgba(0,0,0,0.6)",
          background: "#05070f",
          opacity: interpolate(frame, [0, 8], [0, 1], clamp),
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", translate: `${tx}px ${ty}px`, scale: S }}>
          <Img src={staticFile(`tutorial/shots/${scene.shot}.jpg`)} style={{ width: 1920, height: 1080, display: "block" }} />
          {hs.length > 0 && <DimMask highlights={hs} dur={dur} />}
          {hs.map((h, i) => (
            <HighlightBox key={i} h={h} S={S / K} dur={dur} />
          ))}
          {scene.cursor && <Cursor c={scene.cursor} S={S / K} dur={dur} />}
        </div>
        {scene.keys && <KeysOverlay keys={scene.keys} />}
      </div>
      <Subtitle scene={scene} />
    </AbsoluteFill>
  );
}

// ───────────────────────── capítulo ─────────────────────────
function ChapterScene({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const next = SCENES[SCENES.indexOf(scene) + 1];
  const bg = next?.shot;
  const total = CHAPTERS.length - 1;
  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      {bg && (
        <Img
          src={staticFile(`tutorial/shots/${bg}.jpg`)}
          style={{
            position: "absolute",
            inset: 0,
            width: 1920,
            height: 1080,
            filter: "blur(14px) brightness(0.42) saturate(1.2)",
            scale: interpolate(frame, [0, 3 * fps], [1.12, 1.04], clamp),
          }}
        />
      )}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            fontFamily: BODY,
            fontWeight: 800,
            fontSize: 32,
            letterSpacing: "0.35em",
            color: "#ffd166",
            opacity: interpolate(frame, [0, 0.4 * fps], [0, 1], clamp),
            translate: interpolate(frame, [0, 0.6 * fps], ["0px 24px", "0px 0px"], { ...clamp, easing: easeOut }),
          }}
        >
          CAPÍTULO {scene.chapter} DE {total}
        </div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 112,
            color: "#ffffff",
            textAlign: "center",
            maxWidth: 1600,
            lineHeight: 1.05,
            textShadow: "0 8px 0 rgba(8,12,40,0.6), 0 24px 60px rgba(0,0,0,0.6)",
            scale: interpolate(frame, [0.1 * fps, 0.7 * fps], [0.7, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) }),
            opacity: interpolate(frame, [0.1 * fps, 0.4 * fps], [0, 1], clamp),
          }}
        >
          {CHAPTERS[scene.chapter]}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 34 }}>
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              style={{
                width: i + 1 === scene.chapter ? 46 : 16,
                height: 16,
                borderRadius: 16,
                background: i + 1 < scene.chapter ? "#4ade80" : i + 1 === scene.chapter ? "#ffd166" : "rgba(255,255,255,0.2)",
                opacity: interpolate(frame, [0.3 * fps + i * 1.5, 0.5 * fps + i * 1.5], [0, 1], clamp),
              }}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ───────────────────────── abertura e encerramento 3D ─────────────────────────
function PlanetScene({ scene, outro }: { scene: Scene; outro?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, #22307a 0%, #0d1236 45%, #04050d 100%)" }}>
      <ThreeCanvas width={1920} height={1080} shadows camera={{ position: [0, 6, 60], fov: 36, near: 0.5, far: 1200 }}>
        <SceneCamera position={[0, 6, outro ? 58 : interpolate(frame, [0, 4 * fps], [90, 62], { ...clamp, easing: easeOut })]} target={[0, -3, 0]} />
        <SceneLights />
        <StaticStars />
        <PlanetDiorama planetId="verdalia" time={frame / fps} rotation={-0.4 + frame * 0.004} position={[0, -9, 0]} tilt={0.55} />
      </ThreeCanvas>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 }}>
        <div
          style={{
            fontFamily: BODY,
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: "0.3em",
            color: "#9fb4ff",
            opacity: interpolate(frame, [0.2 * fps, 0.8 * fps], [0, 1], clamp),
          }}
        >
          {outro ? "AGORA É COM VOCÊ" : "TUTORIAL COMPLETO"}
        </div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 136,
            lineHeight: 1,
            marginTop: 8,
            background: "linear-gradient(180deg, #ffffff 0%, #d6f5ff 55%, #8fe3c4 100%)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            scale: interpolate(frame, [0.3 * fps, 1 * fps], [0.6, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) }),
            opacity: interpolate(frame, [0.3 * fps, 0.6 * fps], [0, 1], clamp),
          }}
        >
          {outro ? "Bom jogo!" : "Como jogar"}
        </div>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: 54,
            color: "#ffd166",
            letterSpacing: "0.18em",
            marginTop: 6,
            opacity: interpolate(frame, [0.8 * fps, 1.3 * fps], [0, 1], clamp),
          }}
        >
          TINY PLANET INDUSTRIES
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 170, background: "linear-gradient(transparent, rgba(4,5,13,0.92))" }} />
      <Subtitle scene={scene} />
    </AbsoluteFill>
  );
}

// ───────────────────────── atalhos ─────────────────────────
const SHORTCUTS: [string[], string][] = [
  [["W", "A", "S", "D"], "Andar"],
  [["Shift"], "Correr com o jetpack"],
  [["E"], "Coletar recurso"],
  [["Arrastar"], "Girar a câmera"],
  [["Roda"], "Aproximar / afastar"],
  [["Tab"], "Ver o planeta inteiro"],
  [["F"], "Voltar ao astronauta"],
  [["1", "6"], "Construção rápida"],
  [["R"], "Girar edifício"],
  [["X"], "Demolir"],
  [["Esc"], "Cancelar / fechar"],
  [["M"], "Mercado"],
  [["T"], "Pesquisa"],
  [["P"], "Planetas"],
  [["H"], "Ajuda"],
  [["Espaço"], "Pausar o jogo"],
];

function ShortcutsScene({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, #1c2766 0%, #0a0e2a 55%, #04050d 100%)" }}>
      <div
        style={{
          position: "absolute",
          top: 46,
          width: "100%",
          textAlign: "center",
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 66,
          color: "#fff",
          opacity: interpolate(frame, [0, 10], [0, 1], clamp),
        }}
      >
        Atalhos do teclado
      </div>
      <div
        style={{
          position: "absolute",
          top: 160,
          left: 150,
          right: 150,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 60,
          rowGap: 22,
        }}
      >
        {SHORTCUTS.map(([keys, label], i) => {
          const s = 0.3 * fps + i * 0.32 * fps;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "8px 18px",
                borderRadius: 18,
                background: "rgba(255,255,255,0.05)",
                opacity: interpolate(frame, [s, s + 8], [0, 1], clamp),
                translate: interpolate(frame, [s, s + 12], ["-30px 0px", "0px 0px"], { ...clamp, easing: easeOut }),
              }}
            >
              <div style={{ display: "flex", gap: 8, width: 360, transform: "scale(0.72)", transformOrigin: "left center" }}>
                {keys.map((k, j) => (
                  <span key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {j > 0 && keys[0] === "1" && <span style={{ fontFamily: DISPLAY, fontSize: 34, color: "#cbd5ff" }}>a</span>}
                    <KeyCap k={k} />
                  </span>
                ))}
              </div>
              <span style={{ fontFamily: BODY, fontWeight: 800, fontSize: 30, color: "#e8edff", marginLeft: -90 }}>{label}</span>
            </div>
          );
        })}
      </div>
      <Subtitle scene={scene} />
    </AbsoluteFill>
  );
}

// ───────────────────────── barra de progresso ─────────────────────────
function ProgressBar() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, height: 8, width: "100%", background: "rgba(255,255,255,0.06)" }}>
      <div style={{ height: "100%", width: `${(frame / durationInFrames) * 100}%`, background: "linear-gradient(90deg, #4ade80, #ffd166)" }} />
    </div>
  );
}

function SceneView({ scene }: { scene: Scene }) {
  if (scene.kind === "intro") return <PlanetScene scene={scene} />;
  if (scene.kind === "outro") return <PlanetScene scene={scene} outro />;
  if (scene.kind === "chapter") return <ChapterScene scene={scene} />;
  if (scene.kind === "shortcuts") return <ShortcutsScene scene={scene} />;
  return <ShotScene scene={scene} />;
}

/** Vídeo tutorial completo — narração (voz do Windows), legendas sincronizadas e capturas reais do jogo. */
export const Tutorial: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #121a40 0%, #070a1c 60%, #04050d 100%)" }}>
      <Audio
        src={staticFile("tutorial/music.wav")}
        loop
        volume={interpolate(frame, [0, 2 * fps, durationInFrames - 3 * fps, durationInFrames], [0, 0.14, 0.14, 0], clamp)}
      />
      <Series>
        {SCENES.map((s) => (
          <Series.Sequence key={s.id} name={s.id} durationInFrames={sceneFrames(s)} premountFor={fps}>
            <SceneView scene={s} />
            <Audio src={staticFile(`tutorial/voice/${s.id}.wav`)} from={Math.round(LEAD * fps)} />
          </Series.Sequence>
        ))}
      </Series>
      <ProgressBar />
    </AbsoluteFill>
  );
};
