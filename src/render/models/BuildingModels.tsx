import { useMemo, useRef, type ReactElement } from "react";
import type { Group, Mesh } from "three";
import type { BuildingTypeId } from "@/game/data/buildings";
import { C, G, M, mat, uniqueMat, useAnim } from "../kit";

export interface ModelProps {
  working: () => boolean;
  /** 0–1 (montagem do foguete). */
  progress?: () => number;
  level: number;
  oreColor?: string;
  seed?: number;
}

const PI = Math.PI;

function Plate({ r = 0.72, color = C.concrete }: { r?: number; color?: string }) {
  return (
    <>
      <M g={G.cyl(r, r + 0.04, 0.1, 6)} m={mat(color)} p={[0, 0.03, 0]} />
    </>
  );
}

function LevelBadge({ level }: { level: number }) {
  if (level < 2) return null;
  return (
    <group position={[0, 0.1, 0.62]}>
      {Array.from({ length: level - 1 }, (_, i) => (
        <M key={i} g={G.box(0.14, 0.04, 0.05)} m={mat(level >= 3 ? "#fbbf24" : C.yellow, { emissive: "#7a5a00", emissiveIntensity: 0.3 })} p={[0, i * 0.06, 0]} shadow={false} />
      ))}
    </group>
  );
}

/** Luz piscante (antenas, faróis). */
function Blinker({ p, color = "#ff4d4d", speed = 2, size = 0.05 }: { p: [number, number, number]; color?: string; speed?: number; size?: number }) {
  const m = useMemo(() => uniqueMat(color, { emissive: color, emissiveIntensity: 1 }), [color]);
  useAnim((t) => {
    m.emissiveIntensity = (Math.sin(t * speed * PI) > 0.2 ? 2.2 : 0.2);
  });
  return <M g={G.ico(size, 0)} m={m} p={p} shadow={false} />;
}

/** Janela/boca que brilha quando o edifício trabalha. */
function useGlow(color: string, working: () => boolean, base = 0.15, peak = 1.8, flicker = 0) {
  const m = useMemo(() => uniqueMat(color, { emissive: color, emissiveIntensity: base }), [color, base]);
  useAnim((t) => {
    const target = working() ? peak * (1 - flicker * 0.5 + flicker * 0.5 * Math.sin(t * 13 + Math.sin(t * 7))) : base;
    m.emissiveIntensity += (target - m.emissiveIntensity) * 0.12;
  });
  return m;
}

// ───────────────────────────── Sede ─────────────────────────────
function HQ(_props: ModelProps) {
  const dish = useRef<Group>(null);
  const flag = useRef<Mesh>(null);
  const win = useGlow(C.glass, () => true, 0.6, 0.9);
  useAnim((t) => {
    if (dish.current) dish.current.rotation.y = t * 0.4;
    if (flag.current) flag.current.rotation.y = Math.sin(t * 3) * 0.25;
  });
  return (
    <group>
      <Plate r={0.82} color={C.concreteDark} />
      <M g={G.cyl(0.62, 0.62, 0.05, 6)} m={mat(C.concrete)} p={[0, 0.1, 0]} />
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, (i * 2 * PI) / 3, 0]}>
          <M g={G.box(0.07, 0.5, 0.07)} m={mat(C.steel, { metalness: 0.4 })} p={[0, 0.32, 0.42]} r={[0.35, 0, 0]} />
          <M g={G.cyl(0.08, 0.1, 0.04, 6)} m={mat(C.dark)} p={[0, 0.12, 0.5]} />
        </group>
      ))}
      <M g={G.cyl(0.42, 0.46, 0.55, 10)} m={mat(C.white)} p={[0, 0.48, 0]} />
      <mesh geometry={G.cyl(0.47, 0.47, 0.12, 10)} material={win} position={[0, 0.55, 0]} />
      <M g={G.ico(0.43, 1)} m={mat(C.white)} p={[0, 0.76, 0]} s={[1, 0.62, 1]} />
      <M g={G.cyl(0.12, 0.16, 0.08, 8)} m={mat(C.orange)} p={[0, 1.03, 0]} />
      {/* painéis */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.62, 0.52, 0]}>
          <M g={G.box(0.2, 0.04, 0.04)} m={mat(C.steel)} p={[-s * 0.12, 0, 0]} />
          <M g={G.box(0.32, 0.03, 0.42)} m={mat(C.panel, { metalness: 0.3, roughness: 0.35 })} p={[s * 0.06, 0, 0]} r={[0, 0, s * 0.35]} />
        </group>
      ))}
      {/* antena */}
      <M g={G.cyl(0.02, 0.025, 0.6, 5)} m={mat(C.steel)} p={[0.18, 1.2, -0.1]} />
      <Blinker p={[0.18, 1.52, -0.1]} />
      <group ref={dish} position={[-0.22, 1.02, 0.05]}>
        <M g={G.cyl(0.02, 0.02, 0.18, 5)} m={mat(C.steel)} p={[0, 0.06, 0]} />
        <M g={G.cone(0.16, 0.08, 8)} m={mat(C.white)} p={[0, 0.17, 0.02]} r={[2.4, 0, 0]} />
      </group>
      {/* bandeira */}
      <M g={G.cyl(0.015, 0.015, 0.7, 4)} m={mat(C.steel)} p={[0.55, 0.45, 0.45]} />
      <mesh ref={flag} geometry={G.box(0.26, 0.15, 0.01)} material={mat(C.orange)} position={[0.55, 0.72, 0.45]}>
        <mesh geometry={G.box(0.26, 0.15, 0.01)} material={mat(C.orange)} position={[0.13, 0, 0]} />
      </mesh>
    </group>
  );
}

