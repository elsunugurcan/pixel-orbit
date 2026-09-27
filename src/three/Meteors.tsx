import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { FRAMES, R } from "../game/grid";
import { METEOR_FALL_TIME, type Impact, type Meteor } from "../game/rules";
import { useGame } from "../game/store";
import { cellMatrix, surfaceRadius } from "./transforms";

const easeIn = (t: number) => t * t;

function MeteorMesh({ m }: { m: Meteor }) {
  const g = useRef<THREE.Group>(null!);
  const trail = useRef<THREE.Group>(null!);
  const { start, end, dir } = useMemo(() => {
    const fr = FRAMES[m.cell];
    const up = new THREE.Vector3(...fr.up), right = new THREE.Vector3(...fr.right), fwd = new THREE.Vector3(...fr.forward);
    const lateral = right.clone().multiplyScalar(Math.cos(m.lateral)).addScaledVector(fwd, Math.sin(m.lateral));
    const end = up.clone().multiplyScalar(surfaceRadius(useGame.getState().terrain, m.cell) + 0.3);
    const start = up.clone().multiplyScalar(R + 26).addScaledVector(lateral, 11);
    return { start, end, dir: end.clone().sub(start).normalize() };
  }, [m]);
  useFrame(() => {
    const t = useGame.getState().time;
    const p = THREE.MathUtils.clamp((t - m.spawnAt) / METEOR_FALL_TIME, 0, 1);
    g.current.position.lerpVectors(start, end, easeIn(p));
    g.current.rotation.x += 0.15; g.current.rotation.y += 0.11;
    trail.current.position.copy(g.current.position);
    trail.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
  });
  return (
    <>
      <group ref={g}>
        <mesh castShadow><boxGeometry args={[0.9, 0.9, 0.9]} /><meshStandardMaterial color="#3b2a20" emissive="#f97316" emissiveIntensity={0.9} flatShading /></mesh>
        <mesh><sphereGeometry args={[1.05, 12, 10]} /><meshBasicMaterial color="#fb923c" transparent opacity={0.28} depthWrite={false} /></mesh>
        <pointLight color="#fb923c" intensity={6} distance={9} />
      </group>
      <group ref={trail}>
        {[1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[0, i * 1.1, 0]} scale={1 - i * 0.16}><boxGeometry args={[0.7, 0.7, 0.7]} /><meshBasicMaterial color={i < 3 ? "#fde68a" : "#f97316"} transparent opacity={0.55 - i * 0.09} depthWrite={false} /></mesh>
        ))}
      </group>
    </>
  );
}

function TargetRing({ cell }: { cell: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const m = useMemo(() => cellMatrix(new THREE.Matrix4(), cell, surfaceRadius(useGame.getState().terrain, cell), [0, 0.08, 0], [1, 1, 1]), [cell]);
  useFrame(({ clock }) => { mat.current.opacity = 0.5 + 0.4 * Math.sin(clock.elapsedTime * 9); const s = 1 + 0.12 * Math.sin(clock.elapsedTime * 9); ref.current.scale.set(s, 1, s); });
  return (
    <mesh ref={ref} position={new THREE.Vector3().setFromMatrixPosition(m)} quaternion={new THREE.Quaternion().setFromRotationMatrix(m)} renderOrder={4}>
      <ringGeometry args={[0.55, 0.85, 4]} />
      <meshBasicMaterial ref={mat} color="#ef4444" transparent depthWrite={false} side={THREE.DoubleSide} />
      <group rotation={[-Math.PI / 2, 0, 0]} />
    </mesh>
  );
}

function ImpactFX({ i }: { i: Impact }) {
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const pos = useMemo(() => new THREE.Vector3().setFromMatrixPosition(cellMatrix(new THREE.Matrix4(), i.cell, surfaceRadius(useGame.getState().terrain, i.cell), [0, 0.4, 0], [1, 1, 1])), [i.cell]);
  useFrame(() => {
    const t = THREE.MathUtils.clamp((useGame.getState().time - i.at) / 0.9, 0, 1);
    const s = 0.3 + (i.blocked ? 4.2 : 2.6) * t;
    ref.current.scale.setScalar(s); mat.current.opacity = 0.85 * (1 - t);
  });
  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[1, 12, 10]} />
      <meshBasicMaterial ref={mat} color={i.blocked ? "#67e8f9" : "#fb923c"} transparent depthWrite={false} />
    </mesh>
  );
}

export default function Meteors() {
  const meteors = useGame((s) => s.meteors);
  const impacts = useGame((s) => s.impacts);
  return (
    <group>
      {meteors.map((m) => <MeteorMesh key={m.id} m={m} />)}
      {meteors.map((m) => <TargetRing key={"r" + m.id} cell={m.cell} />)}
      {impacts.map((i) => <ImpactFX key={i.id} i={i} />)}
    </group>
  );
}
