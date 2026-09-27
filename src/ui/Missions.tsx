import { useGame } from "../game/store";
import { MISSIONS, dayNumber } from "../game/rules";
import Icon from "./Icon";

export default function Missions() {
  const idx = useGame((s) => s.missionIndex);
  const progress = useGame((s) => { const m = MISSIONS[s.missionIndex]; return m ? Math.min(m.target, m.progress({ counts: s.counts, day: dayNumber(s.time), level: s.level, stats: s.stats })) : 0; });
  const m = MISSIONS[idx];
  return (
    <div className="pointer-events-none absolute left-2 bottom-[6.6rem] z-10 md:left-4 md:bottom-28">
      <div className="panel w-56 px-3 py-2 sm:w-64 md:w-72 md:py-2.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/50"><span>Görev {Math.min(idx + 1, MISSIONS.length)}/{MISSIONS.length}</span>{m && <span className="flex items-center gap-1 normal-case tracking-normal">{m.reward.wood ? <span className="flex items-center gap-0.5"><Icon name="wood" size={10} />+{m.reward.wood}</span> : null}{m.reward.stone ? <span className="flex items-center gap-0.5"><Icon name="stone" size={10} />+{m.reward.stone}</span> : null}</span>}</div>
        {m ? (
          <>
            <div className="mt-1 text-sm font-bold leading-snug">{m.text}</div>
            <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-mint transition-[width]" style={{ width: `${(progress / m.target) * 100}%` }} /></div><span className="text-xs tabular-nums text-white/70">{progress}/{m.target}</span></div>
          </>
        ) : <div className="mt-1 text-sm font-bold">Tüm görevler tamamlandı — gezegenin efsanesisin!</div>}
      </div>
    </div>
  );
}