// ───────────────────────────── Armazém ─────────────────────────────
function Warehouse({ level }: ModelProps) {
  return (
    <group>
      <Plate />
      <M g={G.box(1.0, 0.55, 0.7)} m={mat("#64748b")} p={[0, 0.36, -0.05]} />
      <M g={G.roof(1.06, 0.3, 0.78)} m={mat(C.orange)} p={[0, 0.635, -0.05]} />
      <M g={G.box(0.4, 0.38, 0.02)} m={mat(C.dark)} p={[0, 0.28, 0.31]} />
      {[-0.13, 0, 0.13].map((x) => (
        <M key={x} g={G.box(0.12, 0.38, 0.025)} m={mat("#475569")} p={[x, 0.28, 0.315]} shadow={false} />
      ))}
      <M g={G.box(0.2, 0.2, 0.2)} m={mat(C.wood)} p={[0.48, 0.18, 0.42]} r={[0, 0.3, 0]} />
      <M g={G.box(0.16, 0.16, 0.16)} m={mat(C.woodDark)} p={[0.5, 0.36, 0.42]} r={[0, 0.8, 0]} />
      <M g={G.box(0.18, 0.18, 0.18)} m={mat(C.wood)} p={[-0.5, 0.17, 0.4]} r={[0, -0.4, 0]} />
      <LevelBadge level={level} />
    </group>
  );
}

// ───────────────────────────── Central de drones ─────────────────────────────
function DroneHub({ working, level }: ModelProps) {
  const drone = useRef<Group>(null);
  const beacon = useRef<Group>(null);
  useAnim((t) => {
    if (beacon.current) beacon.current.rotation.y = t * 3;
    if (drone.current) {
      const w = working();
      drone.current.position.y = 0.32 + (w ? 0.25 + Math.sin(t * 2) * 0.12 : 0);
      drone.current.rotation.y = t * (w ? 1.5 : 0);
    }
  });
  return (
    <group>
      <Plate />
      <M g={G.cyl(0.5, 0.52, 0.16, 12)} m={mat(C.dark)} p={[0, 0.15, 0.08]} />
      <M g={G.torus(0.36, 0.025, 4, 20)} m={mat(C.yellow)} p={[0, 0.24, 0.08]} r={[PI / 2, 0, 0]} shadow={false} />
      <M g={G.box(0.05, 0.01, 0.26)} m={mat(C.white)} p={[-0.09, 0.24, 0.08]} shadow={false} />
      <M g={G.box(0.05, 0.01, 0.26)} m={mat(C.white)} p={[0.09, 0.24, 0.08]} shadow={false} />
      <M g={G.box(0.18, 0.01, 0.05)} m={mat(C.white)} p={[0, 0.24, 0.08]} shadow={false} />
      <M g={G.box(0.22, 0.9, 0.22)} m={mat(C.white)} p={[0.5, 0.5, -0.45]} />
      <M g={G.box(0.3, 0.18, 0.3)} m={mat(C.glass, { emissive: C.glass, emissiveIntensity: 0.5 })} p={[0.5, 1.03, -0.45]} />
      <group ref={beacon} position={[0.5, 1.18, -0.45]}>
        <M g={G.box(0.2, 0.05, 0.05)} m={mat("#ef4444", { emissive: "#ef4444", emissiveIntensity: 1.5 })} shadow={false} />
      </group>
      <group ref={drone} position={[0, 0.32, 0.08]}>
        <MiniDrone />
      </group>
      <LevelBadge level={level} />
    </group>
  );
}

export function MiniDrone() {
  return (
    <group>
      <M g={G.box(0.16, 0.06, 0.16)} m={mat(C.white)} />
      {[
        [0.12, 0.12],
        [-0.12, 0.12],
        [0.12, -0.12],
        [-0.12, -0.12],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.03, z]}>
          <M g={G.box(0.03, 0.03, 0.03)} m={mat(C.dark)} />
          <M g={G.cyl(0.06, 0.06, 0.01, 8)} m={mat(C.steel, { opacity: 0.6 })} p={[0, 0.03, 0]} shadow={false} />
        </group>
      ))}
      <M g={G.ico(0.03, 0)} m={mat("#22d3ee", { emissive: "#22d3ee", emissiveIntensity: 1.5 })} p={[0, -0.04, 0.06]} shadow={false} />
    </group>
  );
}

