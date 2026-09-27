import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CELLS, SHIELD_RADIUS_WORLD } from "./constants";
import { Cell, type CellValue } from "../game/rules";
import { useGame } from "../game/store";
import { cellMatrix, surfaceRadius } from "./transforms";

type Part = { geo: "box" | "sphere"; size: readonly [number, number, number]; off: readonly [number, number, number]; color: string; emissive?: string; ei?: number; opacity?: number };
const K = 1.3; // yapılar voxel'e göre biraz büyük: uzaktan okunabilirlik
const sc = (v: readonly [number, number, number]): [number, number, number] => [v[0] * K, v[1] * K, v[2] * K];
const box = (size: Part["size"], off: Part["off"], color: string, extra: Partial<Part> = {}): Part => ({ geo: "box", size: sc(size), off: sc(off), color, ...extra });
const sphere = (r: number, off: Part["off"], color: string, extra: Partial<Part> = {}): Part => ({ geo: "sphere", size: sc([r, r, r]), off: sc(off), color, ...extra });

/** Her yapı türü için pixel parçalar: [genişlik, yükseklik, derinlik], [sağ, yukarı, ileri] kayma. */
export const PARTS: Record<Exclude<CellValue, 0>, Part[]> = {
  [Cell.TREE]: [box([0.26, 0.5, 0.26], [0, 0.25, 0], "#7a4a28"), box([0.86, 0.62, 0.86], [0, 0.83, 0], "#256e37"), box([0.56, 0.44, 0.56], [0, 1.34, 0], "#7be085")],
  [Cell.HOUSE]: [box([0.82, 0.62, 0.82], [0, 0.31, 0], "#f3e6cd"), box([0.98, 0.3, 0.98], [0, 0.76, 0], "#c2410c"), box([0.6, 0.3, 0.6], [0, 1.04, 0], "#c2410c"), box([0.22, 0.34, 0.06], [0, 0.17, 0.42], "#5b3a21"), box([0.16, 0.16, 0.05], [0.25, 0.4, 0.42], "#7dd3fc")],
  [Cell.QUARRY]: [box([0.92, 0.28, 0.92], [0, 0.14, 0], "#6b7280"), box([0.36, 0.42, 0.36], [-0.2, 0.48, 0.14], "#9ca3af"), box([0.28, 0.28, 0.28], [0.22, 0.42, -0.18], "#d1d5db"), box([0.08, 1.0, 0.08], [0.34, 0.78, 0.34], "#374151"), box([0.5, 0.06, 0.06], [0.12, 1.24, 0.34], "#374151")],
  [Cell.SHIELD]: [box([0.38, 0.9, 0.38], [0, 0.45, 0], "#94a3b8"), box([0.56, 0.12, 0.56], [0, 0.94, 0], "#64748b"), sphere(0.32, [0, 1.28, 0], "#22d3ee", { emissive: "#22d3ee", ei: 1.4 })],
  [Cell.TOWER]: [box([0.74, 1.7, 0.74], [0, 0.85, 0], "#78716c"), box([0.92, 0.22, 0.92], [0, 1.8, 0], "#a8a29e"), box([0.5, 0.5, 0.5], [0, 2.16, 0], "#57534e"), sphere(0.22, [0, 2.6, 0], "#fde047", { emissive: "#fde047", ei: 1.6 })],
  [Cell.GARDEN]: [box([0.92, 0.16, 0.92], [0, 0.08, 0], "#65a30d"), box([0.16, 0.26, 0.16], [0.26, 0.28, 0.26], "#f472b6"), box([0.16, 0.22, 0.16], [-0.26, 0.26, 0.26], "#fde047"), box([0.16, 0.24, 0.16], [0.26, 0.27, -0.26], "#f8fafc"), box([0.16, 0.2, 0.16], [-0.26, 0.25, -0.26], "#ef4444")],
  [Cell.CRATER]: [box([0.98, 0.14, 0.98], [0, 0.07, 0], "#262626"), box([0.3, 0.22, 0.3], [0.16, 0.24, -0.1], "#3f3f46"), box([0.2, 0.18, 0.2], [-0.22, 0.22, 0.18], "#52525b"), box([0.24, 0.06, 0.24], [0, 0.16, 0], "#f97316", { emissive: "#f97316", ei: 1.2 })],
};

function PartMesh({ value, part }: { value: CellValue; part: Part }) {
  const cells = useGame((s) => s.cells);
  const terrain = useGame((s) => s.terrain);
  const ref = useRef<THREE.InstancedMesh>(null!);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useLayoutEffect(() => {
    const im = ref.current; let n = 0;
    for (let k = 0; k < CELLS; k++) {
      if (cells[k] !== value) continue;
      cellMatrix(m, k, surfaceRadius(terrain, k), part.off, part.size, value === Cell.TREE || value === Cell.GARDEN ? (k % 4) * (Math.PI / 2) : 0);
      im.setMatrixAt(n++, m);
    }
    im.count = n; im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  }, [cells, terrain, value, part, m]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, CELLS]} castShadow receiveShadow frustumCulled={false}>
      {part.geo === "box" ? <boxGeometry args={[1, 1, 1]} /> : <sphereGeometry args={[1, 10, 8]} />}
      <meshStandardMaterial color={part.color} flatShading roughness={0.9} emissive={part.emissive ?? "#000000"} emissiveIntensity={part.ei ?? 0} />
    </instancedMesh>
  );
}

/** Kalkan kubbeleri: yarı saydam küre + nefes alan parlaklık. */
function ShieldDomes() {
  const cells = useGame((s) => s.cells);
  const terrain = useGame((s) => s.terrain);
  const ref = useRef<THREE.InstancedMesh>(null!);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  useLayoutEffect(() => {
    const im = ref.current; let n = 0; const m = new THREE.Matrix4();
    for (let k = 0; k < CELLS; k++) if (cells[k] === Cell.SHIELD) { cellMatrix(m, k, surfaceRadius(terrain, k), [0, 0, 0], [SHIELD_RADIUS_WORLD, SHIELD_RADIUS_WORLD, SHIELD_RADIUS_WORLD]); im.setMatrixAt(n++, m); }
    im.count = n; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
  }, [cells, terrain]);
  useFrame(({ clock }) => { mat.current.opacity = 0.05 + 0.025 * Math.sin(clock.elapsedTime * 2.2); });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 64]} frustumCulled={false} renderOrder={3}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshBasicMaterial ref={mat} color="#67e8f9" transparent opacity={0.06} depthWrite={false} side={THREE.FrontSide} />
    </instancedMesh>
  );
}

export default function Buildings() {
  return (
    <group>
      {(Object.keys(PARTS) as unknown as Exclude<CellValue, 0>[]).map((v) => PARTS[v].map((p, i) => <PartMesh key={`${v}-${i}`} value={Number(v) as CellValue} part={p} />))}
      <ShieldDomes />
    </group>
  );
}

