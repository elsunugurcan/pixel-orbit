import { describe, it, expect } from "vitest";
import { BUILDINGS, Cell, canPlace, countCells, isShielded, levelFor, meteorCountForDay, planNight, productionOf, resolveMeteor, rng, scoreOf, SHIELD_RADIUS, dayNumber, isNight, DAY_LENGTH } from "./rules";
import { generateTerrain, Terrain } from "./terrain";
import { CELLS, cellsWithin } from "./grid";

const terrain = generateTerrain(11);
const find = (kind: number) => Array.from(terrain.kind).findIndex((k) => k === kind);

describe("inşa kuralları", () => {
  it("suya, dolu hücreye ve kaynak yetmezse izin vermez", () => {
    const cells = new Uint8Array(CELLS);
    const water = find(Terrain.WATER), grass = find(Terrain.GRASS);
    expect(canPlace(BUILDINGS[1], water, cells, terrain, 99, 99, 1)).toBe("water");
    expect(canPlace(BUILDINGS[1], grass, cells, terrain, 2, 0, 1)).toBe("no-wood");
    expect(canPlace(BUILDINGS[4], grass, cells, terrain, 0, 5, 1)).toBe("no-stone");
    expect(canPlace(BUILDINGS[1], grass, cells, terrain, 3, 0, 1)).toBeNull();
    cells[grass] = Cell.TREE;
    expect(canPlace(BUILDINGS[1], grass, cells, terrain, 99, 99, 1)).toBe("occupied");
    cells[grass] = Cell.CRATER;
    expect(canPlace(BUILDINGS[1], grass, cells, terrain, 99, 99, 1)).toBe("crater");
  });
  it("taş ocağı yalnızca kayalık alana, kule yalnızca seviye 2'de", () => {
    const cells = new Uint8Array(CELLS);
    expect(canPlace(BUILDINGS[3], find(Terrain.GRASS), cells, terrain, 99, 99, 1)).toBe("needs-rock");
    expect(canPlace(BUILDINGS[3], find(Terrain.ROCK), cells, terrain, 99, 99, 1)).toBeNull();
    expect(canPlace(BUILDINGS[5], find(Terrain.GRASS), cells, terrain, 99, 99, 1)).toBe("locked");
    expect(canPlace(BUILDINGS[5], find(Terrain.GRASS), cells, terrain, 99, 99, 2)).toBeNull();
  });
});

describe("ekonomi ve seviye", () => {
  it("puan, üretim ve seviye sayımdan hesaplanır", () => {
    const cells = new Uint8Array(CELLS);
    cells[1] = Cell.TREE; cells[2] = Cell.TREE; cells[3] = Cell.HOUSE; cells[4] = Cell.QUARRY;
    const c = countCells(cells);
    expect(scoreOf(c)).toBe(2 * 1 + 10 + 2);
    expect(productionOf(c)).toEqual({ wood: 0.5, stone: 0.2 });
    expect(levelFor(0)).toBe(1); expect(levelFor(59)).toBe(1); expect(levelFor(60)).toBe(2); expect(levelFor(125)).toBe(3);
  });
  it("gün/gece döngüsü", () => {
    expect(dayNumber(0)).toBe(1); expect(dayNumber(DAY_LENGTH)).toBe(2);
    expect(isNight(DAY_LENGTH * 0.3)).toBe(false); expect(isNight(DAY_LENGTH * 0.7)).toBe(true);
    expect(meteorCountForDay(1)).toBe(3); expect(meteorCountForDay(50)).toBe(14);
  });
});

describe("meteorlar ve kalkan", () => {
  it("kalkan yarıçapı içindeki hücre korunur, dışındaki kratere döner", () => {
    const cells = new Uint8Array(CELLS);
    const center = find(Terrain.GRASS);
    cells[center] = Cell.SHIELD;
    const inside = cellsWithin(center, SHIELD_RADIUS).find((k) => k !== center)!;
    const outside = Array.from({ length: CELLS }, (_, k) => k).find((k) => !cellsWithin(center, SHIELD_RADIUS).includes(k))!;
    cells[inside] = Cell.HOUSE; cells[outside] = Cell.HOUSE;
    expect(isShielded(inside, cells)).toBe(true);
    expect(isShielded(outside, cells)).toBe(false);
    const a = resolveMeteor({ id: 1, cell: inside, spawnAt: 0, impactAt: 3, lateral: 0 }, cells);
    expect(a.blocked).toBe(true); expect(cells[inside]).toBe(Cell.HOUSE);
    const b = resolveMeteor({ id: 2, cell: outside, spawnAt: 0, impactAt: 3, lateral: 0 }, cells);
    expect(b.blocked).toBe(false); expect(b.destroyed).toBe(Cell.HOUSE); expect(cells[outside]).toBe(Cell.CRATER);
  });
  it("gece planı deterministik, gece saatlerine dağılmış ve yalnızca karayı hedefler", () => {
    const cells = new Uint8Array(CELLS);
    cells[find(Terrain.GRASS)] = Cell.HOUSE;
    const a = planNight(2, DAY_LENGTH * 1.6, cells, terrain, rng(5), 1);
    const b = planNight(2, DAY_LENGTH * 1.6, cells, terrain, rng(5), 1);
    expect(a).toEqual(b);
    expect(a.length).toBe(meteorCountForDay(2));
    for (const m of a) {
      expect(terrain.kind[m.cell]).not.toBe(Terrain.WATER);
      expect(m.spawnAt).toBeGreaterThanOrEqual(DAY_LENGTH * 1.6);
      expect(m.impactAt).toBeLessThan(DAY_LENGTH * 2);
    }
  });
});