// ───────────────────────────── Lenhador ─────────────────────────────
function Woodcutter({ working, level }: ModelProps) {
  const axe = useRef<Group>(null);
  useAnim((t) => {
    if (!axe.current) return;
    axe.current.rotation.x = working() ? -0.4 - Math.abs(Math.sin(t * 3.2)) * 1.4 : -0.3;
  });
  return (
    <group>
      <Plate color="#a68a64" />
      <M g={G.box(0.6, 0.42, 0.48)} m={mat(C.wood)} p={[-0.12, 0.29, -0.15]} />
      <M g={G.roof(0.7, 0.3, 0.6)} m={mat(C.roofRed)} p={[-0.12, 0.5, -0.15]} />
      <M g={G.box(0.14, 0.24, 0.02)} m={mat(C.woodDark)} p={[-0.12, 0.2, 0.1]} />
      <M g={G.box(0.12, 0.1, 0.02)} m={mat(C.glass, { emissive: "#ffd27a", emissiveIntensity: 0.4 })} p={[-0.32, 0.32, 0.1]} />
      <M g={G.cyl(0.04, 0.04, 0.28, 5)} m={mat(C.dark)} p={[0.05, 0.62, -0.25]} />
      {/* pilha de toras */}
      {[
        [0.38, 0.12, -0.05],
        [0.38, 0.12, 0.13],
        [0.38, 0.28, 0.04],
      ].map((p, i) => (
        <group key={i} position={p as [number, number, number]} rotation={[0, 0, PI / 2]}>
          <M g={G.cyl(0.08, 0.08, 0.42, 6)} m={mat(C.woodDark)} />
          <M g={G.cyl(0.07, 0.07, 0.43, 6)} m={mat("#e0b57a")} shadow={false} />
        </group>
      ))}
      {/* toco + machado */}
      <M g={G.cyl(0.11, 0.13, 0.16, 7)} m={mat(C.woodDark)} p={[0.18, 0.15, 0.4]} />
      <group ref={axe} position={[0.18, 0.24, 0.22]}>
        <M g={G.box(0.03, 0.03, 0.3)} m={mat("#7c4a1e")} p={[0, 0, 0.12]} />
        <M g={G.box(0.02, 0.09, 0.08)} m={mat(C.steel, { metalness: 0.6, roughness: 0.3 })} p={[0, 0.03, 0.26]} />
      </group>
      <LevelBadge level={level} />
    </group>
  );
}

// ───────────────────────────── Mineradora ─────────────────────────────
function Miner({ working, level, oreColor = "#a86b55" }: ModelProps) {
  const drill = useRef<Group>(null);
  const wheel = useRef<Mesh>(null);
  useAnim((t, dt) => {
    const w = working();
    if (drill.current) {
      drill.current.rotation.y += dt * (w ? 9 : 0);
      drill.current.position.y = 0.55 + (w ? Math.sin(t * 5) * 0.06 : 0.1);
    }
    if (wheel.current && w) wheel.current.rotation.z += dt * 3;
  });
  return (
    <group>
      <Plate color={C.concreteDark} />
      <M g={G.box(0.7, 0.22, 0.7)} m={mat(C.yellowDark)} p={[0, 0.18, 0]} />
      {[
        [0.28, 0.28],
        [-0.28, 0.28],
        [0.28, -0.28],
        [-0.28, -0.28],
      ].map(([x, z], i) => (
        <M key={i} g={G.box(0.06, 1.05, 0.06)} m={mat(C.yellow)} p={[x * 0.8, 0.78, z * 0.8]} r={[(z > 0 ? -1 : 1) * 0.12, 0, (x > 0 ? 1 : -1) * 0.12]} />
      ))}
      <M g={G.box(0.36, 0.14, 0.36)} m={mat(C.yellow)} p={[0, 1.3, 0]} />
      <Blinker p={[0, 1.42, 0]} color="#fbbf24" speed={1.5} />
      <group ref={drill} position={[0, 0.55, 0]}>
        <M g={G.cyl(0.05, 0.05, 0.8, 6)} m={mat(C.steel, { metalness: 0.5 })} p={[0, 0.35, 0]} />
        <M g={G.cone(0.16, 0.36, 6)} m={mat(C.steel, { metalness: 0.6, roughness: 0.3 })} p={[0, -0.18, 0]} r={[PI, 0, 0]} />
      </group>
      {/* carrinho de minério */}
      <group position={[0.45, 0.15, 0.35]}>
        <M g={G.box(0.26, 0.14, 0.2)} m={mat(C.dark)} p={[0, 0.08, 0]} />
        <M g={G.ico(0.1, 0)} m={mat(oreColor)} p={[0, 0.18, 0]} s={[1.2, 0.6, 1]} />
        <mesh ref={wheel} geometry={G.cyl(0.05, 0.05, 0.22, 6)} material={mat(C.darker)} position={[0, 0, 0]} rotation={[PI / 2, 0, 0]} />
      </group>
      <LevelBadge level={level} />
    </group>
  );
}

