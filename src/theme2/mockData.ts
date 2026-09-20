// Data MOCK khusus Template 02 (tampilan playlist ala FL Studio).
// Berdiri sendiri: gak nyambung ke tracks.ts / hasil parsing .flm punya
// Template 01, jadi mengubah salah satunya nggak akan nyenggol yang lain
// -- KECUALI dua field waveform di bawah (waveformPeaks/waveformMultiRes),
// yang sengaja dibawa lewat dari Clip asli (lihat fromTracks.ts) biar clip
// audio di sini bisa gambar waveform ASLI (bentuknya ngikutin frekuensi
// sample beneran), bukan cuma bentuk prosedural/acakan seed macam WaveSvg
// di ClipMock.tsx. Kalau field ini kosong (project belum di-import / sample
// belum ke-decode), ClipMock jatuh balik ke WaveSvg mock seperti sebelumnya.

import type { WaveformPeaksData } from '../tracks'
import type { MultiResPeaks } from '../waveformPeaksMultiRes'

export type ClipKind = 'audio' | 'pattern' | 'automation'
export type PatternStyle = 'steps' | 'notes' | 'sparse'
export type WaveStyle = 'hits' | 'swell' | 'speech' | 'texture'

export interface MockClip {
  id: string
  kind: ClipKind
  label: string
  startBar: number // nomor bar absolut (sesuai angka di ruler)
  lengthBars: number
  pattern?: PatternStyle
  wave?: WaveStyle
  seed: number
  // Data peak audio ASLI (lihat Clip.waveformPeaks/waveformMultiRes di
  // tracks.ts, diisi resolveWaveforms() di App.tsx setelah sample ke-decode).
  // Kalau ada, ClipMock gambar waveform ini (mirip WaveformCanvas Template 01)
  // alih-alih bentuk mock acakan.
  waveformPeaks?: WaveformPeaksData
  waveformMultiRes?: MultiResPeaks
}

export interface MockTrack {
  id: string
  name: string
  color: string
  height: number
  icon: 'keys' | 'wave'
  collapsed?: boolean
  selected?: boolean
  clips: MockClip[]
}

// Ukuran kanvas desain (px). Halaman ini di-scale dari ukuran ini.
export const DESIGN_W = 1280
export const DESIGN_H = 720

export const TITLE_H = 28
export const TOOLBAR_H = 48
export const OVERVIEW_H = 40
export const RULER_H = 24

export const BROWSER_W = 150
export const HEADER_W = 138
export const BAR_W = 62

export const VIEW_START_BAR = 49
export const VIEW_BARS = 16
export const SONG_BARS = 96

export const PLAYHEAD_BAR = 53.25

export const LIME = '#9be23a'

// Warna clip: pastel datar, masing-masing punya "ink" gelap buat teks label.
export const PALETTE = {
  olive: '#a3b160',
  teal: '#5aa9a5',
  sage: '#86b28a',
  mauve: '#b98fb0',
  periwinkle: '#8c9be6',
  sky: '#6fb3d8',
  rose: '#d4788c',
  sand: '#c9b77a',
  peach: '#e0a26a',
  coral: '#e07f6a',
  slate: '#8a97a0',
} as const

let uid = 0
function clip(partial: Omit<MockClip, 'id' | 'seed'> & { seed?: number }): MockClip {
  uid += 1
  return { ...partial, id: `c${uid}`, seed: partial.seed ?? uid * 97 }
}

// Bikin deretan clip yang diulang tiap `every` bar (dipakai buat kick, hihat, dst).
function repeat(
  base: Omit<MockClip, 'id' | 'seed' | 'startBar'>,
  from: number,
  count: number,
  every: number,
  skip: number[] = [],
): MockClip[] {
  const out: MockClip[] = []
  for (let i = 0; i < count; i++) {
    const startBar = from + i * every
    if (skip.includes(startBar)) continue
    out.push(clip({ ...base, startBar }))
  }
  return out
}

