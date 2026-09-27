import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { CELLS, CUBE, R } from "../game/grid";
import { Terrain, type TerrainData } from "../game/terrain";
import { BUILDINGS, canPlace, Cell, type Building } from "../game/rules";
import { useGame } from "../game/store";
import { useUI } from "./ui";
import { cellMatrix, surfaceRadius } from "./transforms";

const TOP: Record<number, string[]> = {
  [Terrain.WATER]: ["#2f74d6", "#3b82e6"],
  [Terrain.SAND]: ["#e3cf8f", "#d9c27f"],
  [Terrain.GRASS]: ["#4fae55", "#45a04b", "#5abb60"],
  [Terrain.ROCK]: ["#8b9198", "#7c838a"],
  [Terrain.SNOW]: ["#f1f5f9", "#e2e8f0"],
};
const DIRT = ["#7b4b2a", "#6f4326"];

function buildPlanet(t: TerrainData) {
  const mats: THREE.Matrix4[] = [], colors: THREE.Color[] = [], cellOf: number[] = [];
  const m = new THREE.Matrix4();
  for (let k = 0; k < CELLS; k++) {
    const kind = t.kind[k], h = t.height[k];
    if (kind === Terrain.WATER) {
      mats.push(cellMatrix(new THREE.Matrix4(), k, R - 0.18, [0, 0, 0], [CUBE, CUBE, CUBE]));
      colors.push(new THREE.Color(TOP[kind][k % 2]).multiplyScalar(t.shade[k])); cellOf.push(k);
      continue;
    }
    for (let layer = 0; layer <= h; layer++) {
      cellMatrix(m, k, R + layer * CUBE, [0, 0, 0], [CUBE, CUBE, CUBE]);
      mats.push(m.clone());
      const top = layer === h;
      const palette = top ? TOP[kind] : DIRT;
      colors.push(new THREE.Color(palette[(k * 7 + layer) % palette.length]).multiplyScalar(top ? t.shade[k] : 0.95 + 0.1 * ((k * 13) % 3) / 3));
      cellOf.push(k);
    }
  }
  return { mats, colors, cellOf };
}

export default function Planet() {
  const terrain = useGame((s) => s.terrain);
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const hover = useRef<THREE.Mesh>(null!);
  const hoverMat = useRef<THREE.MeshBasicMaterial>(null!);
  const data = useMemo(() => buildPlanet(terrain), [terrain]);

  useLayoutEffect(() => {
    const im = mesh.current;
    data.mats.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, data.colors[i]); });
    im.count = data.mats.length;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
  }, [data]);

  const updateHover = (cell: number | null) => {
    useUI.getState().setHover(cell);
    if (cell === null) { hover.current.visible = false; return; }
    const s = useGame.getState();
    const m = cellMatrix(new THREE.Matrix4(), cell, surfaceRadius(s.terrain, cell), [0, 0.5, 0], [CUBE + 0.08, CUBE + 0.08, CUBE + 0.08]);
    hover.current.position.setFromMatrixPosition(m); hover.current.quaternion.setFromRotationMatrix(m);
    let ok = false;
    if (s.cells[cell] === Cell.CRATER) ok = true;
    else if (s.tool === "remove") ok = s.cells[cell] !== Cell.EMPTY;
    else if (s.tool) ok = canPlace(BUILDINGS[s.tool as Building], cell, s.cells, s.terrain, s.wood, s.stone, s.level) === null;
    hoverMat.current.color.set(ok ? "#a3e635" : "#f87171");
    hover.current.visible = true;
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (e.instanceId === undefined) return; updateHover(data.cellOf[e.instanceId]); };
  const onOut = () => updateHover(null);
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6 || e.instanceId === undefined) return; // sürükleme, tıklama değil
    const cell = data.cellOf[e.instanceId];
    useGame.getState().tapCell(cell);
    updateHover(cell);
  };

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, data.mats.length]} castShadow receiveShadow onPointerMove={onMove} onPointerOut={onOut} onClick={onClick} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial flatShading roughness={0.95} metalness={0} />
      </instancedMesh>
      <mesh ref={hover} visible={false} renderOrder={5}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={hoverMat} color="#a3e635" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      {/* çekirdek: küpler arasından boşluk görünmesin */}
      <mesh><sphereGeometry args={[R - 0.4, 24, 24]} /><meshStandardMaterial color="#3a2417" /></mesh>
    </group>
  );
}