// ───────────────────────────── Serraria ─────────────────────────────
function Sawmill({ working, level }: ModelProps) {
  const blade = useRef<Mesh>(null);
  useAnim((_t, dt) => {
    if (blade.current) blade.current.rotation.x += dt * (working() ? 18 : 0);
  });
  return (
    <group>
      <Plate color="#a68a64" />
      {[
        [0.35, 0.28],
        [-0.35, 0.28],
        [0.35, -0.28],
        [-0.35, -0.28],
      ].map(([x, z], i) => (
        <M key={i} g={G.box(0.06, 0.62, 0.06)} m={mat(C.woodDark)} p={[x, 0.39, z]} />
      ))}
      <M g={G.box(0.88, 0.05, 0.72)} m={mat("#7c2d12")} p={[0, 0.72, 0]} r={[0.1, 0, 0]} />
      <M g={G.box(0.7, 0.12, 0.26)} m={mat(C.wood)} p={[0, 0.2, 0]} />
      <mesh ref={blade} geometry={G.cyl(0.2, 0.2, 0.02, 12)} material={mat(C.steel, { metalness: 0.7, roughness: 0.25 })} position={[0, 0.3, 0]} rotation={[0, 0, PI / 2]} castShadow />
      <group position={[-0.22, 0.31, 0]} rotation={[0, 0, PI / 2]}>
        <M g={G.cyl(0.07, 0.07, 0.36, 6)} m={mat(C.woodDark)} />
      </group>
      {[0.12, 0.2].map((y) => (
        <M key={y} g={G.box(0.5, 0.04, 0.12)} m={mat("#e0b57a")} p={[0.05, y, 0.42]} />
      ))}
      <LevelBadge level={level} />
    </group>
  );
}

// ───────────────────────────── Fundição ─────────────────────────────
function Smelter({ working, level }: ModelProps) {
  const glow = useGlow("#ff7a1a", working, 0.15, 2.4, 0.6);
  return (
    <group>
      <Plate color={C.concreteDark} />
      <M g={G.box(0.72, 0.56, 0.6)} m={mat(C.brick)} p={[0, 0.34, 0]} />
      <M g={G.box(0.78, 0.08, 0.66)} m={mat(C.brickDark)} p={[0, 0.65, 0]} />
      <M g={G.box(0.5, 0.2, 0.42)} m={mat(C.brick)} p={[0, 0.79, -0.04]} />
      <mesh geometry={G.box(0.3, 0.22, 0.04)} material={glow} position={[0, 0.25, 0.3]} />
      <M g={G.box(0.38, 0.05, 0.06)} m={mat(C.dark)} p={[0, 0.38, 0.31]} />
      <M g={G.cyl(0.11, 0.14, 1.0, 8)} m={mat(C.brickDark)} p={[0.24, 1.0, -0.2]} />
      <M g={G.cyl(0.13, 0.13, 0.08, 8)} m={mat(C.dark)} p={[0.24, 1.52, -0.2]} />
      <M g={G.cone(0.2, 0.25, 6)} m={mat(C.steel)} p={[-0.25, 1.0, 0.05]} r={[PI, 0, 0]} />
      <M g={G.box(0.06, 0.25, 0.06)} m={mat(C.steel)} p={[-0.25, 0.8, 0.05]} />
      <LevelBadge level={level} />
    </group>
  );
}

