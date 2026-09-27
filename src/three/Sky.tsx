import { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { dayPhase, NIGHT_START } from "../game/rules";
import { useGame } from "../game/store";

const DAY_BG = new THREE.Color("#121a3d"), NIGHT_BG = new THREE.Color("#04050d");
const SUN_DAY = new THREE.Color("#fff4d6"), SUN_DUSK = new THREE.Color("#ff9a5c");

/** Güneş/ay yörüngesi, ışık şiddeti ve arka plan rengi gün döngüsüne bağlı. */
export default function Sky() {
  const low = useGame((s) => s.quality === "low");
  const sun = useRef<THREE.DirectionalLight>(null!);
  const moon = useRef<THREE.DirectionalLight>(null!);
  const ambient = useRef<THREE.AmbientLight>(null!);
  const sunBall = useRef<THREE.Mesh>(null!);
  const moonBall = useRef<THREE.Mesh>(null!);
  const bg = useRef(new THREE.Color());
  const scene = useThree((s) => s.scene);

  useFrame(() => {
    const phase = dayPhase(useGame.getState().time);
    const a = phase * Math.PI * 2 - Math.PI / 2; // gün ortasında güneş tepede
    const sx = Math.cos(a) * 46, sy = Math.sin(a) * 36, sz = 18;
    sun.current.position.set(sx, sy, sz);
    moon.current.position.set(-sx, -sy, -sz * 0.6);
    sunBall.current.position.set(sx * 1.6, sy * 1.6, sz * 1.6);
    moonBall.current.position.set(-sx * 1.6, -sy * 1.6, -sz);
    // gece yoğunluğu: 0 gündüz → 1 gece (yumuşak geçiş)
    const night = THREE.MathUtils.smoothstep(phase, NIGHT_START - 0.08, NIGHT_START + 0.04) * (1 - THREE.MathUtils.smoothstep(phase, 0.94, 1));
    const dusk = Math.max(0, 1 - Math.abs(phase - NIGHT_START) / 0.12);
    sun.current.intensity = THREE.MathUtils.lerp(2.4, 0.08, night);
    sun.current.color.copy(SUN_DAY).lerp(SUN_DUSK, dusk);
    moon.current.intensity = THREE.MathUtils.lerp(0.05, 1.0, night);
    ambient.current.intensity = THREE.MathUtils.lerp(0.42, 0.2, night);
    bg.current.copy(DAY_BG).lerp(NIGHT_BG, night);
    scene.background = bg.current;
  });

  return (
    <>
      <Stars radius={110} depth={50} count={low ? 1200 : 2600} factor={4} saturation={0} fade speed={0.6} />
      <ambientLight ref={ambient} intensity={0.4} />
      <hemisphereLight args={["#bcd8ff", "#3a2b20", 0.35]} />
      <directionalLight ref={sun} castShadow={!low} intensity={2.4} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-18, 18, 18, -18, 1, 120]} />
      </directionalLight>
      <directionalLight ref={moon} color="#9fb8ff" intensity={0.1} />
      <mesh ref={sunBall}><sphereGeometry args={[3, 12, 10]} /><meshBasicMaterial color="#ffe08a" /></mesh>
      <mesh ref={moonBall}><sphereGeometry args={[1.6, 10, 8]} /><meshStandardMaterial color="#cbd5e1" flatShading /></mesh>
    </>
  );
}
