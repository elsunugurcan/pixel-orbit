// Uçtan uca test + gerçek ekran görüntüleri. Önce: npm run build && npm run preview (port 4173)
// Yazılım (SwiftShader) WebGL'de kare süresi uzun olduğundan zaman aşımı yüksek tutulur.
import { chromium } from "playwright";
import fs from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = process.env.OUT ?? "screenshots";
const Q = process.env.QUALITY ?? "low";
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const ok = (c, m) => { if (!c) throw new Error("TEST BAŞARISIZ: " + m); console.log("✓", m); };
const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 180000 }); console.log("📸", name); };
const state = () => page.evaluate(() => { const s = window.PixelOrbit.getState(); return { screen: s.screen, wood: s.wood, stone: s.stone, score: s.score, level: s.level, counts: s.counts, time: s.time, meteors: s.meteors.length, planned: s.planned.length, missionIndex: s.missionIndex, stats: s.stats, tool: s.tool, hasSave: s.hasSave }; });

await page.goto(`${BASE}/?q=${Q}`);
await page.waitForSelector("canvas");
await page.waitForTimeout(1500);
await shot("01-menu");
ok((await state()).screen === "menu", "ana menü açıldı");

// Nasıl oynanır paneli
await page.getByRole("button", { name: "Nasıl oynanır?" }).click();
ok((await page.locator("text=Kalkanlar çevrelerindeki alanı korur").count()) === 1, "yardım paneli");
await page.getByRole("button", { name: "Geri" }).click();

// Yeni oyun (sabit tohum: görseller tekrarlanabilir olsun)
await page.evaluate(() => window.PixelOrbit.getState().newGame(20260927));
await page.waitForTimeout(800);
let s = await state();
ok(s.screen === "game" && s.wood === 12 && s.stone === 0, "yeni gezegen: başlangıç kaynakları");

// Gerçek tıklama ile ağaç dikme: gezegen üzerinde kara bulana kadar farklı noktalara tıkla
const clickTree = async () => {
  const before = (await state()).counts[1];
  for (const [x, y] of [[720, 470], [760, 430], [680, 430], [700, 520], [780, 500], [640, 480], [720, 380], [800, 440], [660, 560], [820, 380]]) {
    await page.mouse.click(x, y); await page.waitForTimeout(350);
    if ((await state()).counts[1] === before + 1) return true;
  }
  return false;
};
ok(await clickTree(), "tıklayarak ağaç dikildi");
s = await state();
ok(s.wood === 9, "3 odun düştü");
ok(await clickTree() && await clickTree(), "3 ağaç dikildi");
await page.evaluate(() => window.PixelOrbit.getState().tick(0.01)); // yazılım GL'de kare seyrek; döngüyü elle ilerlet
s = await state();
ok(s.missionIndex === 1 && s.wood >= 9, "ilk görev tamamlandı, ödül verildi");

// Kule kilitli (seviye 2) → araç seçilemez
ok(await page.getByRole("button", { name: /Kule/ }).isDisabled(), "kule seviye 1'de kilitli");

// Programatik olarak gelişmiş bir gezegen kur (görseller için) — kurallar üzerinden (place), doğrudan yazma değil
await page.evaluate(() => {
  const g = window.PixelOrbit; const st = g.getState();
  g.setState({ wood: 400, stone: 300 });
  const T = st.terrain; const D = window.PixelOrbitDirs; const land = [], rock = [];
  // kameraya bakan yarımküre (+z), görseller için
  const visible = (k) => D[k][2] > 0.25 && D[k][1] > -0.35;
  for (let k = 0; k < T.kind.length; k++) { if (!visible(k)) continue; if (T.kind[k] === 2 && (k % 2 === 0)) land.push(k); if (T.kind[k] >= 3 && k % 2 === 0) rock.push(k); }
  const front = (a, b) => D[b][2] - D[a][2]; land.sort(front); rock.sort(front);
  const plan = [[1, land.slice(0, 26)], [2, land.slice(26, 40)], [3, rock.slice(0, 5)], [4, [land[40], land[52], land[64], land[80]]], [6, land.slice(41, 47)]];
  for (const [tool, cells] of plan) { g.getState().setTool(tool); for (const c of cells) g.getState().place(c); }
  g.getState().setTool(5); for (const c of land.slice(48, 51)) g.getState().place(c);
});
await page.waitForTimeout(600);
s = await state();
ok(s.counts[2] === 14 && s.counts[4] === 4 && s.level >= 2 && s.counts[5] === 3, `gelişmiş gezegen: ${s.counts[1]} ağaç, ${s.counts[2]} ev, ${s.counts[3]} ocak, ${s.counts[4]} kalkan, ${s.counts[5]} kule, seviye ${s.level}`);
await page.mouse.move(700, 300);
await page.waitForTimeout(500);
await shot("02-gunduz-gezegen");