// ───────────────────────────── Montadora ─────────────────────────────
function Assembler({ working, level }: ModelProps) {
  const arm = useRef<Group>(null);
  const fore = useRef<Group>(null);
  useAnim((t) => {
    const w = working();
    if (arm.current) arm.current.rotation.y = w ? Math.sin(t * 2.2) * 1.2 : 0;
    if (fore.current) fore.current.rotation.x = w ? -0.6 + Math.sin(t * 4.4) * 0.4 : -0.3;
  });
  const win = useGlow("#bae6fd", working, 0.2, 1.1);
  return (
    <group>
      <Plate color={C.concreteDark} />
      <M g={G.box(0.86, 0.5, 0.62)} m={mat(C.blue)} p={[0, 0.33, -0.08]} />
      {[-0.28, 0, 0.28].map((x) => (
        <M key={x} g={G.roof(0.62, 0.2, 0.28)} m={mat(C.white)} p={[x, 0.58, -0.08]} r={[0, PI / 2, 0]} />
      ))}
      <mesh geometry={G.box(0.7, 0.1, 0.02)} material={win} position={[0, 0.42, 0.235]} />
      <M g={G.box(0.24, 0.26, 0.02)} m={mat(C.blueDark)} p={[-0.25, 0.2, 0.235]} />
      {/* braço robótico */}
      <group position={[0.38, 0.1, 0.38]}>
        <M g={G.cyl(0.08, 0.1, 0.08, 8)} m={mat(C.dark)} />
        <group ref={arm}>
          <M g={G.box(0.06, 0.3, 0.06)} m={mat(C.orange)} p={[0, 0.18, 0]} />
          <group ref={fore} position={[0, 0.32, 0]}>
            <M g={G.box(0.05, 0.05, 0.24)} m={mat(C.orange)} p={[0, 0, 0.1]} />
            <M g={G.box(0.08, 0.06, 0.04)} m={mat(C.dark)} p={[0, -0.02, 0.23]} />
          </group>
        </group>
      </group>
      <LevelBadge level={level} />
    </group>
  );
}

// ───────────────────────────── Fábrica avançada ─────────────────────────────
function Factory({ working, level }: ModelProps) {
  const gear = useRef<Mesh>(null);
  const win = useGlow("#93c5fd", working, 0.3, 1.4);
  useAnim((_t, dt) => {
    if (gear.current && working()) gear.current.rotation.z += dt * 1.5;
  });
  return (
    <group>
      <Plate r={0.78} color={C.concreteDark} />
      <M g={G.box(1.02, 0.66, 0.74)} m={mat(C.white)} p={[0, 0.42, -0.04]} />
      <M g={G.box(1.04, 0.12, 0.76)} m={mat(C.blue)} p={[0, 0.62, -0.04]} />
      <M g={G.box(0.6, 0.3, 0.5)} m={mat(C.light)} p={[-0.15, 0.9, -0.1]} />
      <mesh geometry={G.box(0.84, 0.14, 0.02)} material={win} position={[0, 0.38, 0.335]} />
      <M g={G.box(0.3, 0.28, 0.02)} m={mat(C.dark)} p={[0.25, 0.16, 0.335]} />
      <M g={G.cyl(0.08, 0.1, 0.9, 8)} m={mat(C.steel)} p={[0.32, 1.1, -0.28]} />
      <M g={G.cyl(0.08, 0.1, 0.7, 8)} m={mat(C.steel)} p={[0.12, 1.0, -0.3]} />
      <M g={G.cyl(0.1, 0.1, 0.06, 8)} m={mat("#ef4444")} p={[0.32, 1.52, -0.28]} />
      <mesh ref={gear} geometry={G.torus(0.13, 0.04, 4, 8)} material={mat(C.yellow, { metalness: 0.4 })} position={[-0.3, 0.42, 0.345]} />
      <LevelBadge level={level} />
    </group>
  );
}

// ───────────────────────────── Laboratório ─────────────────────────────
function Lab({ working, level }: ModelProps) {
  const dish = useRef<Group>(null);
  const win = useGlow("#c084fc", working, 0.3, 2.2);
  useAnim((t) => {
    if (dish.current) dish.current.rotation.y = working() ? t * 0.8 : 0.4;
  });
  return (
    <group>
      <Plate color={C.concrete} />
      <M g={G.box(0.84, 0.48, 0.6)} m={mat(C.white)} p={[0, 0.32, 0]} />
      <mesh geometry={G.box(0.86, 0.1, 0.62)} material={win} position={[0, 0.38, 0]} />
      <M g={G.ico(0.3, 1)} m={mat(C.light)} p={[-0.15, 0.58, 0]} s={[1, 0.8, 1]} />
      <M g={G.box(0.06, 0.24, 0.32)} m={mat(C.dark)} p={[-0.15, 0.72, 0.02]} r={[0, 0, 0.3]} />
      <group ref={dish} position={[0.28, 0.56, -0.1]}>
        <M g={G.cyl(0.025, 0.025, 0.3, 5)} m={mat(C.steel)} p={[0, 0.14, 0]} />
        <M g={G.cone(0.18, 0.08, 10)} m={mat(C.white)} p={[0, 0.32, 0.04]} r={[2.3, 0, 0]} />
        <M g={G.ico(0.03, 0)} m={mat(C.purple, { emissive: C.purple, emissiveIntensity: 1.5 })} p={[0, 0.36, 0.1]} shadow={false} />
      </group>
      <M g={G.box(0.2, 0.26, 0.02)} m={mat(C.dark)} p={[0.18, 0.21, 0.305]} />
      <LevelBadge level={level} />
    </group>
  );
}

