import { useEffect } from "react";
import { useGame } from "../game/store";
import { BUILDING_LIST, type Tool } from "../game/rules";
import Icon from "./Icon";

export default function BuildMenu() {
  const tool = useGame((s) => s.tool);
  const level = useGame((s) => s.level);
  const wood = useGame((s) => Math.floor(s.wood));
  const stone = useGame((s) => Math.floor(s.stone));
  const setTool = useGame((s) => s.setTool);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "6") setTool(Number(e.key) as Tool);
      if (e.key.toLowerCase() === "x") setTool("remove");
      if (e.key === "Escape") useGame.getState().openMenu();
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [setTool]);
  const Btn = ({ t, icon, name, cost, locked, desc, hotkey }: { t: Tool; icon: string; name: string; cost?: { wood: number; stone: number }; locked?: number; desc: string; hotkey: string }) => {
    const sel = tool === t;
    const afford = !cost || (wood >= cost.wood && stone >= cost.stone);
    return (
      <button onClick={() => setTool(t)} disabled={!!locked} title={desc} className={`group relative flex min-w-[76px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] transition md:min-w-[92px] ${sel ? "bg-accent/30 ring-2 ring-accent" : "hover:bg-white/10"} ${locked ? "opacity-40" : ""}`}>
        <Icon name={icon} size={26} />
        <span className="font-bold leading-none">{name}</span>
        {locked ? <span className="text-[10px] text-white/60">Seviye {locked}</span> : cost ? (
          <span className={`flex gap-1.5 text-[10px] ${afford ? "text-white/70" : "text-red-300"}`}>{cost.wood > 0 && <span className="flex items-center gap-0.5"><Icon name="wood" size={10} />{cost.wood}</span>}{cost.stone > 0 && <span className="flex items-center gap-0.5"><Icon name="stone" size={10} />{cost.stone}</span>}</span>
        ) : <span className="text-[10px] text-white/60">%50 iade</span>}
        <span className="absolute right-1 top-1 rounded bg-white/10 px-1 text-[9px] text-white/50">{hotkey}</span>
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-44 -translate-x-1/2 rounded-lg bg-black/85 p-2 text-[11px] font-normal leading-snug text-white/80 group-hover:block">{desc}</span>
      </button>
    );
  };
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3 md:p-4">
      <div className="panel pointer-events-auto flex max-w-full gap-1 overflow-x-auto p-1.5">
        {BUILDING_LIST.map((b) => <Btn key={b.id} t={b.id} icon={b.key} name={b.name} cost={b.cost} locked={level < b.unlockLevel ? b.unlockLevel : undefined} desc={b.desc} hotkey={String(b.id)} />)}
        <Btn t="remove" icon="remove" name="Kaldır" desc="Bir yapıyı söker, maliyetin yarısını geri verir." hotkey="X" />
      </div>
    </div>
  );
}
