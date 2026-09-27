import { useGame } from "../game/store";
export default function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="pointer-events-none absolute left-1/2 top-16 z-20 flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2 md:top-20">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-in rounded-xl border px-3 py-2 text-center text-xs font-bold backdrop-blur-md ${t.kind === "good" ? "border-mint/40 bg-lime-950/70 text-lime-100" : t.kind === "bad" ? "border-red-500/40 bg-red-950/70 text-red-100" : "border-white/15 bg-panel/80 text-white/90"}`}>{t.text}</div>
      ))}
    </div>
  );
}
