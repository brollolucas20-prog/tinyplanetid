import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PlanetDiorama, StaticStars } from "../components/PlanetDiorama";
import { SceneCamera, SceneLights } from "../components/SceneCamera";

/** Fundo da tela de título: Verdália industrializada girando em loop perfeito. */
export const TitleBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const rotation = (frame / durationInFrames) * Math.PI * 2;
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at 68% 48%, #22307a 0%, #0d1236 42%, #05060f 100%)",
      }}
    >
      <ThreeCanvas width={width} height={height} shadows camera={{ position: [0, 6, 52], fov: 36, near: 0.5, far: 1200 }}>
        <SceneCamera position={[0, 7, 52]} target={[1, 0, 0]} />
        <SceneLights />
        <StaticStars />
        <PlanetDiorama planetId="verdalia" time={frame / fps} rotation={rotation} position={[15, -0.5, 0]} tilt={0.4} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