// ───────────────────────────── Geradores ─────────────────────────────
function BiomassGen({ working, level }: ModelProps) {
  const glow = useGlow("#ff8a3d", working, 0.1, 2.2, 0.8);
  return (
    <group>
      <Plate color="#a68a64" />
      <M g={G.cyl(0.3, 0.32, 0.72, 10)} m={mat("#4d7c0f")} p={[-0.15, 0.44, -0.08]} />
      <M g={G.cyl(0.32, 0.32, 0.06, 10)} m={mat("#365314")} p={[-0.15, 0.8, -0.08]} />
      <M g={G.box(0.36, 0.36, 0.36)} m={mat(C.brick)} p={[0.25, 0.26, 0.15]} />
      <mesh geometry={G.box(0.18, 0.14, 0.02)} material={glow} position={[0.25, 0.2, 0.335]} />
      <M g={G.cyl(0.07, 0.08, 0.6, 6)} m={mat(C.dark)} p={[0.32, 0.72, 0.05]} />
      <M g={G.box(0.06, 0.06, 0.4)} m={mat(C.steel)} p={[0.05, 0.55, 0.0]} r={[0, 0.9, 0]} />
      {[0, 1].map((i) => (
        <group key={i} position={[-0.35, 0.12 + i * 0.13, 0.42]} rotation={[0, 0, PI / 2]}>
          <M g={G.cyl(0.06, 0.06, 0.3, 6)} m={mat(C.woodDark)} />
        </group>
      ))}
      <LevelBadge level={level} />
    </group>
  );
}

function CoalGen({ working, level }: ModelProps) {
  const glow = useGlow("#ffb347", working, 0.15, 1.6);
  return (
    <group>
      <Plate r={0.78} color={C.concreteDark} />
      <M g={G.cyl(0.3, 0.42, 0.85, 12)} m={mat("#d6d3d1")} p={[-0.2, 0.5, -0.1]} />
      <M g={G.cyl(0.33, 0.3, 0.4, 12)} m={mat("#d6d3d1")} p={[-0.2, 1.12, -0.1]} />
      <M g={G.cyl(0.33, 0.33, 0.04, 12)} m={mat("#a8a29e")} p={[-0.2, 1.33, -0.1]} />
      <M g={G.box(0.42, 0.42, 0.5)} m={mat(C.dark)} p={[0.32, 0.3, 0.12]} />
      <mesh geometry={G.box(0.3, 0.08, 0.02)} material={glow} position={[0.32, 0.36, 0.375]} />
      {[0, 1, 2].map((i) => (
        <M key={i} g={G.cyl(0.07, 0.075, 0.26, 8)} m={mat(i % 2 ? C.white : "#dc2626")} p={[0.42, 0.63 + i * 0.26, -0.3]} />
      ))}
      <LevelBadge level={level} />
    </group>
  );
}

function WindTurbine({ working, level }: ModelProps) {
  const rotor = useRef<Group>(null);
  useAnim((_t, dt) => {
    if (rotor.current) rotor.current.rotation.z += dt * (working() ? 2.4 : 0.3);
  });
  return (
    <group>
      <Plate r={0.4} />
      <M g={G.cyl(0.05, 0.11, 2.5, 8)} m={mat(C.white)} p={[0, 1.3, 0]} />
      <M g={G.box(0.16, 0.16, 0.38)} m={mat(C.white)} p={[0, 2.58, -0.04]} />
      <group ref={rotor} position={[0, 2.58, 0.18]}>
        <M g={G.cone(0.08, 0.16, 8)} m={mat(C.light)} r={[PI / 2, 0, 0]} />
        {[0, 1, 2].map((i) => (
          <group key={i} rotation={[0, 0, (i * 2 * PI) / 3]}>
            <M g={G.box(0.1, 0.95, 0.02)} m={mat(C.white)} p={[0.02, 0.5, 0]} r={[0, 0.25, 0]} />
            <M g={G.box(0.1, 0.1, 0.021)} m={mat("#ef4444")} p={[0.02, 0.93, 0]} r={[0, 0.25, 0]} shadow={false} />
          </group>
        ))}
      </group>
      <LevelBadge level={level} />
    </group>
  );
}

function SolarPanel({ level }: ModelProps) {
  return (
    <group>
      <Plate />
      {[
        [-0.22, -0.2],
        [0.22, -0.2],
        [-0.22, 0.24],
        [0.22, 0.24],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.25, z]}>
          <M g={G.box(0.04, 0.24, 0.04)} m={mat(C.steel)} p={[0, -0.05, 0]} />
          <group rotation={[-0.5, 0, 0]} position={[0, 0.08, 0]}>
            <M g={G.box(0.4, 0.03, 0.36)} m={mat(C.light)} />
            <M g={G.box(0.37, 0.035, 0.33)} m={mat(C.panel, { metalness: 0.5, roughness: 0.2, emissive: "#1e40af", emissiveIntensity: 0.15 })} shadow={false} />
            <M g={G.box(0.005, 0.04, 0.33)} m={mat(C.light)} shadow={false} />
            <M g={G.box(0.37, 0.04, 0.005)} m={mat(C.light)} shadow={false} />
          </group>
        </group>
      ))}
      <LevelBadge level={level} />
    </group>
  );
}

