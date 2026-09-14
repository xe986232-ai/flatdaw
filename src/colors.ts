// Curated flat, matte color pairs (fill + ink) — no gradients, no shadows.
// Ink is chosen per fill for readable, still-flat contrast.
export interface FlatColor {
  fill: string
  ink: string
}

export const FLAT_PALETTE: FlatColor[] = [
  { fill: '#E8788A', ink: '#4A2530' }, // rose
  { fill: '#F0E23C', ink: '#0D0D0D' }, // yellow
  { fill: '#EEA24E', ink: '#2B1B0A' }, // orange
  { fill: '#3B6FA0', ink: '#FFFFFF' }, // steel blue
  { fill: '#A8DDE6', ink: '#1A1A1A' }, // cyan
  { fill: '#7FC8A9', ink: '#123524' }, // mint
  { fill: '#B98CCB', ink: '#2E1A38' }, // purple
  { fill: '#F4A261', ink: '#3A1F0A' }, // coral
  { fill: '#E76F51', ink: '#FFFFFF' }, // red-orange
  { fill: '#8DB6D6', ink: '#12293D' }, // sky
  { fill: '#D9C46A', ink: '#3A2E0A' }, // mustard
  { fill: '#C97BAE', ink: '#3A1830' }, // magenta
  { fill: '#6FBF8B', ink: '#0F2A1A' }, // green
  { fill: '#E68A9E', ink: '#3A1420' }, // pink
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
