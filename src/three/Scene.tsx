import { Suspense } from "react";
import { useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Planet from "./Planet";
import Buildings from "./Buildings";
import Meteors from "./Meteors";
import Sky from "./Sky";
import Clouds from "./Clouds";
import { useGame } from "../game/store";

/** Dikey ekranlarda gezegen sığsın diye kamerayı geri çeker. */
function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const dist = aspect < 1 ? 42 * Math.min(1.7, 1.15 / aspect) : 42;
    const dir = camera.position.clone().normalize();
    camera.position.copy(dir.multiplyScalar(dist));
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Loop() {
  useFrame((_, dt) => useGame.getState().tick(Math.min(dt, 0.1)));
  return null;
}

export default function Scene() {
  const low = useGame((s) => s.quality === "low");
  return (
    <Canvas key={low ? "low" : "high"} shadows={!low} dpr={low ? 1 : [1, 1.75]} camera={{ position: [0, 15, 42], fov: 40, near: 0.5, far: 400 }} gl={{ antialias: !low, powerPreference: "high-performance" }} className="!absolute inset-0">
      <Suspense fallback={null}>
        <Sky />
        <Planet />
        <Buildings />
        <Meteors />
        <Clouds />
        <Loop />
        <CameraFit />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={24} maxDistance={80} autoRotate autoRotateSpeed={0.35} rotateSpeed={0.55} dampingFactor={0.08} enableDamping makeDefault />
    </Canvas>
  );
}
