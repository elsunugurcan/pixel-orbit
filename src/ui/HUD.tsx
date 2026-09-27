import { useGame } from "../game/store";
import { useUI } from "../three/ui";
import { BUILDINGS, Cell, DAY_LENGTH, LEVEL_SCORE, NIGHT_START, dayNumber, dayPhase, levelProgress, productionOf, type Building } from "../game/rules";
import { TERRAIN_NAME, type TerrainKind } from "../game/terrain";
import Icon from "./Icon";

export default function HUD() {
  const wood = useGame((s) => Math.floor(s.wood));
  const stone = useGame((s) => Math.floor(s.stone));
  const score = useGame((s) => s.score);
  const level = useGame((s) => s.level);
  const counts = useGame((s) => s.counts);
  const day = useGame((s) => dayNumber(s.time));
  const phasePct = useGame((s) => Math.round(dayPhase(s.time) * 200) / 2);
  const night = phasePct / 100 >= NIGHT_START;
  const nextSpawn = useGame((s) => (s.planned[0] ? Math.max(0, Math.ceil(s.planned[0].spawnAt - s.time)) : null));
  const incoming = useGame((s) => s.meteors.length + s.planned.length);
  const muted = useGame((s) => s.muted);
  const { toggleMute, openMenu } = useGame.getState();
  const hover = useUI((s) => s.hoverCell);
  const hoverKind = useGame((s) => (hover === null ? -1 : s.terrain.kind[hover]));
  const hoverValue = useGame((s) => (hover === null ? -1 : s.cells[hover]));
  const hoverInfo = hover === null ? null : { terrain: TERRAIN_NAME[hoverKind as TerrainKind], v: hoverValue };
  const prod = productionOf(counts);
  const toNight = Math.max(0, Math.ceil((NIGHT_START - phasePct / 100) * DAY_LENGTH));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-2 p-2 md:gap-3 md:p-4">
      <div className="flex flex-col gap-2">
        <div className="panel pointer-events-auto flex items-center gap-1.5 px-2 py-1.5 md:gap-3 md:px-3 md:py-2">
          <span className="chip" title="Odun"><Icon name="wood" size={18} /> {wood}<span className="ml-1 hidden text-[10px] font-normal text-white/50 sm:inline">+{prod.wood.toFixed(2)}/sn</span></span>
          <span className="chip" title="Taş"><Icon name="stone" size={18} /> {stone}<span className="ml-1 hidden text-[10px] font-normal text-white/50 sm:inline">+{prod.stone.toFixed(2)}/sn</span></span>
          <span className="chip" title="Puan"><Icon name="star" size={18} /> {score}</span>
        </div>
        <div className="panel pointer-events-auto px-3 py-2">
          <div className="flex items-center justify-between gap-4 text-xs"><span className="font-bold">Seviye {level}</span><span className="hidden text-white/50 sm:inline">{score % LEVEL_SCORE}/{LEVEL_SCORE} · sonraki: {level + 1 === 2 ? "Kule" : level + 1 === 3 ? "Bahçe" : "yeni biyom"}</span></div>
          <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-white/10 sm:w-44 md:w-56"><div className="h-full rounded-full bg-gradient-to-r from-accent to-sky transition-[width]" style={{ width: `${levelProgress(score) * 100}%` }} /></div>
        </div>
        {hoverInfo && (
          <div className="panel hidden px-3 py-1.5 text-xs text-white/70 md:block">{hoverInfo.terrain} · {hoverInfo.v === Cell.EMPTY ? "boş" : hoverInfo.v === Cell.CRATER ? "krater — tıkla, taş topla" : BUILDINGS[hoverInfo.v as Building]?.name}</div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="panel pointer-events-auto flex items-center gap-1.5 px-2 py-1.5 md:gap-2 md:px-3 md:py-2">
          <div className="flex items-center gap-2 text-xs"><Icon name={night ? "moon" : "sun"} size={18} /><span className="font-bold">Gün {day}</span><span className="hidden text-white/50 sm:inline">· {night ? "Gece" : `Geceye ${toNight} sn`}</span></div>
          <div className="relative ml-1 hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/10 sm:block md:w-36"><div className="absolute inset-y-0 right-0 bg-indigo-500/40" style={{ width: `${(1 - NIGHT_START) * 100}%` }} /><div className="absolute inset-y-0 left-0 rounded-full bg-amber-300" style={{ width: `${phasePct}%` }} /></div>
          <button onClick={toggleMute} className="ml-1 rounded-lg p-1.5 hover:bg-white/10" aria-label={muted ? "Sesi aç" : "Sesi kapat"}><Icon name={muted ? "mute" : "sound"} size={16} /></button>
          <button onClick={openMenu} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Menü"><Icon name="pause" size={16} /></button>
        </div>
        {incoming > 0 && (
          <div className="panel pulse-red flex items-center gap-2 border-red-500/40 bg-red-950/70 px-3 py-2 text-xs font-bold text-red-200"><Icon name="meteor" size={18} />{nextSpawn !== null && nextSpawn > 0 ? `Meteor yağmuru: ${incoming} meteor · ilki ${nextSpawn} sn` : `${incoming} meteor düşüyor!`}</div>
        )}
      </div>
    </div>
  );
}
