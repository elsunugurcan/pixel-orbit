/**
 * Küp-küre ızgarası: gezegen yüzeyi 6 yüz × N×N hücreye bölünür.
 * Her hücrenin merkezden geçen bir yön vektörü (up) ve yerel bir çerçevesi (right/forward) vardır;
 * binalar bu çerçeveye göre yüzeye "dik" yerleştirilir.
 */
export const N = 16;
export const FACES = 6;
export const CELLS = FACES * N * N;
export const R = 10; // gezegen yarıçapı (taban katman merkezi)
export const CUBE = 1.04; // voxel boyutu (hafif üst üste binme, çatlakları kapatır)

export type Vec3 = readonly [number, number, number];

type Face = { n: Vec3; u: Vec3; v: Vec3 };
const FACE_DEFS: Face[] = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
];

export const cellIndex = (f: number, i: number, j: number) => f * N * N + j * N + i;
export const cellFIJ = (index: number) => {
  const f = Math.floor(index / (N * N));
  const r = index - f * N * N;
  return { f, i: r % N, j: Math.floor(r / N) };
};

const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: Vec3): Vec3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

/** Eşit açılı küp-küre eşlemesi: yüz koordinatını tanjantla bükerek hücre boyutlarını dengeler. */
const warp = (t: number) => Math.tan((t * Math.PI) / 4);

/** Yüz üzerindeki sürekli (u,v) ∈ [-1,1]² koordinatından küre yönü. */
export function dirAt(f: number, u: number, v: number): Vec3 {
  const F = FACE_DEFS[f];
  const wu = warp(u), wv = warp(v);
  return normalize([F.n[0] + wu * F.u[0] + wv * F.v[0], F.n[1] + wu * F.u[1] + wv * F.v[1], F.n[2] + wu * F.u[2] + wv * F.v[2]]);
}
const cellUV = (i: number, j: number) => ({ u: -1 + ((i + 0.5) * 2) / N, v: -1 + ((j + 0.5) * 2) / N });

export function cellDirection(index: number): Vec3 {
  const { f, i, j } = cellFIJ(index);
  const { u, v } = cellUV(i, j);
  return dirAt(f, u, v);
}

export type Frame = { up: Vec3; right: Vec3; forward: Vec3 };
export function cellFrame(index: number): Frame {
  const { f, i, j } = cellFIJ(index);
  const { u, v } = cellUV(i, j);
  const up = dirAt(f, u, v);
  const du = sub(dirAt(f, Math.min(1, u + 1e-3), v), up);
  const right = normalize(sub(du, scale(up, dot(du, up))));
  const forward = cross(up, right);
  return { up, right, forward };
}

/** İki hücre yönü arasındaki açı (radyan). */
export const angularDistance = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));

/** Tüm hücrelerin yönleri ve çerçeveleri (modül yüklenince bir kez hesaplanır). */
export const DIRS: Vec3[] = Array.from({ length: CELLS }, (_, k) => cellDirection(k));
export const FRAMES: Frame[] = Array.from({ length: CELLS }, (_, k) => cellFrame(k));

/** Verilen açısal yarıçap içindeki hücreler. */
export function cellsWithin(center: number, radius: number): number[] {
  const c = DIRS[center], cosR = Math.cos(radius), out: number[] = [];
  for (let k = 0; k < CELLS; k++) if (dot(c, DIRS[k]) >= cosR) out.push(k);
  return out;
}
