import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CELLS } from "./grid";
import { generateTerrain, type TerrainData } from "./terrain";
import {
  BUILDINGS, Cell, CRATER_STONE, MAX_RESOURCE, MISSIONS, PLACE_ERROR_TEXT, REFUND_RATE, START_RESOURCES,
  canPlace, countCells, dayNumber, dayPhase, levelFor, planNight, productionOf, resolveMeteor, rng, scoreOf,
  type Building, type Counts, type Impact, type Meteor, type Stats, type Tool, NIGHT_START,
} from "./rules";
import { sfx } from "./audio";

export type Toast = { id: number; text: string; kind: "info" | "good" | "bad"; at: number };
export type Screen = "menu" | "game";
export type Quality = "high" | "low";
const defaultQuality = (): Quality => { if (typeof window === "undefined") return "high"; const q = new URLSearchParams(window.location.search).get("q"); if (q === "low" || q === "high") return q; const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent); return mobile || (navigator.hardwareConcurrency ?? 8) <= 4 ? "low" : "high"; };

export type GameState = {
  seed: number;
  cells: Uint8Array;
  terrain: TerrainData;
  wood: number; stone: number;
  time: number;
  missionIndex: number;
  stats: Stats;
  muted: boolean;
  quality: Quality;
  hasSave: boolean;
  counts: Counts; score: number; level: number;
  planned: Meteor[]; meteors: Meteor[]; impacts: Impact[]; nextId: number; plannedDay: number;
  tool: Tool | null;
  paused: boolean;
  screen: Screen;
  toasts: Toast[];
  // eylemler
  newGame: (seed?: number) => void;
  continueGame: () => void;
  openMenu: () => void;
  setTool: (t: Tool | null) => void;
  toggleMute: () => void;
  setQuality: (q: Quality) => void;
  place: (cell: number) => boolean;
  tapCell: (cell: number) => void;
  tick: (dt: number) => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
};

const memoryStorage = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
let toastId = 1;

