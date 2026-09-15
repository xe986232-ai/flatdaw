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

// Ambang minimum lebar kotak (px) biar garis grid nggak numpuk jadi blok
// solid pas lagi zoom-out.
const MIN_LAYER_PX = 6

/**
 * Lapisan yang lagi "aktif" ditampilkan pada barWidth ini: lapisan terhalus
 * yang kotaknya masih >= minPx. Makin di-zoom in, kotak tiap lapisan makin
 * lebar sehingga lapisan berikutnya (2x lebih rapat) jadi cukup lega buat
 * ditampilkan dan menggantikan lapisan sebelumnya. Makin di-zoom out, balik
 * ke lapisan yang lebih kasar. Cuma SATU lapisan yang pernah digambar dalam
 * satu waktu — lapisan lain otomatis ke-hide, bukan ditumpuk.
 */
export function pickActiveLayer(barWidthPx: number, minPx = MIN_LAYER_PX): number {
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
 * Bikin background CSS buat area playlist/timeline:
 *  - garis bar (batas antar birama, selalu tampil, paling tegas)
 *  - garis lapisan grid yang lagi aktif (pickActiveLayer) — cuma SATU
 *    lapisan yang digambar; begitu zoom berubah cukup jauh, lapisan ini
 *    diganti seluruhnya oleh lapisan lain, bukan ditambah/ditumpuk.
 * Karena tiap lapisan adalah pembelahan 2x dari lapisan sebelumnya, garis
 * lapisan aktif otomatis mencakup posisi semua lapisan yang lebih kasar —
 * jadi nggak ada info yang hilang walau lapisan lain di-hide.
 */
export function buildArrangementGrid(barWidthPx: number): ArrangementGridStyle {
  const activeLayer = pickActiveLayer(barWidthPx)
  // Dibulatkan ke piksel penuh biar tiap tile digambar presisi (garis tipis
  // 1px di posisi pecahan piksel gampang blur/pudar setelah di-tile
  // berulang-ulang di sepanjang baris track).
  const layerPx = Math.max(1, Math.round(cellPxWidth(activeLayer, barWidthPx)))

  const images: string[] = []
  const sizes: string[] = []

  // Lapisan aktif — cuma digambar kalau kotaknya masih cukup lebar buat
  // dibedakan dari garis bar (kalau lapisan 1 aja udah kelewat sempit,
  // biarin cuma garis bar yang tampil).
  if (layerPx >= 3) {
    images.push(
      `linear-gradient(to right, rgba(255,255,255,0.14) 0, rgba(255,255,255,0.14) 1px, transparent 1px, transparent ${layerPx}px)`,
    )
    sizes.push(`${layerPx}px 100%`)
  }

  images.push(
    `linear-gradient(to right, rgba(255,255,255,0.32) 0, rgba(255,255,255,0.32) 1px, transparent 1px, transparent ${barWidthPx}px)`,
  )
  sizes.push(`${barWidthPx}px 100%`)

  return {
    backgroundImage: images.join(', '),
    backgroundSize: sizes.join(', '),
    backgroundRepeat: 'repeat',
  }
}
