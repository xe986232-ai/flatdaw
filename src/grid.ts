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

/**
 * Jumlah "blok" (ketukan/beat) per bar pada suatu lapisan. Aturan wajib:
 * 1 blok = 4 kolom grid di SEMUA lapisan (1..MAX_LAYER) — makanya ini selalu
 * cellsPerBar(layer) / 4. Yang berubah tiap lapisan cuma JUMLAH bloknya:
 * lapisan 1 = 1 blok/bar (blok == bar itu sendiri), lapisan 2 = 2 blok/bar,
 * lapisan 3 = 4 blok/bar, dst — dobel terus tiap naik satu lapisan.
 */
export function blocksPerBar(layer: number): number {
  return Math.pow(2, layer - 1) // = cellsPerBar(layer) / 4
}

/** Lebar piksel satu blok (ketukan) pada suatu lapisan. */
export function blockPxWidth(layer: number, barWidthPx: number): number {
  return barWidthPx / blocksPerBar(layer)
}

// Ambang minimum lebar kotak (px) biar garis grid nggak numpuk jadi blok
// solid pas lagi zoom-out. Sengaja agak longgar (8px, bukan 6px) — di layar
// hp kecil + proyek yang panjang (puluhan/ratusan bar), kolom yang cuma
// 6-7px kelihatannya emang "ada" tapi kerapatannya bikin mata pusing tanpa
// nambah info yang kebaca; mendingan turun ke lapisan yang lebih kasar.
const MIN_LAYER_PX = 8

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
 * Bikin satu garis grid berulang (repeating-linear-gradient) dg PERIODE
 * `barWidthPx` persis — bukan `Math.round(cellPxWidth(...))`. Ini kuncinya:
 * dulu tiap lapisan dibikin jadi tile CSS sendiri yang lebar-nya dibulatkan
 * ke piksel bulat, padahal tile "garis bar" dibikin terpisah dg lebar
 * barWidthPx apa adanya. Begitu barWidthPx bukan kelipatan pas dari piksel
 * yang dibulatkan itu (hampir selalu begitu, wong hasil zoom bisa berapa aja),
 * dua tile itu jalan sendiri-sendiri dan makin ke kanan makin ngaco/geser —
 * itu yang keliatan "ngawur" pas discroll ke bar-bar berikutnya.
 *
 * Fix-nya: satu periode grid = SATU bar (barWidthPx, tidak dibulatkan), dan
 * di dalam satu periode itu semua garis (kolom halus, garis blok/ketukan,
 * garis bar) ditaruh pakai persentase (%) relatif ke periode itu sendiri.
 * Karena persentase selalu tepat 1/N dari lebar sebenarnya (bukan hasil
 * pembulatan), garis-garisnya otomatis presisi 4 kolom per blok di semua
 * lapisan dan nggak pernah geser walau di-scroll sejauh apa pun.
 */
function repeatingGridLine(divisions: number, color: string): string {
  const stopPct = 100 / divisions
  return `repeating-linear-gradient(to right, ${color} 0, ${color} 1px, transparent 1px, transparent ${stopPct}%)`
}

/**
 * Bikin background CSS buat area playlist/timeline, tiga tingkat, semua
 * dalam SATU periode `barWidthPx` biar nggak pernah drift:
 *  - garis kolom (lapisan aktif yg lagi dipilih pickActiveLayer) — paling
 *    tipis/samar, cuma digambar kalau kolomnya masih cukup lega dari garis
 *    blok di atasnya (kalau nggak, ya cuma blok+bar yang tampil).
 *  - garis blok/ketukan (selalu 4 kolom per blok, wajib di semua lapisan) —
 *    medium, cuma digambar kalau lapisan aktif punya >1 blok per bar (di
 *    lapisan 1, blok == bar, jadi nggak perlu digambar dobel).
 *  - garis bar (batas birama) — paling tegas, selalu tampil.
 * Cuma SATU lapisan kolom yang pernah aktif dalam satu waktu — begitu zoom
 * berubah cukup jauh, lapisan ini diganti seluruhnya oleh lapisan lain
 * (pickActiveLayer), bukan ditambah/ditumpuk di atas lapisan sebelumnya.
 */
export function buildArrangementGrid(barWidthPx: number): ArrangementGridStyle {
  const activeLayer = pickActiveLayer(barWidthPx)
  const columns = cellsPerBar(activeLayer)
  const blocks = blocksPerBar(activeLayer)
  const columnPx = barWidthPx / columns

  const images: string[] = []
  const sizes: string[] = []

  // Garis kolom (kotak terhalus lapisan aktif) — paling redup, cuma sebagai
  // "tekstur" latar; kalau kekuatannya disamain sama garis blok/bar, semua
  // keliatan numpuk jadi satu barcode yang bikin pusing pas bar-nya banyak
  // dan track-nya kosong (nggak ada clip buat jadi acuan mata).
  if (columnPx >= 3 && columns > blocks) {
    images.push(repeatingGridLine(columns, 'rgba(255,255,255,0.05)'))
    sizes.push(`${barWidthPx}px 100%`)
  }

  // Garis blok/ketukan — wajib 4 kolom per blok di semua lapisan; cuma
  // digambar kalau lapisan aktif punya lebih dari 1 blok per bar (kalau
  // cuma 1, itu sama aja dg garis bar, biar nggak dobel).
  if (blocks > 1) {
    images.push(repeatingGridLine(blocks, 'rgba(255,255,255,0.16)'))
    sizes.push(`${barWidthPx}px 100%`)
  }

  // Garis bar — selalu tampil, paling tegas, sengaja dibikin jauh lebih
  // terang drpd dua lapisan di atas biar batas birama langsung "loncat"
  // ke mata walau lagi zoom-out ngeliat puluhan bar sekaligus.
  images.push(
    `linear-gradient(to right, rgba(255,255,255,0.4) 0, rgba(255,255,255,0.4) 1px, transparent 1px, transparent ${barWidthPx}px)`,
  )
  sizes.push(`${barWidthPx}px 100%`)

  return {
    backgroundImage: images.join(', '),
    backgroundSize: sizes.join(', '),
    backgroundRepeat: 'repeat',
  }
}