export const MOCK_TRACKS: MockTrack[] = [
  {
    id: 't1',
    name: 'Kick',
    color: PALETTE.olive,
    height: 44,
    icon: 'keys',
    clips: repeat({ kind: 'pattern', label: 'Kick', lengthBars: 1, pattern: 'steps' }, 49, 16, 1),
  },
  {
    id: 't2',
    name: 'Snare - Claps',
    color: PALETTE.teal,
    height: 44,
    icon: 'keys',
    clips: repeat({ kind: 'pattern', label: 'sn / clap #3', lengthBars: 2, pattern: 'sparse' }, 49, 8, 2),
  },
  {
    id: 't3',
    name: 'HiHat',
    color: PALETTE.sage,
    height: 36,
    icon: 'wave',
    clips: repeat({ kind: 'audio', label: 'HiHat', lengthBars: 1, wave: 'texture' }, 49, 16, 1),
  },
  {
    id: 't4',
    name: 'Lead Pluck',
    color: PALETTE.mauve,
    height: 48,
    icon: 'keys',
    clips: [
      ...repeat({ kind: 'pattern', label: 'Lead Pluck', lengthBars: 4, pattern: 'notes' }, 49, 2, 4),
      ...repeat({ kind: 'pattern', label: 'Lead Pluck 2', lengthBars: 4, pattern: 'notes' }, 61, 1, 4),
    ],
  },
  {
    id: 't5',
    name: 'DL_Congruent',
    color: PALETTE.periwinkle,
    height: 60,
    icon: 'wave',
    clips: [
      clip({ kind: 'audio', label: 'DL_Congruent', startBar: 49, lengthBars: 8, wave: 'speech' }),
      clip({ kind: 'audio', label: 'DL_Congruent', startBar: 57, lengthBars: 8, wave: 'speech' }),
    ],
  },
  {
    id: 't6',
    name: 'bass 3',
    color: PALETTE.sky,
    height: 44,
    icon: 'keys',
    selected: true,
    clips: repeat({ kind: 'pattern', label: 'bass 3', lengthBars: 2, pattern: 'notes' }, 49, 8, 2, [53]),
  },
  {
    id: 't7',
    name: 'bass auto',
    color: PALETTE.rose,
    height: 48,
    icon: 'keys',
    clips: [
      clip({ kind: 'automation', label: 'bass auto', startBar: 49, lengthBars: 8 }),
      clip({ kind: 'automation', label: 'bass auto', startBar: 57, lengthBars: 6 }),
    ],
  },
  {
    id: 't8',
    name: 'Harmor - Airwaves',
    color: PALETTE.sand,
    height: 60,
    icon: 'wave',
    clips: [
      clip({ kind: 'audio', label: 'Harmor - Airwaves', startBar: 51, lengthBars: 6, wave: 'swell' }),
      clip({ kind: 'audio', label: 'Harmor - Airwaves', startBar: 59, lengthBars: 5, wave: 'swell' }),
    ],
  },
  {
    id: 't9',
    name: 'Track 9',
    color: PALETTE.slate,
    height: 20,
    icon: 'wave',
    collapsed: true,
    clips: [clip({ kind: 'audio', label: 'VE..2', startBar: 56, lengthBars: 1.5, wave: 'hits' })],
  },
  {
    id: 't10',
    name: 'Track 10',
    color: PALETTE.slate,
    height: 20,
    icon: 'wave',
    collapsed: true,
    clips: repeat({ kind: 'audio', label: 'ping', lengthBars: 0.5, wave: 'hits' }, 49, 16, 1),
  },
  {
    id: 't11',
    name: 'Track 11',
    color: PALETTE.slate,
    height: 20,
    icon: 'wave',
    collapsed: true,
    clips: [clip({ kind: 'audio', label: 'DR..B 01', startBar: 60, lengthBars: 2, wave: 'hits' })],
  },
  {
    id: 't12',
    name: 'FX Riser',
    color: PALETTE.peach,
    height: 44,
    icon: 'wave',
    clips: [
      clip({ kind: 'audio', label: 'FX Riser Long', startBar: 54, lengthBars: 3, wave: 'swell' }),
      clip({ kind: 'audio', label: 'Impact', startBar: 57, lengthBars: 1, wave: 'hits' }),
      clip({ kind: 'audio', label: 'FX Riser Long', startBar: 62, lengthBars: 3, wave: 'swell' }),
    ],
  },
  {
    id: 't13',
    name: 'APASIH YG..AT',
    color: PALETTE.coral,
    height: 60,
    icon: 'wave',
    clips: [
      clip({ kind: 'audio', label: 'APASIH YG..AT ARSIIx 18', startBar: 53, lengthBars: 12, wave: 'speech' }),
    ],
  },
  {
    id: 't14',
    name: 'Track 14',
    color: PALETTE.slate,
    height: 20,
    icon: 'keys',
    collapsed: true,
    clips: [],
  },
]

// Daftar item di panel kiri (nama pattern), tiap item nempel ke warna track-nya.
export const BROWSER_ITEMS: { name: string; color: string; active?: boolean }[] = [
  { name: 'Kick', color: PALETTE.olive },
  { name: 'HiHat', color: PALETTE.sage },
  { name: 'HiHat #2', color: PALETTE.sage },
  { name: 'Snare - Claps', color: PALETTE.teal },
  { name: 'sn / clap #3', color: PALETTE.teal, active: true },
  { name: 'sn / clap #2', color: PALETTE.teal },
  { name: 'Topper', color: PALETTE.olive },
  { name: 'bass 3', color: PALETTE.sky },
  { name: 'bass 3 #2', color: PALETTE.sky },
  { name: 'arped bass', color: PALETTE.sky },
  { name: 'arped bass #5', color: PALETTE.sky },
  { name: 'arped bass #4', color: PALETTE.sky },
  { name: 'arped bass #3', color: PALETTE.sky },
  { name: 'Lead Pluck', color: PALETTE.mauve },
  { name: 'Lead Pluck 2', color: PALETTE.mauve },
  { name: 'morph', color: PALETTE.mauve },
  { name: 'Pattern 17', color: PALETTE.slate },
  { name: 'Pattern 18', color: PALETTE.slate },
  { name: 'Pattern 19', color: PALETTE.slate },
  { name: 'Pattern 20', color: PALETTE.slate },
  { name: 'Pattern 21', color: PALETTE.slate },
  { name: 'Pattern 22', color: PALETTE.slate },
]