function Fusion({ working, level }: ModelProps) {
  const ring = useRef<Group>(null);
  const core = useGlow("#22d3ee", working, 0.6, 3.2);
  useAnim((t, dt) => {
    if (ring.current) {
      ring.current.rotation.y += dt * (working() ? 1.2 : 0.2);
      ring.current.position.y = 0.62 + Math.sin(t * 1.3) * 0.03;
    }
  });
  return (
    <group>
      <Plate r={0.8} color={C.concreteDark} />
      <M g={G.cyl(0.62, 0.66, 0.22, 12)} m={mat(C.light)} p={[0, 0.18, 0]} />
      <mesh geometry={G.torus(0.42, 0.12, 6, 16)} material={core} position={[0, 0.5, 0]} rotation={[PI / 2, 0, 0]} />
      <group ref={ring} position={[0, 0.62, 0]}>
        <M g={G.torus(0.5, 0.04, 4, 20)} m={mat(C.steel, { metalness: 0.6, roughness: 0.3 })} r={[PI / 2, 0, 0]} />
        {[0, 1, 2, 3].map((i) => (
          <M key={i} g={G.box(0.08, 0.2, 0.08)} m={mat(C.dark)} p={[Math.cos((i * PI) / 2) * 0.5, 0, Math.sin((i * PI) / 2) * 0.5]} />
        ))}
      </group>
      <mesh geometry={G.cyl(0.1, 0.1, 1.1, 8)} material={core} position={[0, 0.85, 0]} />
      <M g={G.cyl(0.16, 0.16, 0.08, 8)} m={mat(C.dark)} p={[0, 1.42, 0]} />
      <LevelBadge level={level} />
    </group>
  );
}

// ───────────────────────────── Ambiente ─────────────────────────────
function Nursery({ working, level }: ModelProps) {
  const spr = useRef<Group>(null);
  useAnim((t) => {
    if (spr.current) spr.current.rotation.y = working() ? t * 2 : 0;
  });
  return (
    <group>
      <Plate color="#8a7a55" />
      <M g={G.box(0.82, 0.04, 0.62)} m={mat("#6b4f2a")} p={[0, 0.1, 0]} />
      {[
        [-0.25, -0.12],
        [0.05, 0.1],
        [0.28, -0.14],
        [-0.12, 0.16],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.12, z]}>
          <M g={G.cyl(0.02, 0.025, 0.14, 4)} m={mat(C.woodDark)} p={[0, 0.07, 0]} />
          <M g={G.ico(0.1 + (i % 2) * 0.03, 0)} m={mat(i % 2 ? "#4ade80" : "#22c55e")} p={[0, 0.2, 0]} />
        </group>
      ))}
      <M g={G.box(0.86, 0.48, 0.66)} m={mat("#bae6fd", { opacity: 0.28, roughness: 0.1 })} p={[0, 0.36, 0]} shadow={false} />
      <M g={G.roof(0.88, 0.22, 0.68)} m={mat("#bae6fd", { opacity: 0.35, roughness: 0.1 })} p={[0, 0.6, 0]} shadow={false} />
      {[-0.43, 0.43].map((x) => (
        <M key={x} g={G.box(0.03, 0.5, 0.03)} m={mat(C.white)} p={[x, 0.36, 0.33]} shadow={false} />
      ))}
      <group ref={spr} position={[0, 0.66, 0]}>
        <M g={G.box(0.36, 0.02, 0.02)} m={mat(C.steel)} />
      </group>
      <LevelBadge level={level} />
    </group>
  );
}

function Purifier({ working, level }: ModelProps) {
  const fan = useRef<Group>(null);
  const glow = useGlow("#4ade80", working, 0.2, 2);
  useAnim((_t, dt) => {
    if (fan.current) fan.current.rotation.y += dt * (working() ? 6 : 0.3);
  });
  return (
    <group>
      <Plate />
      <M g={G.cyl(0.32, 0.38, 1.4, 10)} m={mat(C.white)} p={[0, 0.78, 0]} />
      <mesh geometry={G.cyl(0.335, 0.335, 0.1, 10)} material={glow} position={[0, 0.5, 0]} />
      <mesh geometry={G.cyl(0.325, 0.325, 0.1, 10)} material={glow} position={[0, 1.05, 0]} />
      <M g={G.torus(0.34, 0.05, 4, 16)} m={mat(C.steel)} p={[0, 1.5, 0]} r={[PI / 2, 0, 0]} />
      <group ref={fan} position={[0, 1.52, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <M key={i} g={G.box(0.28, 0.02, 0.08)} m={mat(C.dark)} p={[Math.cos((i * PI) / 2) * 0.15, 0, Math.sin((i * PI) / 2) * 0.15]} r={[0.3, (i * PI) / 2, 0]} shadow={false} />
        ))}
      </group>
      {[0, 1, 2].map((i) => (
        <M key={i} g={G.box(0.12, 0.3, 0.12)} m={mat(C.greenDark)} p={[Math.cos((i * 2 * PI) / 3) * 0.48, 0.2, Math.sin((i * 2 * PI) / 3) * 0.48]} />
      ))}
      <LevelBadge level={level} />
    </group>
  );
}

