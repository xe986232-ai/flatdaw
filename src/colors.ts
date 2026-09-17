// Curated flat, matte color pairs (fill + ink) — no gradients, no shadows.
// Ink is chosen per fill for readable, still-flat contrast.
export interface FlatColor {
  fill: string
  ink: string
}

// Palet dibatasi cuma 10 warna ini (diambil langsung dari swatch yang di-share
// user) — Random Color gak lagi milih di luar 10 warna ini.
export const FLAT_PALETTE: FlatColor[] = [
  { fill: '#C25355', ink: '#1F0A0A' }, // crimson red
  { fill: '#993169', ink: '#1C0A14' }, // berry magenta
  { fill: '#8052D5', ink: '#140B2B' }, // violet purple
  { fill: '#5141D5', ink: '#0C0A2B' }, // indigo blue-violet
  { fill: '#499CC7', ink: '#081C26' }, // sky blue
  { fill: '#6680CF', ink: '#0C1529' }, // periwinkle blue
  { fill: '#4CA490', ink: '#081F1A' }, // teal green
  { fill: '#81B246', ink: '#16220A' }, // olive green
  { fill: '#C0922B', ink: '#241B08' }, // gold
  { fill: '#AF7742', ink: '#221708' }, // orange-tan
]

export function randomFlatColor(exclude?: string): FlatColor {
  let pick = FLAT_PALETTE[Math.floor(Math.random() * FLAT_PALETTE.length)]
  if (exclude && FLAT_PALETTE.length > 1) {
    while (pick.fill === exclude) {
      pick = FLAT_PALETTE[Math.floor(Math.random() * FLAT_PALETTE.length)]
    }
  }
  return pick
}

// Blend hex ke arah putih sekian persen (0-1) — dipake buat bikin warna
// header clip yang lebih terang dari fill body-nya, niru "column header"
// di Soundtrap: strip judul di atas warnanya lebih muda/pucat dibanding
// badan clip di bawahnya, bukan cuma garis tipis.
export function lighten(hex: string, amount: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const nr = Math.round(r + (255 - r) * amount)
  const ng = Math.round(g + (255 - g) * amount)
  const nb = Math.round(b + (255 - b) * amount)
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

export function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Dipake buat 2 fitur custom color (bukan cuma milih dari FLAT_PALETTE lagi):
// (1) color picker bebas — user pilih SATU warna apa aja lewat <input
// type="color"> (native picker Android/Chrome, ada full spectrum + input hex
// manual), dipasang ke SEMUA track sekaligus (mirip handlePickSingleColor
// tapi gak dibatasi 10 warna preset). (2) tema gradient — user pilih 2 warna
// (atas & bawah), tiap track dapet warna hasil interpolasi linear berdasar
// posisi vertikalnya di trackList (track pertama = warna atas, track
// terakhir = warna bawah, yang di tengah nge-blend proporsional).
//
// Karena inputnya sekarang bebas (bukan dari 10 warna FLAT_PALETTE yang
// ink-nya udah dipilih manual biar kontras bagus), ink (warna teks/waveform
// di atas fill itu) dihitung otomatis dari luminance fill-nya — kalau
// fill-nya terang, ink jadi gelap, dan sebaliknya. Rumus luminance relatif
// standar WCAG (versi disederhanakan, tanpa gamma-correct penuh) — cukup
// buat nentuin terang/gelap kasar, gak perlu presisi kontras AA/AAA.
function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Bikin FlatColor dari hex bebas apa aja — ink-nya (teks/waveform ink)
 * otomatis putih pucat kalau fill-nya gelap, atau nyaris hitam kalau fill-nya
 * terang, biar tetep kebaca kontrasnya walau fill-nya dipilih user sendiri. */
export function flatColorFromHex(hex: string): FlatColor {
  return { fill: hex, ink: relativeLuminance(hex) > 0.5 ? '#14121B' : '#F5F2FF' }
}

/** Interpolasi linear dua warna hex, t dari 0 (persis colorA) sampe 1
 * (persis colorB) — dipake buat nge-blend warna gradient antar track sesuai
 * posisi vertikalnya. */
export function lerpHex(colorA: string, colorB: string, t: number): string {
  const a = colorA.replace('#', '')
  const b = colorB.replace('#', '')
  const clampT = Math.max(0, Math.min(1, t))
  const lerpChannel = (start: number, end: number) => Math.round(start + (end - start) * clampT)
  const rr = lerpChannel(parseInt(a.substring(0, 2), 16), parseInt(b.substring(0, 2), 16))
  const gg = lerpChannel(parseInt(a.substring(2, 4), 16), parseInt(b.substring(2, 4), 16))
  const bb = lerpChannel(parseInt(a.substring(4, 6), 16), parseInt(b.substring(4, 6), 16))
  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`
}

// Warna region audio — TETAP, gak ikut acakan Random Color/trackColors kayak
// clip pattern/MIDI lain. Niru "st-purple-rain-set" di Soundtrap: klip audio
// asli (punya sampleName/waveform) selalu ungu indigo, apapun warna track-nya,
// biar kebeda jelas dari clip MIDI/pattern (yang masih ikut palet acak).
// Fill-nya semi-transparan (bukan solid) — niru tampilan region audio di
// Ableton Live: warna track cuma jadi tint lembut di belakang, waveform-nya
// (currentColor/ink) yang jadi fokus utama, bukan blok warna pekat.
export const AUDIO_REGION_BASE_HEX = '#6C5CE7'
export const AUDIO_REGION_COLOR: FlatColor = { fill: hexToRgba(AUDIO_REGION_BASE_HEX, 0.88), ink: '#EFECFF' }
