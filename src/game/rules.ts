import { angularDistance, CELLS, DIRS } from "./grid";
import { isLand, isRocky, type TerrainData } from "./terrain";

/** Hücre durumu: 0 boş, 1..6 bina, 7 krater */
export const Cell = { EMPTY: 0, TREE: 1, HOUSE: 2, QUARRY: 3, SHIELD: 4, TOWER: 5, GARDEN: 6, CRATER: 7 } as const;
export type CellValue = (typeof Cell)[keyof typeof Cell];
export type Building = Exclude<CellValue, 0 | 7>;
export type Tool = Building | "remove";

export type Cost = { wood: number; stone: number };
export type BuildingDef = {
  id: Building; key: string; name: string; desc: string; cost: Cost; score: number; unlockLevel: number;
  requires?: "rock"; produces?: { wood?: number; stone?: number }; // saniye başına
};

export const BUILDINGS: Record<Building, BuildingDef> = {
  1: { id: 1, key: "tree", name: "Ağaç", desc: "Odun üretir. Gezegenin nefesi.", cost: { wood: 3, stone: 0 }, score: 1, unlockLevel: 1, produces: { wood: 0.25 } },
  2: { id: 2, key: "house", name: "Ev", desc: "Gezegene yerleşimci getirir, puan verir.", cost: { wood: 8, stone: 2 }, score: 10, unlockLevel: 1 },
  3: { id: 3, key: "quarry", name: "Taş Ocağı", desc: "Yalnızca kayalık ve karlı alana kurulur, taş üretir.", cost: { wood: 6, stone: 0 }, score: 2, unlockLevel: 1, requires: "rock", produces: { stone: 0.2 } },
  4: { id: 4, key: "shield", name: "Kalkan", desc: "Çevresindeki alanı meteorlardan korur.", cost: { wood: 0, stone: 10 }, score: 2, unlockLevel: 1 },
  5: { id: 5, key: "tower", name: "Kule", desc: "Gezegenin simgesi. Bol puan.", cost: { wood: 15, stone: 15 }, score: 30, unlockLevel: 2 },
  6: { id: 6, key: "garden", name: "Bahçe", desc: "Çiçekli dinlenme alanı, puan verir.", cost: { wood: 4, stone: 1 }, score: 5, unlockLevel: 3 },
};
export const BUILDING_LIST = Object.values(BUILDINGS);

export const SHIELD_RADIUS = 0.42; // radyan (~4 hücre)
export const DAY_LENGTH = 90; // saniye
export const NIGHT_START = 0.6; // günün bu oranından sonra gece
export const METEOR_FALL_TIME = 3.2; // saniye
export const MAX_RESOURCE = 999;
export const REFUND_RATE = 0.5;
export const CRATER_STONE = 2;
export const LEVEL_SCORE = 60;

export const START_RESOURCES = { wood: 12, stone: 0 };

export const levelFor = (score: number) => 1 + Math.floor(score / LEVEL_SCORE);
export const levelProgress = (score: number) => (score % LEVEL_SCORE) / LEVEL_SCORE;
export const dayPhase = (time: number) => (time % DAY_LENGTH) / DAY_LENGTH;
export const isNight = (time: number) => dayPhase(time) >= NIGHT_START;
export const dayNumber = (time: number) => Math.floor(time / DAY_LENGTH) + 1;
export const meteorCountForDay = (day: number) => Math.min(2 + day, 14);

export type Counts = Record<CellValue, number>;
export function countCells(cells: ArrayLike<number>): Counts {
  const c = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 } as Counts;
  for (let k = 0; k < cells.length; k++) c[cells[k] as CellValue]++;
  return c;
}
export function scoreOf(counts: Counts) {
  let s = 0;
  for (const b of BUILDING_LIST) s += counts[b.id] * b.score;
  return s;
}
/** Saniye başına üretim. */
export function productionOf(counts: Counts) {
  let wood = 0, stone = 0;
  for (const b of BUILDING_LIST) { wood += counts[b.id] * (b.produces?.wood ?? 0); stone += counts[b.id] * (b.produces?.stone ?? 0); }
  return { wood, stone };
}

export type PlaceError = "occupied" | "water" | "needs-rock" | "locked" | "no-wood" | "no-stone" | "crater";
export function canPlace(b: BuildingDef, cell: number, cells: ArrayLike<number>, terrain: TerrainData, wood: number, stone: number, level: number): PlaceError | null {
  if (cells[cell] === Cell.CRATER) return "crater";
  if (cells[cell] !== Cell.EMPTY) return "occupied";
  if (!isLand(terrain, cell)) return "water";
  if (b.requires === "rock" && !isRocky(terrain, cell)) return "needs-rock";
  if (level < b.unlockLevel) return "locked";
  if (wood < b.cost.wood) return "no-wood";
  if (stone < b.cost.stone) return "no-stone";
  return null;
}
export const PLACE_ERROR_TEXT: Record<PlaceError, string> = {
  occupied: "Burası dolu.", water: "Suya inşaat yapılamaz.", "needs-rock": "Taş ocağı yalnızca kayalık/karlı alana kurulur.",
  locked: "Bu yapı henüz açılmadı.", "no-wood": "Yeterli odun yok.", "no-stone": "Yeterli taş yok.", crater: "Önce krateri temizle (tıkla).",
};