// Geceye sar: meteorlar planlanmalı ve düşmeli
await page.evaluate(() => { const g = window.PixelOrbit; g.setState({ time: 90 * 0.62 }); g.getState().tick(0.01); });
await page.waitForTimeout(300);
s = await state();
ok(s.planned + s.meteors > 0, `gece planlandı: ${s.planned + s.meteors} meteor`);
await page.evaluate(() => {
  const g = window.PixelOrbit; const D = window.PixelOrbitDirs; const T = g.getState().terrain;
  // görsel için: hedefleri kameraya bakan karaya taşı (oyun kuralı değişmez, yalnızca ekran görüntüsü)
  const vis = []; for (let k = 0; k < T.kind.length; k++) if (T.kind[k] !== 0 && D[k][2] > 0.3 && D[k][1] > 0.35 && D[k][1] < 0.8) vis.push(k);
  const planned = g.getState().planned.map((m, i) => ({ ...m, cell: vis[(i * 37) % vis.length] }));
  g.setState({ planned });
  const first = planned[0]; if (first) g.setState({ time: first.spawnAt + 2.3 }); g.getState().tick(0.01);
});
await page.waitForTimeout(500);
s = await state();
ok(s.meteors >= 1, "meteor düşüyor");
await shot("03-gece-meteor");
// gecenin sonuna kadar ilerlet
await page.evaluate(() => { const g = window.PixelOrbit; for (let i = 0; i < 45; i++) g.getState().tick(1); });
await page.waitForTimeout(400);
s = await state();
ok(s.meteors === 0 && s.planned === 0 && (s.stats.blocked + s.stats.destroyed + s.counts[7]) > 0, `gece bitti: ${s.stats.blocked} engellendi, ${s.stats.destroyed} yapı yıkıldı, ${s.counts[7]} krater`);
await shot("04-gece-sonrasi");

// Kayıt: sayfayı yenile, devam et
await page.reload(); await page.waitForSelector("canvas"); await page.waitForTimeout(1500);
s = await state();
ok(s.screen === "menu" && s.hasSave && s.counts[2] >= 10, "yenilemeden sonra kayıt korunuyor");
await page.getByRole("button", { name: /Devam et/ }).click();
await page.waitForTimeout(500);
ok((await state()).screen === "game", "devam et çalışıyor");

// Mobil görünüm
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await m.goto(`${BASE}/?q=low`); await m.waitForSelector("canvas"); await m.waitForTimeout(1200);
await m.screenshot({ path: `${OUT}/m1-menu.png`, timeout: 180000 });
await m.evaluate(() => { const g = window.PixelOrbit; g.getState().newGame(20260927); g.setState({ wood: 200, stone: 100 }); const T = g.getState().terrain; const land = []; for (let k = 0; k < T.kind.length; k++) if (T.kind[k] === 2 && k % 4 === 0) land.push(k); g.getState().setTool(1); land.slice(0, 20).forEach((c) => g.getState().place(c)); g.getState().setTool(2); land.slice(20, 30).forEach((c) => g.getState().place(c)); });
await m.waitForTimeout(800);
await m.screenshot({ path: `${OUT}/m2-oyun.png`, timeout: 180000 });
console.log("📸 mobil");

ok(errors.filter((e) => !/deprecated/i.test(e)).length === 0, "konsolda hata yok" + (errors.length ? " (" + errors.join(" | ").slice(0, 200) + ")" : ""));
await browser.close();
console.log("\nTÜM TESTLER GEÇTİ");
