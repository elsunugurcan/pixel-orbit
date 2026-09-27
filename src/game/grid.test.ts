import { describe, it, expect } from "vitest";
import { CELLS, N, DIRS, FRAMES, cellIndex, cellFIJ, angularDistance, cellsWithin, dot, cross } from "./grid";

describe("küp-küre ızgarası", () => {
  it("6·N² hücre üretir ve indeks dönüşümü tersinirdir", () => {
    expect(CELLS).toBe(6 * N * N);
    for (const k of [0, 17, 255, 256, 900, CELLS - 1]) {
      const { f, i, j } = cellFIJ(k);
      expect(cellIndex(f, i, j)).toBe(k);
    }
  });
  it("tüm yönler birim vektördür", () => {
    for (const d of DIRS) expect(Math.hypot(...d)).toBeCloseTo(1, 6);
  });
  it("yerel çerçeveler ortonormaldir ve sağ el kuralına uyar", () => {
    for (const k of [3, 400, 1000, CELLS - 5]) {
      const { up, right, forward } = FRAMES[k];
      expect(Math.abs(dot(up, right))).toBeLessThan(1e-6);
      expect(Math.abs(dot(up, forward))).toBeLessThan(1e-6);
      expect(Math.abs(dot(right, forward))).toBeLessThan(1e-6);
      const c = cross(up, right);
      expect(c[0]).toBeCloseTo(forward[0], 6);
    }
  });
  it("hücreler küre üzerinde dengeli dağılır (komşu açıları birbirine yakın)", () => {
    const a = angularDistance(DIRS[cellIndex(0, 7, 7)], DIRS[cellIndex(0, 8, 7)]);
    const b = angularDistance(DIRS[cellIndex(0, 0, 0)], DIRS[cellIndex(0, 1, 0)]);
    expect(a / b).toBeGreaterThan(0.75);
    expect(a / b).toBeLessThan(1.35);
  });
  it("açısal komşuluk simetriktir ve kendini içerir", () => {
    const list = cellsWithin(500, 0.42);
    expect(list).toContain(500);
    for (const k of list) expect(cellsWithin(k, 0.42)).toContain(500);
    expect(list.length).toBeGreaterThan(8);
  });
});
