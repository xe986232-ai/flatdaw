// Helper kecil khusus Template 02 (sengaja gak import dari colors.ts punya
// Template 01 supaya tiap template tetap berdiri sendiri).

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Campur hex ke arah warna lain (0 = warna asli, 1 = warna target).
export function mix(hex: string, target: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  const [tr, tg, tb] = parseHex(target)
  const ch = (a: number, b2: number) => Math.round(a + (b2 - a) * amount)
  const to2 = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to2(ch(r, tr))}${to2(ch(g, tg))}${to2(ch(b, tb))}`
}

// PRNG deterministik: seed yang sama selalu ngasih gambar yang sama,
// jadi mock-up gak berubah-ubah tiap render.
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Potong label di tengah pakai ".." kalau clip terlalu sempit, ala FL Studio
// ("Fay..ilter", "KSH..01"). `maxChars` = perkiraan jumlah huruf yang muat.
export function fitLabel(label: string, maxChars: number): string {
  if (maxChars < 3) return ''
  if (label.length <= maxChars) return label
  if (maxChars < 5) return label.slice(0, maxChars)
  const keep = maxChars - 2
  const head = Math.ceil(keep / 2)
  const tail = Math.floor(keep / 2)
  return `${label.slice(0, head)}..${label.slice(label.length - tail)}`
}
