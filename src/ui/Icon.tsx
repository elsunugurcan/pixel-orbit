/** 8×8 pixel ikonlar — harf → renk eşlemesiyle SVG olarak çizilir. */
const P: Record<string, string> = { G: "#3f9c47", g: "#52b85c", B: "#6b3f22", C: "#f3e6cd", R: "#c2410c", D: "#5b3a21", S: "#9ca3af", s: "#6b7280", K: "#374151", c: "#22d3ee", L: "#94a3b8", T: "#78716c", Y: "#fde047", P: "#f472b6", W: "#f8fafc", r: "#ef4444", O: "#f97316", N: "#262626", b: "#3b82e6", w: "#d9b370", x: "#111827", M: "#cbd5e1", "1": "#a855f7", "2": "#e9d5ff" };
const ICONS: Record<string, string[]> = {
  tree: ["...gg...", "..gGGg..", ".gGGGGg.", "gGGGGGGg", ".gGGGGg.", "...BB...", "...BB...", "...BB..."],
  house: ["...RR...", "..RRRR..", ".RRRRRR.", "RRRRRRRR", ".CCCCCC.", ".CCbbCC.", ".CCDDCC.", ".CCDDCC."],
  quarry: ["......K.", "..SS..K.", ".SSSS.K.", ".SsSS.KK", "ssssssss", "ssssssss", "KKKKKKKK", "KKKKKKKK"],
  shield: ["...cc...", "..cccc..", "..cccc..", "...LL...", "...LL...", "..LLLL..", "..LLLL..", ".ssssss."],
  tower: ["...YY...", "..TTTT..", "...TT...", "...TT...", "..TTTT..", "...TT...", "..TTTT..", ".TTTTTT."],
  garden: ["P..Y..W.", "PP.YY.WW", ".B..B..B", "ggggGGgg", "GGGGGGGG", "gGGggGGg", "........", "........"],
  remove: ["r......r", ".r....r.", "..r..r..", "...rr...", "...rr...", "..r..r..", ".r....r.", "r......r"],
  wood: ["........", ".wwwwww.", "wBwwwwBw", "wwBwwBww", "wwBwwBww", "wBwwwwBw", ".wwwwww.", "........"],
  stone: ["........", "...SS...", "..SSSs..", ".SSSSss.", ".SSsSss.", "..Ssss..", "........", "........"],
  star: ["...YY...", "...YY...", "YYYYYYYY", ".YYYYYY.", "..YYYY..", "..Y..Y..", ".Y....Y.", "........"],
  sun: ["........", "..YYYY..", ".YYYYYY.", ".YYYYYY.", ".YYYYYY.", ".YYYYYY.", "..YYYY..", "........"],
  moon: ["...MMM..", "..MM....", ".MM.....", ".MM.....", ".MM.....", "..MM....", "...MMM..", "........"],
  meteor: ["......O.", ".....OO.", "....OO..", "...NN...", "..NNNN..", "..NNNN..", "...NN...", "........"],
  planet: ["..1111..", ".111221.", "11122211", "11222211", "11122111", "12211111", ".111111.", "..1111.."],
  play: ["..W.....", "..WW....", "..WWW...", "..WWWW..", "..WWW...", "..WW....", "..W.....", "........"],
  pause: [".WW..WW.", ".WW..WW.", ".WW..WW.", ".WW..WW.", ".WW..WW.", ".WW..WW.", ".WW..WW.", "........"],
  sound: ["....W...", "...WW.W.", "..WWW..W", "WWWWW..W", "WWWWW..W", "..WWW..W", "...WW.W.", "....W..."],
  mute: ["....W.rr", "...WW.r.", "..WWWr..", "WWWWr...", "WWWr....", "..rWW...", ".r.WW...", "r...W..."],
  crater: ["........", "..NNNN..", ".NNOONN.", "NNOOOONN", "NNOOOONN", ".NNOONN.", "..NNNN..", "........"],
};
export default function Icon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  const rows = ICONS[name] ?? ICONS.planet;
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" className={`pixel shrink-0 ${className}`} aria-hidden>
      {rows.flatMap((row, y) => row.split("").map((ch, x) => (ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={P[ch] ?? "#fff"} />)))}
    </svg>
  );
}
