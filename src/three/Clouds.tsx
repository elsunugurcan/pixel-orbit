import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { R } from "../game/grid";
import { rng } from "../game/rules";
import { useGame } from "../game/store";

/** Gezegenin etrafında yavaşça dönen voxel bulutlar. */
export default function Clouds() {
  const seed = useGame((s) => s.seed);
  const ref = useRef<THREE.InstancedMesh>(null!);
  const group = useRef<THREE.Group>(null!);
  const mats = useMemo(() => {
    const random = rng(seed + 99), out: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let c = 0; c < 7; c++) {
      const dir = new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize();
      const up = dir, right = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0, 1, 0.01)).normalize(), fwd = new THREE.Vector3().crossVectors(right, up);
      q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, fwd));
      const n = 4 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        p.copy(up).multiplyScalar(R + 7.5 + random() * 0.6).addScaledVector(right, (random() - 0.5) * 2.4).addScaledVector(fwd, (random() - 0.5) * 1.6);
        s.set(0.6 + random() * 0.6, 0.45 + random() * 0.3, 0.6 + random() * 0.6);
        out.push(m.compose(p, q, s).clone());
      }
    }
    return out;
  }, [seed]);
  useLayoutEffect(() => { mats.forEach((m, i) => ref.current.setMatrixAt(i, m)); ref.current.count = mats.length; ref.current.instanceMatrix.needsUpdate = true; }, [mats]);
  useFrame((_, dt) => { group.current.rotation.y += dt * 0.03; group.current.rotation.x += dt * 0.008; });
  return (
    <group ref={group}>
      <instancedMesh ref={ref} args={[undefined, undefined, 64]} castShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" flatShading transparent opacity={0.92} />
      </instancedMesh>
    </group>
  );
}
