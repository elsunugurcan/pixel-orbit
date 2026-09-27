import { describe, it, expect, beforeEach } from "vitest";
import { useGame } from "./store";
import { Cell, DAY_LENGTH, MISSIONS, START_RESOURCES, BUILDINGS } from "./rules";
import { Terrain } from "./terrain";

const cellOf = (kind: number, from = 0) => { const t = useGame.getState().terrain; for (let k = from; k < t.kind.length; k++) if (t.kind[k] === kind) return k; throw new Error("yok"); };
const landCells = (kind: number, n: number) => { const out: number[] = []; let k = -1; while (out.length < n) { k = cellOf(kind, k + 1); out.push(k); } return out; };

describe("oyun deposu", () => {
  beforeEach(() => useGame.getState().newGame(1234));

  it("yeni oyun başlangıç kaynaklarıyla başlar ve sabit tohumla aynı araziyi üretir", () => {
    const s = useGame.getState();
    expect(s.wood).toBe(START_RESOURCES.wood); expect(s.stone).toBe(0); expect(s.level).toBe(1);
    const k = Array.from(s.terrain.kind);
    useGame.getState().newGame(1234);
    expect(Array.from(useGame.getState().terrain.kind)).toEqual(k);
  });

  it("inşa kaynak düşer, puan ve sayım güncellenir; yetersiz kaynakta reddeder", () => {
    const g = useGame.getState();
    const c = cellOf(Terrain.GRASS);
    g.setTool(1);
    expect(useGame.getState().place(c)).toBe(true);
    expect(useGame.getState().wood).toBe(START_RESOURCES.wood - 3);
    expect(useGame.getState().counts[Cell.TREE]).toBe(1);
    expect(useGame.getState().score).toBe(1);
    useGame.getState().setTool(5); // kule kilitli
    expect(useGame.getState().place(cellOf(Terrain.GRASS, c + 1))).toBe(false);
    expect(useGame.getState().toasts.at(-1)?.kind).toBe("bad");
  });

  it("ağaçlar zamanla odun üretir", () => {
    const g = useGame.getState();
    for (const c of landCells(Terrain.GRASS, 4)) g.place(c);
    const w0 = useGame.getState().wood;
    useGame.getState().tick(10);
    // 4 ağaç × 0.25 odun/sn × 10 sn + "3 ağaç dik" görev ödülü
    expect(useGame.getState().wood).toBeCloseTo(w0 + 4 * BUILDINGS[1].produces!.wood! * 10 + MISSIONS[0].reward.wood!, 5);
  });

  it("yıkım %50 iade eder, krater temizleme taş verir", () => {
    const g = useGame.getState();
    const c = cellOf(Terrain.GRASS);
    g.setTool(2); useGame.setState({ stone: 5 });
    expect(useGame.getState().place(c)).toBe(true);
    useGame.getState().setTool("remove");
    const w = useGame.getState().wood;
    useGame.getState().place(c);
    expect(useGame.getState().wood).toBe(w + 4);
    const cells = new Uint8Array(useGame.getState().cells); cells[c] = Cell.CRATER; useGame.setState({ cells });
    const s0 = useGame.getState().stone;
    useGame.getState().tapCell(c);
    expect(useGame.getState().stone).toBe(s0 + 2);
    expect(useGame.getState().cells[c]).toBe(Cell.EMPTY);
    expect(useGame.getState().stats.cleared).toBe(1);
  });

  it("ilk görev tamamlanınca ödül verilir ve sonraki göreve geçilir", () => {
    const g = useGame.getState();
    for (const c of landCells(Terrain.GRASS, 3)) g.place(c);
    const w = useGame.getState().wood;
    useGame.getState().tick(0.016);
    expect(useGame.getState().missionIndex).toBe(1);
    expect(useGame.getState().wood).toBeCloseTo(w + (MISSIONS[0].reward.wood ?? 0) + 3 * 0.25 * 0.016, 3);
  });

  it("gece meteorlar planlanır, düşer ve kalkansız yapıları yıkar", () => {
    const g = useGame.getState();
    // her yere ev: hedeflenecek yapı garanti
    useGame.setState({ wood: 999, stone: 999 });
    g.setTool(2);
    for (const c of landCells(Terrain.GRASS, 30)) useGame.getState().place(c);
    const seen = new Set<number>();
    const unsub = useGame.subscribe((st) => st.impacts.forEach((i) => seen.add(i.id)));
    useGame.getState().tick(DAY_LENGTH * 0.61); // geceye gir → plan
    expect(useGame.getState().planned.length).toBe(3);
    // gecenin sonuna kadar küçük adımlarla ilerle
    for (let i = 0; i < 40; i++) useGame.getState().tick(1);
    unsub();
    const s = useGame.getState();
    expect(s.planned.length).toBe(0); expect(s.meteors.length).toBe(0);
    expect(seen.size).toBe(3);
    expect(s.stats.blocked).toBe(0);
    expect(s.counts[Cell.CRATER]).toBeGreaterThan(0);
  });

  it("kalkan içindeki meteorlar engellenir", () => {
    const g = useGame.getState();
    useGame.setState({ wood: 999, stone: 999 });
    // planı taklit et: tek hedef, kalkan hemen yanına
    const c = cellOf(Terrain.GRASS);
    g.setTool(4); useGame.getState().place(c);
    useGame.setState({ meteors: [{ id: 9, cell: c, spawnAt: 0, impactAt: 0.5, lateral: 0 }], plannedDay: 1 });
    useGame.getState().tick(1);
    expect(useGame.getState().stats.blocked).toBe(1);
    expect(useGame.getState().cells[c]).toBe(Cell.SHIELD);
    expect(useGame.getState().impacts[0].blocked).toBe(true);
  });

  it("kayıt/yükleme: hücreler ve kaynaklar korunur", async () => {
    const g = useGame.getState();
    g.place(cellOf(Terrain.GRASS));
    const snapshot = { cells: Array.from(useGame.getState().cells), wood: useGame.getState().wood };
    await useGame.persist.rehydrate();
    expect(Array.from(useGame.getState().cells)).toEqual(snapshot.cells);
    expect(useGame.getState().wood).toBe(snapshot.wood);
    expect(useGame.getState().screen).toBe("menu");
  });
});
