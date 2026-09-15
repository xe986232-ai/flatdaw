// Mesin grid berbasis tick, mengikuti spesifikasi di
// "Dokumentasi Arsitektur Grid DAW Web" — birama 4/4, basis 960 PPQ.
//
// Total Ticks per Bar = BEATS_PER_BAR x PPQ
// Jumlah kotak lapisan n = 4 x 2^(n-1)   (lapisan 1 = ketukan/quarter note)
// Grid Size (ticks) lapisan n = Total Ticks per Bar / jumlah kotak lapisan n
//
// Modul ini cuma menghitung grid-nya (ukuran tiap lapisan, dan lapisan mana
// yang paling halus tapi masih kebaca di layar pada zoom saat ini) lalu
// mengubahnya jadi CSS background bertingkat buat digambar di belakang track.

import { BEATS_PER_BAR } from './tracks'

export const PPQ = 960
export const TOTAL_TICKS_PER_BAR = BEATS_PER_BAR * PPQ // 3840 ticks pada 4/4

export const MAX_LAYER = 6 // lapisan 6 = 1/128

/** Jumlah kotak grid per bar pada suatu lapisan (lapisan 1 = ketukan). */
export function cellsPerBar(layer: number): number {
  return 4 * Math.pow(2, layer - 1)
}

/** Ukuran satu kotak grid pada suatu lapisan, dalam ticks. */
export function gridSizeInTicks(layer: number): number {
  return TOTAL_TICKS_PER_BAR / cellsPerBar(layer)
}

/** Algoritma snap/quantize: bulatkan posisi (ticks) ke kelipatan grid terdekat. */
export function snapToGrid(currentTick: number, gridTicks: number): number {
  return Math.round(currentTick / gridTicks) * gridTicks
}

/** Lebar piksel satu kotak grid pada suatu lapisan, untuk lebar 1 bar (px) saat ini. */
export function cellPxWidth(layer: number, barWidthPx: number): number {
  return barWidthPx / cellsPerBar(layer)
}

// Ambang minimum lebar kotak (px) biar garis subdivisi nggak numpuk jadi
// blok solid pas lagi zoom-out — persis alasan grid Ableton otomatis
// "melebur" ke lapisan yang lebih kasar waktu di-zoom keluar.
const MIN_SUBDIV_PX = 6
const MIN_BEAT_PX = 3

/** Lapisan subdivisi terhalus yang kotaknya masih >= minPx pada barWidth ini. */
export function pickFinestLayer(barWidthPx: number, minPx = MIN_SUBDIV_PX): number {
  let chosen = 1
  for (let layer = 2; layer <= MAX_LAYER; layer++) {
    if (cellPxWidth(layer, barWidthPx) < minPx) break
    chosen = layer
  }
  return chosen
}

export interface ArrangementGridStyle {
  backgroundImage: string
  backgroundSize: string
  backgroundRepeat: 'repeat'
}

/**
 * Bikin background CSS 3-tingkat buat area playlist/timeline:
 *  - garis bar (paling tegas, selalu tampil)
 *  - garis ketukan / lapisan 1 (medium, hilang kalau kotaknya kelewat sempit)
 *  - garis subdivisi terhalus yang masih kebaca (adaptif sesuai zoom)
 * Semua dihitung dari cellPxWidth() di atas, jadi kerapatannya selalu
 * konsisten dengan rumus tick pada dokumentasi.
 */
export function buildArrangementGrid(barWidthPx: number): ArrangementGridStyle {
  // Tile ukuran subdivisi dibulatkan ke piksel penuh — sama seperti barWidth
  // di App.tsx, ini menjaga tiap tile digambar presisi (garis tipis 1px yang
  // digambar di posisi pecahan piksel gampang jadi blur/pudar setelah
  // di-tile berulang-ulang di sepanjang baris track).
  const beatPx = Math.max(1, Math.round(cellPxWidth(1, barWidthPx)))
  const finestLayer = pickFinestLayer(barWidthPx)
  const subPx = Math.max(1, Math.round(cellPxWidth(finestLayer, barWidthPx)))

  const images: string[] = []
  const sizes: string[] = []

  if (finestLayer > 1) {
    images.push(
      `linear-gradient(to right, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent ${subPx}px)`,
    )
    sizes.push(`${subPx}px 100%`)
  }

  if (beatPx >= MIN_BEAT_PX) {
    images.push(
      `linear-gradient(to right, rgba(255,255,255,0.13) 0, rgba(255,255,255,0.13) 1px, transparent 1px, transparent ${beatPx}px)`,
    )
    sizes.push(`${beatPx}px 100%`)
  }

  images.push(
    `linear-gradient(to right, rgba(255,255,255,0.30) 0, rgba(255,255,255,0.30) 1px, transparent 1px, transparent ${barWidthPx}px)`,
  )
  sizes.push(`${barWidthPx}px 100%`)

  return {
    backgroundImage: images.join(', '),
    backgroundSize: sizes.join(', '),
    backgroundRepeat: 'repeat',
  }
}