/** Bir hücre en az bir kalkanın koruma alanında mı? */
export function isShielded(cell: number, cells: ArrayLike<number>) {
  const d = DIRS[cell];
  for (let k = 0; k < CELLS; k++) if (cells[k] === Cell.SHIELD && angularDistance(d, DIRS[k]) <= SHIELD_RADIUS) return true;
  return false;
}

export type Meteor = { id: number; cell: number; spawnAt: number; impactAt: number; lateral: number };
export type Impact = { id: number; cell: number; at: number; blocked: boolean; destroyed: CellValue };

/** Meteor çarpması: kalkan varsa engellenir, yoksa hücre kratere döner. Hücre dizisini yerinde değiştirir. */
export function resolveMeteor(m: Meteor, cells: Uint8Array): Impact {
  if (isShielded(m.cell, cells)) return { id: m.id, cell: m.cell, at: m.impactAt, blocked: true, destroyed: Cell.EMPTY };
  const destroyed = cells[m.cell] as CellValue;
  cells[m.cell] = Cell.CRATER;
  return { id: m.id, cell: m.cell, at: m.impactAt, blocked: false, destroyed };
}

/** Deterministik sözde rastgele üretici (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Gece için meteor hedefleri: %65 ihtimalle yapılı bir hücre, aksi halde rastgele kara. */
export function planNight(day: number, time: number, cells: ArrayLike<number>, terrain: TerrainData, random: () => number, idStart: number): Meteor[] {
  const count = meteorCountForDay(day);
  const built: number[] = [], land: number[] = [];
  for (let k = 0; k < CELLS; k++) { if (!isLand(terrain, k)) continue; land.push(k); if (cells[k] !== Cell.EMPTY && cells[k] !== Cell.CRATER) built.push(k); }
  const dayStart = time - (time % DAY_LENGTH);
  const nightFrom = dayStart + DAY_LENGTH * (NIGHT_START + 0.03), nightTo = dayStart + DAY_LENGTH * 0.96;
  const out: Meteor[] = [];
  for (let n = 0; n < count; n++) {
    const pool = built.length && random() < 0.65 ? built : land;
    const cell = pool[Math.floor(random() * pool.length)];
    const spawnAt = nightFrom + ((n + random() * 0.8) / count) * (nightTo - nightFrom);
    out.push({ id: idStart + n, cell, spawnAt, impactAt: spawnAt + METEOR_FALL_TIME, lateral: random() * Math.PI * 2 });
  }
  return out.sort((a, b) => a.spawnAt - b.spawnAt);
}

// ---------------- Görevler ----------------
export type Stats = { blocked: number; destroyed: number; cleared: number; built: number };
export type MissionCtx = { counts: Counts; day: number; level: number; stats: Stats };
export type Mission = { id: string; text: string; reward: Partial<Cost>; target: number; progress: (c: MissionCtx) => number };
export const MISSIONS: Mission[] = [
  { id: "trees3", text: "3 ağaç dik", reward: { wood: 6 }, target: 3, progress: (c) => c.counts[Cell.TREE] },
  { id: "house1", text: "Bir ev kur", reward: { stone: 4 }, target: 1, progress: (c) => c.counts[Cell.HOUSE] },
  { id: "quarry1", text: "Kayalık alana taş ocağı kur", reward: { stone: 6 }, target: 1, progress: (c) => c.counts[Cell.QUARRY] },
  { id: "shield1", text: "Bir kalkan kur (gece meteor yağacak!)", reward: { wood: 12 }, target: 1, progress: (c) => c.counts[Cell.SHIELD] },
  { id: "night1", text: "İlk geceyi atlat", reward: { stone: 8 }, target: 2, progress: (c) => c.day },
  { id: "houses4", text: "4 ev kur", reward: { wood: 10, stone: 6 }, target: 4, progress: (c) => c.counts[Cell.HOUSE] },
  { id: "level2", text: "Seviye 2'ye ulaş (Kule açılır)", reward: { wood: 20, stone: 10 }, target: 2, progress: (c) => c.level },
  { id: "tower1", text: "Bir kule inşa et", reward: { stone: 20 }, target: 1, progress: (c) => c.counts[Cell.TOWER] },
  { id: "block3", text: "3 meteor engelle", reward: { wood: 15, stone: 15 }, target: 3, progress: (c) => c.stats.blocked },
  { id: "clear3", text: "3 krater temizle (meteor taşı topla)", reward: { stone: 10 }, target: 3, progress: (c) => c.stats.cleared },
  { id: "level3", text: "Seviye 3'e ulaş (Bahçe açılır)", reward: { wood: 30, stone: 20 }, target: 3, progress: (c) => c.level },
  { id: "garden5", text: "5 bahçe yap", reward: { stone: 25 }, target: 5, progress: (c) => c.counts[Cell.GARDEN] },
  { id: "level5", text: "Seviye 5'e ulaş", reward: { wood: 50, stone: 50 }, target: 5, progress: (c) => c.level },
  { id: "houses20", text: "20 ev kur — gezegen başkenti", reward: { wood: 99, stone: 99 }, target: 20, progress: (c) => c.counts[Cell.HOUSE] },
];