function derive(cells: Uint8Array) {
  const counts = countCells(cells);
  const score = scoreOf(counts);
  return { counts, score, level: levelFor(score) };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      seed: 1, cells: new Uint8Array(CELLS), terrain: generateTerrain(1),
      wood: START_RESOURCES.wood, stone: START_RESOURCES.stone, time: 0, missionIndex: 0,
      stats: { blocked: 0, destroyed: 0, cleared: 0, built: 0 }, muted: false, quality: defaultQuality(), hasSave: false,
      counts: countCells(new Uint8Array(CELLS)), score: 0, level: 1,
      planned: [], meteors: [], impacts: [], nextId: 1, plannedDay: 0,
      tool: 1, paused: false, screen: "menu", toasts: [],

      newGame: (seed = (Math.random() * 1e9) >>> 0) => {
        const cells = new Uint8Array(CELLS);
        set({ seed, cells, terrain: generateTerrain(seed), wood: START_RESOURCES.wood, stone: START_RESOURCES.stone, time: 0, missionIndex: 0,
          stats: { blocked: 0, destroyed: 0, cleared: 0, built: 0 }, hasSave: true, ...derive(cells), planned: [], meteors: [], impacts: [], nextId: 1, plannedDay: 0,
          tool: 1, paused: false, screen: "game", toasts: [] });
        get().toast("Gezegeni sürükleyerek çevir, bir kareye tıklayıp ağaç dik.", "info");
      },
      continueGame: () => set({ screen: "game", paused: false }),
      openMenu: () => set({ screen: "menu", paused: true }),
      setTool: (tool) => set({ tool }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      setQuality: (quality) => set({ quality }),
      toast: (text, kind = "info") => set((s) => ({ toasts: [...s.toasts.slice(-3), { id: toastId++, text, kind, at: Date.now() }] })),

      place: (cell) => {
        const s = get();
        const tool = s.tool;
        if (tool === null) return false;
        if (tool === "remove") {
          const v = s.cells[cell];
          if (v === Cell.EMPTY || v === Cell.CRATER) return false;
          const b = BUILDINGS[v as Building];
          const cells = new Uint8Array(s.cells); cells[cell] = Cell.EMPTY;
          set({ cells, ...derive(cells), wood: Math.min(MAX_RESOURCE, s.wood + Math.floor(b.cost.wood * REFUND_RATE)), stone: Math.min(MAX_RESOURCE, s.stone + Math.floor(b.cost.stone * REFUND_RATE)) });
          sfx.remove(s.muted);
          return true;
        }
        const b = BUILDINGS[tool];
        const err = canPlace(b, cell, s.cells, s.terrain, s.wood, s.stone, s.level);
        if (err) { get().toast(PLACE_ERROR_TEXT[err], "bad"); sfx.error(s.muted); return false; }
        const cells = new Uint8Array(s.cells); cells[cell] = b.id;
        set({ cells, ...derive(cells), wood: s.wood - b.cost.wood, stone: s.stone - b.cost.stone, stats: { ...s.stats, built: s.stats.built + 1 } });
        sfx.place(s.muted);
        return true;
      },

      /** Hücreye dokunma: krater ise temizle, değilse seçili araçla inşa et. */
      tapCell: (cell) => {
        const s = get();
        if (s.cells[cell] === Cell.CRATER) {
          const cells = new Uint8Array(s.cells); cells[cell] = Cell.EMPTY;
          set({ cells, ...derive(cells), stone: Math.min(MAX_RESOURCE, s.stone + CRATER_STONE), stats: { ...s.stats, cleared: s.stats.cleared + 1 } });
          get().toast(`Meteor taşı toplandı: +${CRATER_STONE} taş`, "good"); sfx.collect(s.muted);
          return;
        }
        get().place(cell);
      },

      tick: (dt) => {
        const s = get();
        if (s.paused || s.screen !== "game") return;
        const time = s.time + dt;
        const prod = productionOf(s.counts);
        const patch: Partial<GameState> = { time, wood: Math.min(MAX_RESOURCE, s.wood + prod.wood * dt), stone: Math.min(MAX_RESOURCE, s.stone + prod.stone * dt) };

        // Gece planı
        const day = dayNumber(time);
        let planned = s.planned, nextId = s.nextId, plannedDay = s.plannedDay;
        if (dayPhase(time) >= NIGHT_START && plannedDay !== day) {
          const list = planNight(day, time, s.cells, s.terrain, rng(s.seed * 7 + day * 131), nextId);
          planned = [...planned, ...list]; nextId += list.length; plannedDay = day;
          get().toast(`Gece ${day}: ${list.length} meteor yaklaşıyor! Kalkanları kontrol et.`, "bad"); sfx.warn(s.muted);
        }
        // Doğuş
        let meteors = s.meteors;
        if (planned.length && planned[0].spawnAt <= time) {
          const due = planned.filter((m) => m.spawnAt <= time);
          planned = planned.filter((m) => m.spawnAt > time);
          meteors = [...meteors, ...due];
        }
        // Çarpma
        let cells = s.cells, impacts = s.impacts, stats = s.stats, cellsChanged = false;
        if (meteors.length && meteors[0].impactAt <= time) {
          const hit = meteors.filter((m) => m.impactAt <= time);
          meteors = meteors.filter((m) => m.impactAt > time);
          cells = new Uint8Array(cells);
          for (const m of hit) {
            const r = resolveMeteor(m, cells);
            impacts = [...impacts, r];
            if (r.blocked) { stats = { ...stats, blocked: stats.blocked + 1 }; sfx.block(s.muted); }
            else { cellsChanged = true; if (r.destroyed !== Cell.EMPTY) { stats = { ...stats, destroyed: stats.destroyed + 1 }; get().toast(`${BUILDINGS[r.destroyed as Building]?.name ?? "Yapı"} meteorla yıkıldı!`, "bad"); } sfx.hit(s.muted); }
          }
          if (!cellsChanged) cells = s.cells; // yalnızca engellendiyse diziyi değiştirme
        }
        if (impacts.length && impacts[0].at < time - 1.5) impacts = impacts.filter((i) => i.at >= time - 1.5);
        Object.assign(patch, { planned, nextId, plannedDay, meteors, impacts, stats });
        if (cells !== s.cells) Object.assign(patch, { cells, ...derive(cells) });

        // Görev kontrolü
        const m = MISSIONS[s.missionIndex];
        if (m) {
          const d = cells !== s.cells ? derive(cells) : { counts: s.counts, level: s.level };
          if (m.progress({ counts: d.counts, day, level: d.level, stats }) >= m.target) {
            patch.missionIndex = s.missionIndex + 1;
            patch.wood = Math.min(MAX_RESOURCE, (patch.wood ?? s.wood) + (m.reward.wood ?? 0));
            patch.stone = Math.min(MAX_RESOURCE, (patch.stone ?? s.stone) + (m.reward.stone ?? 0));
            const rw = [m.reward.wood ? `+${m.reward.wood} odun` : "", m.reward.stone ? `+${m.reward.stone} taş` : ""].filter(Boolean).join(", ");
            get().toast(`Görev tamamlandı: ${m.text} (${rw})`, "good"); sfx.mission(s.muted);
          }
        }
        // Seviye atlama bildirimi
        const newLevel = (patch.level ?? s.level);
        if (newLevel > s.level) { get().toast(`Seviye ${newLevel}! ${newLevel === 2 ? "Kule açıldı." : newLevel === 3 ? "Bahçe açıldı." : "Gezegen büyüyor."}`, "good"); sfx.mission(s.muted); }
        if (s.toasts.length && Date.now() - s.toasts[0].at > 4000) patch.toasts = s.toasts.filter((t) => Date.now() - t.at <= 4000);
        set(patch);
      },
    }),
    {
      name: "pixel-orbit-save",
      version: 1,
      storage: createJSONStorage(() => (typeof localStorage !== "undefined" ? localStorage : memoryStorage())),
      partialize: (s) => ({ seed: s.seed, cells: Array.from(s.cells), wood: s.wood, stone: s.stone, time: s.time, missionIndex: s.missionIndex, stats: s.stats, muted: s.muted, quality: s.quality, hasSave: s.hasSave, plannedDay: s.plannedDay, nextId: s.nextId }),
      merge: (persisted, current) => {
        const p = persisted as Partial<GameState> & { cells?: number[] };
        if (!p || !p.cells) return current;
        const cells = Uint8Array.from(p.cells);
        return { ...current, ...p, cells, terrain: generateTerrain(p.seed ?? 1), ...derive(cells), screen: "menu", paused: true, planned: [], meteors: [], impacts: [] };
      },
    },
  ),
);
