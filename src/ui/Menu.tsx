import { useState } from "react";
import { useGame } from "../game/store";
import { dayNumber } from "../game/rules";
import { sfx } from "../game/audio";
import Icon from "./Icon";

export default function Menu() {
  const hasSave = useGame((s) => s.hasSave);
  const day = useGame((s) => dayNumber(s.time));
  const score = useGame((s) => s.score);
  const level = useGame((s) => s.level);
  const built = useGame((s) => s.stats.built);
  const muted = useGame((s) => s.muted);
  const quality = useGame((s) => s.quality);
  const { newGame, continueGame, toggleMute, setQuality } = useGame.getState();
  const [help, setHelp] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const start = (fn: () => void) => { sfx.unlock(); fn(); };
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-md p-6 text-center md:p-8">
        <div className="float mx-auto w-max"><Icon name="planet" size={72} /></div>
        <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.4em] text-white/50">Pixel</div>
        <h1 className="bg-gradient-to-r from-purple-300 via-white to-cyan-200 bg-clip-text text-5xl font-bold tracking-tight text-transparent">ORBIT</h1>
        <p className="mt-2 text-sm text-white/60">Minik bir gezegeni büyüt, geceleri meteorlardan koru.</p>
        {help ? (
          <div className="mt-5 space-y-2 text-left text-sm text-white/80">
            {[["Çevir", "Gezegeni sürükleyerek döndür, tekerlek/iki parmakla yaklaş."], ["İnşa et", "Alttaki menüden yapı seç (1-6), yüzeydeki bir kareye tıkla. Yeşil vurgu = olur, kırmızı = olmaz."], ["Üret", "Ağaçlar odun, taş ocakları (yalnızca kayalık alanda) taş üretir. Evler ve kuleler puan verir; puan seviye açar."], ["Koru", "Gece meteor yağar. Kalkanlar çevrelerindeki alanı korur; kalkansız yapılar kratere döner. Kratere tıklayıp meteor taşı topla."], ["Görevler", "Sol alttaki görevleri tamamla, ödül kazan. Oyun otomatik kaydedilir."]].map(([t, d]) => <div key={t} className="flex gap-3 rounded-xl bg-white/5 p-3"><b className="w-16 shrink-0 text-mint">{t}</b><span className="text-white/70">{d}</span></div>)}
            <button onClick={() => setHelp(false)} className="btn-ghost w-full">Geri</button>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {hasSave && !confirm && <button onClick={() => start(continueGame)} className="btn-primary w-full !py-3 text-base"><Icon name="play" size={16} /> Devam et · Gün {day}, Seviye {level}</button>}
            {confirm ? (
              <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm"><p className="text-white/80">Mevcut gezegen silinecek. Emin misin?</p><div className="mt-2 flex gap-2"><button onClick={() => start(() => newGame())} className="btn bg-red-500 text-white flex-1">Evet, yeni gezegen</button><button onClick={() => setConfirm(false)} className="btn-ghost flex-1">Vazgeç</button></div></div>
            ) : (
              <button onClick={() => (hasSave ? setConfirm(true) : start(() => newGame()))} className={`${hasSave ? "btn-ghost" : "btn-primary !py-3 text-base"} w-full`}>Yeni gezegen</button>
            )}
            <div className="flex gap-2"><button onClick={() => setHelp(true)} className="btn-ghost flex-1">Nasıl oynanır?</button><button onClick={toggleMute} className="btn-ghost flex-1"><Icon name={muted ? "mute" : "sound"} size={14} /> {muted ? "Ses kapalı" : "Ses açık"}</button><button onClick={() => setQuality(quality === "high" ? "low" : "high")} className="btn-ghost flex-1" title="Düşük: gölgesiz, daha akıcı (telefon için)">{quality === "high" ? "Grafik: Yüksek" : "Grafik: Düşük"}</button></div>
            {hasSave && <div className="grid grid-cols-3 gap-2 pt-2 text-xs text-white/60">{[["Puan", score], ["Yapı", built], ["Gün", day]].map(([a, b]) => <div key={a as string} className="rounded-lg bg-white/5 py-2"><div className="text-lg font-bold text-white">{b as number}</div>{a as string}</div>)}</div>}
          </div>
        )}
        <p className="mt-5 text-[10px] text-white/35">uurstudio · konsept oyun · Three.js / React Three Fiber</p>
      </div>
    </div>
  );
}