// ───────────────────────────── Plataforma de lançamento ─────────────────────────────
export function Rocket() {
  return (
    <group>
      <M g={G.cyl(0.16, 0.18, 1.3, 10)} m={mat(C.white)} p={[0, 0.65, 0]} />
      <M g={G.cyl(0.17, 0.17, 0.12, 10)} m={mat("#ef4444")} p={[0, 1.0, 0]} />
      <M g={G.cone(0.16, 0.45, 10)} m={mat("#ef4444")} p={[0, 1.52, 0]} />
      <M g={G.cyl(0.06, 0.06, 0.03, 8)} m={mat(C.glass, { emissive: C.glass, emissiveIntensity: 0.8 })} p={[0, 1.15, 0.16]} r={[PI / 2, 0, 0]} />
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, (i * 2 * PI) / 3, 0]}>
          <M g={G.box(0.03, 0.32, 0.22)} m={mat("#ef4444")} p={[0, 0.16, 0.22]} />
        </group>
      ))}
      <M g={G.cyl(0.1, 0.14, 0.12, 8)} m={mat(C.dark)} p={[0, -0.04, 0]} />
    </group>
  );
}

function RocketPad({ progress, level }: ModelProps) {
  const rocket = useRef<Group>(null);
  const crane = useRef<Group>(null);
  useAnim((t) => {
    const pr = progress ? progress() : 1;
    if (rocket.current) {
      rocket.current.visible = pr > 0.01;
      rocket.current.scale.set(1, Math.max(0.05, pr), 1);
    }
    if (crane.current) crane.current.rotation.y = pr > 0 && pr < 1 ? Math.sin(t * 0.7) * 0.8 : 0;
  });
  return (
    <group>
      <Plate r={0.82} color={C.concreteDark} />
      <M g={G.cyl(0.5, 0.56, 0.18, 12)} m={mat(C.dark)} p={[0, 0.16, 0]} />
      <M g={G.torus(0.36, 0.03, 4, 18)} m={mat(C.yellow)} p={[0, 0.26, 0]} r={[PI / 2, 0, 0]} shadow={false} />
      {/* torre */}
      <group position={[0.52, 0, -0.32]}>
        {[
          [0.08, 0.08],
          [-0.08, 0.08],
          [0.08, -0.08],
          [-0.08, -0.08],
        ].map(([x, z], i) => (
          <M key={i} g={G.box(0.035, 2.4, 0.035)} m={mat("#ef4444")} p={[x, 1.25, z]} />
        ))}
        {[0.5, 1.0, 1.5, 2.0].map((y) => (
          <M key={y} g={G.box(0.2, 0.03, 0.2)} m={mat("#ef4444")} p={[0, y, 0]} />
        ))}
        <group ref={crane} position={[0, 2.45, 0]}>
          <M g={G.box(0.7, 0.05, 0.06)} m={mat(C.yellow)} p={[-0.3, 0, 0]} />
          <Blinker p={[0.04, 0.06, 0]} />
        </group>
      </group>
      <group ref={rocket} position={[0, 0.3, 0]}>
        <Rocket />
      </group>
      <LevelBadge level={level} />
    </group>
  );
}

export const MODELS: Partial<Record<BuildingTypeId, (p: ModelProps) => ReactElement | null>> = {
  hq: HQ,
  warehouse: Warehouse,
  droneHub: DroneHub,
  woodcutter: Woodcutter,
  miner: Miner,
  sawmill: Sawmill,
  smelter: Smelter,
  assembler: Assembler,
  factory: Factory,
  lab: Lab,
  biomassGen: BiomassGen,
  coalGen: CoalGen,
  windTurbine: WindTurbine,
  solarPanel: SolarPanel,
  fusion: Fusion,
  nursery: Nursery,
  purifier: Purifier,
  rocketPad: RocketPad,
};

/** Pontos de saída de fumaça (espaço local do modelo). */
export const SMOKE_POINTS: Partial<Record<BuildingTypeId, [number, number, number][]>> = {
  smelter: [[0.24, 1.6, -0.2]],
  biomassGen: [[0.32, 1.05, 0.05]],
  coalGen: [
    [-0.2, 1.4, -0.1],
    [0.42, 1.42, -0.3],
  ],
  factory: [[0.32, 1.58, -0.28]],
  miner: [],
};

