// Curated flat, matte color pairs (fill + ink) — no gradients, no shadows.
// Ink is chosen per fill for readable, still-flat contrast.
export interface FlatColor {
  fill: string
  ink: string
}

export const FLAT_PALETTE: FlatColor[] = [
  { fill: '#FF3EA5', ink: '#1A0410' }, // hot magenta
  { fill: '#FFE600', ink: '#0D0D00' }, // pure yellow
  { fill: '#FF7A00', ink: '#1F0F00' }, // vivid orange
  { fill: '#0091FF', ink: '#00121F' }, // electric blue
  { fill: '#00E0D0', ink: '#00201D' }, // bright teal/cyan
  { fill: '#22FF6E', ink: '#00230E' }, // acid green
  { fill: '#B026FF', ink: '#1B0429' }, // vivid purple
  { fill: '#FF2E2E', ink: '#210000' }, // pure red
  { fill: '#00B3FF', ink: '#001A24' }, // sky blue
  { fill: '#FFC800', ink: '#1F1700' }, // gold
  { fill: '#FF00C8', ink: '#210019' }, // magenta-pink
  { fill: '#39FF14', ink: '#062400' }, // neon green
  { fill: '#00FFA3', ink: '#00241A' }, // spring green
  { fill: '#FF5CB3', ink: '#26051A' }, // bubblegum pink
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

export function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
