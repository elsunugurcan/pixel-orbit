# Pixel Orbit

Tarayıcıda oynanan pixel art gezegen inşa oyunu. Minik bir voxel gezegeni ağaç, ev, taş ocağı ve kulelerle büyütür; geceleri meteor yağmuruna karşı kalkanlarla korursun. Oyun otomatik kaydedilir.

## Teknolojiler
- **Vite + React 18 + TypeScript**
- **Three.js / React Three Fiber + drei** — instanced voxel gezegen, gölgeler, gün/gece döngüsü, meteor efektleri
- **Zustand** (persist) — oyun durumu ve kayıt (localStorage)
- **Vitest** — oyun kurallarının birim testleri (ızgara, arazi, ekonomi, meteor/kalkan, görevler, kayıt)
- **Playwright** — uçtan uca test ve gerçek ekran görüntüleri
- **Tailwind CSS** — arayüz; ikonlar 8×8 pixel SVG olarak koddan çizilir

## Oyun mekaniği
- Gezegen, **küp-küre ızgarası** (6 yüz × 16×16 = 1.536 hücre) üzerine kurulu; her hücrenin yerel çerçevesi vardır, yapılar yüzeye dik oturur.
- Tohumlu **gürültü tabanlı arazi**: su, kumsal, çayır, kayalık, karlı zirve. Taş ocağı yalnızca kayalık/karlı alana kurulur.
- **Ekonomi**: ağaçlar odun, taş ocakları taş üretir; ev/kule/bahçe puan verir; puan seviye açar (Kule sv. 2, Bahçe sv. 3).
- **Gündüz/gece** (90 sn): gece, gün sayısına göre artan meteor yağmuru. **Kalkan** çevresindeki alanı korur; korunmayan hücre kratere döner, krater temizlenince meteor taşı verir.
- 14 adımlı **görev zinciri**, ödüller, seviye bildirimleri; kaldırma aracı (%50 iade); klavye kısayolları (1-6, X, Esc).
- **Grafik kalitesi** (Yüksek/Düşük): telefonlarda gölgesiz ve düşük çözünürlüklü mod otomatik seçilir.

## Çalıştırma
```bash
npm install
npm run dev        # http://localhost:5173
```

## Test
```bash
npm test                         # 22 birim testi (Vitest)
npm run build && npm run preview # ardından:
npm run test:e2e                 # Playwright: menü → oyun → inşa → gece/meteor → kayıt; screenshots/ klasörüne görseller
```
`window.PixelOrbit` (zustand deposu) geliştirici konsolundan durum incelemek ve otomatik testler için açıktır.
