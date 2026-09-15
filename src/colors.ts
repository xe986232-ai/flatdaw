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

// Warna region audio — TETAP, gak ikut acakan Random Color/trackColors kayak
// clip pattern/MIDI lain. Niru "st-purple-rain-set" di Soundtrap: klip audio
// asli (punya sampleName/waveform) selalu ungu indigo, apapun warna track-nya,
// biar kebeda jelas dari clip MIDI/pattern (yang masih ikut palet acak).
// Fill-nya semi-transparan (bukan solid) — niru tampilan region audio di
// Ableton Live: warna track cuma jadi tint lembut di belakang, waveform-nya
// (currentColor/ink) yang jadi fokus utama, bukan blok warna pekat.
export const AUDIO_REGION_BASE_HEX = '#6C5CE7'
export const AUDIO_REGION_COLOR: FlatColor = { fill: hexToRgba(AUDIO_REGION_BASE_HEX, 0.88), ink: '#EFECFF' }
