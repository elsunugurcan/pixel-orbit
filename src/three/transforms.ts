import * as THREE from "three";
import { CUBE, FRAMES, R } from "../game/grid";
import type { TerrainData } from "../game/terrain";
import { Terrain } from "../game/terrain";

const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _rot = new THREE.Matrix4();

/** Hücrenin en üst küp merkezinin yarıçapı. */
export const topRadius = (t: TerrainData, cell: number) => (t.kind[cell] === Terrain.WATER ? R - 0.18 : R + t.height[cell] * CUBE);
/** Yüzey (üst yüz) yarıçapı — binalar burada başlar. */
export const surfaceRadius = (t: TerrainData, cell: number) => topRadius(t, cell) + CUBE / 2;

/**
 * Hücrenin yerel çerçevesine göre bir matris üretir.
 * off: [sağ, yukarı, ileri] yönünde kayma; size: ölçek. radial: yukarı yönündeki taban yarıçapı.
 */
export function cellMatrix(out: THREE.Matrix4, cell: number, radial: number, off: readonly [number, number, number], size: readonly [number, number, number], spin = 0) {
  const fr = FRAMES[cell];
  _r.set(fr.right[0], fr.right[1], fr.right[2]);
  _u.set(fr.up[0], fr.up[1], fr.up[2]);
  _f.set(fr.forward[0], fr.forward[1], fr.forward[2]);
  _rot.makeBasis(_r, _u, _f);
  if (spin) _rot.multiply(new THREE.Matrix4().makeRotationY(spin));
  _p.copy(_u).multiplyScalar(radial + off[1]).addScaledVector(_r, off[0]).addScaledVector(_f, off[2]);
  _s.set(size[0], size[1], size[2]);
  out.compose(_p, new THREE.Quaternion().setFromRotationMatrix(_rot), _s);
  return out;
}
