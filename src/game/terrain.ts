import { CELLS, DIRS, type Vec3 } from "./grid";

/** Tam sayı hash tabanlı 3B değer gürültüsü (deterministik, tohumlu). */
function hash3(x: number, y: number, z: number, seed: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647 ^ 1274126177) ^ Math.imul(seed | 0, 1103515245);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function valueNoise(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const tx = smooth(x - xi), ty = smooth(y - yi), tz = smooth(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), tx), lerp(c(0, 1, 0), c(1, 1, 0), tx), ty),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), tx), lerp(c(0, 1, 1), c(1, 1, 1), tx), ty),
    tz,
  ) * 2 - 1;
}
export function fbm(p: Vec3, seed: number, octaves = 4) {
  let a = 0.55, f = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) { sum += a * valueNoise(p[0] * f + 100, p[1] * f + 100, p[2] * f + 100, seed + o * 31); norm += a; a *= 0.5; f *= 2.1; }
  return sum / norm;
}

export const Terrain = { WATER: 0, SAND: 1, GRASS: 2, ROCK: 3, SNOW: 4 } as const;
export type TerrainKind = (typeof Terrain)[keyof typeof Terrain];
export const TERRAIN_NAME: Record<TerrainKind, string> = { 0: "Su", 1: "Kumsal", 2: "Çayır", 3: "Kayalık", 4: "Karlı zirve" };

export type TerrainData = { kind: Uint8Array; height: Uint8Array; shade: Float32Array };

/** Hücre başına arazi türü ve yükseklik (katman sayısı). */
export function generateTerrain(seed: number): TerrainData {
  const kind = new Uint8Array(CELLS), height = new Uint8Array(CELLS), shade = new Float32Array(CELLS);
  for (let k = 0; k < CELLS; k++) {
    const d = DIRS[k];
    const e = fbm([d[0] * 1.9, d[1] * 1.9, d[2] * 1.9], seed) + 0.35 * fbm([d[0] * 4.5, d[1] * 4.5, d[2] * 4.5], seed + 7);
    let t: TerrainKind, h: number;
    if (e < -0.16) { t = Terrain.WATER; h = 0; }
    else if (e < -0.04) { t = Terrain.SAND; h = 1; }
    else if (e < 0.34) { t = Terrain.GRASS; h = e < 0.16 ? 1 : 2; }
    else if (e < 0.56) { t = Terrain.ROCK; h = 3; }
    else { t = Terrain.SNOW; h = 4; }
    kind[k] = t; height[k] = h;
    shade[k] = 0.9 + 0.2 * hash3(k, seed, 7, seed);
  }
  return { kind, height, shade };
}
export const isLand = (t: TerrainData, cell: number) => t.kind[cell] !== Terrain.WATER;
export const isRocky = (t: TerrainData, cell: number) => t.kind[cell] === Terrain.ROCK || t.kind[cell] === Terrain.SNOW;
