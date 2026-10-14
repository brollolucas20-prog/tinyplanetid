import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";

/** Posiciona a câmera de forma determinística a cada quadro do Remotion. */
export function SceneCamera({
  position,
  target = [0, 0, 0],
  fov,
}: {
  position: [number, number, number];
  target?: [number, number, number];
  fov?: number;
}) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(target[0], target[1], target[2]);
    if (fov && "fov" in camera && camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

/** Luz padrão das cenas do Remotion (sol + preenchimento). */
export function SceneLights({ sun = [40, 22, 34] }: { sun?: [number, number, number] }) {
  return (
    <>
      <ambientLight intensity={0.45} color="#c7d2fe" />
      <directionalLight
        position={sun}
        intensity={2.7}
        color="#fff1d6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[-sun[0], -sun[1] * 0.4, -sun[2]]} intensity={0.5} color="#6d8cff" />
    </>
  );
}
