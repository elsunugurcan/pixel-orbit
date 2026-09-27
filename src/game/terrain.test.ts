import { describe, it, expect } from "vitest";
import { generateTerrain, Terrain, valueNoise } from "./terrain";
import { CELLS } from "./grid";

describe("arazi üretimi", () => {
  it("aynı tohum aynı gezegeni verir, farklı tohum farklı", () => {
    const a = generateTerrain(42), b = generateTerrain(42), c = generateTerrain(43);
    expect(Array.from(a.kind)).toEqual(Array.from(b.kind));
    expect(Array.from(a.kind)).not.toEqual(Array.from(c.kind));
  });
  it("her biyomdan hücre içerir ve yükseklik türle tutarlıdır", () => {
    const t = generateTerrain(7);
    const kinds = new Set(Array.from(t.kind));
    expect(kinds.has(Terrain.WATER)).toBe(true);
    expect(kinds.has(Terrain.GRASS)).toBe(true);
    expect(kinds.has(Terrain.ROCK)).toBe(true);
    for (let k = 0; k < CELLS; k++) {
      if (t.kind[k] === Terrain.WATER) expect(t.height[k]).toBe(0);
      if (t.kind[k] === Terrain.SNOW) expect(t.height[k]).toBe(4);
    }
  });
  it("gürültü [-1,1] aralığında ve süreklidir", () => {
    for (let i = 0; i < 200; i++) {
      const v = valueNoise(i * 0.37, i * 0.11, i * 0.23, 5);
      expect(v).toBeGreaterThanOrEqual(-1); expect(v).toBeLessThanOrEqual(1);
    }
    const a = valueNoise(1.5, 2.5, 3.5, 1), b = valueNoise(1.501, 2.5, 3.5, 1);
    expect(Math.abs(a - b)).toBeLessThan(0.02);
  });
});
