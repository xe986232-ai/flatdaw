import type { MultiResPeaks } from './waveformPeaksMultiRes'

export type TrackKind = 'marker' | 'melodic' | 'lead' | 'drum' | 'perc' | 'accent'

// A single note inside a clip's piano roll.
export interface Note {
  id: string
  pitch: number // MIDI note number, e.g. 60 = C4
  startBeat: number // beats from the clip's own start (0 = first beat of the clip)
  lengthBeats: number
}

export const BEATS_PER_BAR = 4

export interface WaveformPeaksData {
  min: number[]
  max: number[]
}

export interface Clip {
  id: string
  label: string
  startBar: number // in bars, relative to timeline start
  lengthBars: number
  pattern?: 'notes' | 'steps' | 'scribble' | 'dense'
  notes?: Note[] // piano-roll content; generated on first "Edit" if absent
  // Titik-titik (dalam bar, relatif ke awal clip) tempat pattern asli
  // di-loop/diulang karena penempatan di playlist lebih panjang dari pattern
  // aslinya (lihat flmToTracks.ts). Dipakai buat gambar goresan penanda loop
  // di tepi atas clip, niru tampilan FL Studio Mobile.
  loopPoints?: number[]
  // Klip audio (isAudio=true di flmParser): nama sample mentah dari project,
  // dipakai buat dicocokin ke file di dalam zip (lihat zipProject.ts).
  sampleName?: string
  // Diisi belakangan (async, setelah decode audio) kalau sample-nya ketemu di
  // dalam zip project yang di-import — dipakai ClipBlock buat gambar waveform
  // asli di kanvas, gantiin pattern 'dense' yang cuma dekorasi.
  waveformPeaks?: WaveformPeaksData
  // Peak multi-resolusi (dari waveformPeaksMultiRes.ts): dipakai WaveformCanvas
  // kalau ada, biar waveform otomatis nambah detail pas di-zoom in daripada
  // stuck di resolusi bucket tetap dari waveformPeaks. waveformPeaks tetap
  // disimpan sebagai fallback (mis. kalau field ini kosong di data lama).
  waveformMultiRes?: MultiResPeaks
  waveformStatus?: 'pending' | 'found' | 'missing'
  // Panjang (dalam bar, di BPM project) dari SATU kali putaran penuh sample
  // asli yang sudah didekode — dihitung dari audioBuffer.duration * bpm/60 /
  // BEATS_PER_BAR (lihat resolveWaveforms() di App.tsx). Dipakai buat
  // mendeteksi & menggambar audio clip yang penempatannya di playlist lebih
  // panjang dari durasi asli sample-nya sebagai LOOP (sample-nya diulang,
  // niru cara instrument pattern di-loop di flmToTracks.ts), bukan cuma
  // di-stretch/disemir jadi satu putaran panjang yang gak natural.
  waveformNativeSpanBars?: number
  // Rasio time-stretch klip audio (sub-chunk STRC di dalam CLSm, lihat
  // extractStretchRatio() di flmParser.ts). undefined buat klip non-audio
  // atau kalau STRC gak ketemu (dianggap 1.0). Dipakai resolveWaveforms()
  // di App.tsx buat ngoreksi audioBuffer.duration sebelum dibandingin ke
  // lengthBars, biar klip yang di-stretch gak salah kedeteksi sebagai loop.
  stretchRatio?: number
}

export interface Track {
  id: string
  name: string
  kind: TrackKind
  clips: Clip[]
}

// Timeline window. TIMELINE_START is just an arbitrary anchor bar number so
// the ruler doesn't start at "1" (matches the original reference content).
// TIMELINE_END used to be a second hardcoded constant (205 + a fixed 80 bars)
// — meaning every imported .flm got its clips clamped/squeezed into that same
// fixed 80-bar window no matter how long the actual project was, and short
// projects left most of the grid area sitting empty past the last real clip.
// getTimelineEnd() replaces that: it measures how far the *actual* imported
// content reaches and sizes the arrangement to fit it (with a floor so an
// empty/just-loaded project still gets a reasonable default width to look at).
export const TIMELINE_START = 205
const MIN_TIMELINE_BARS = 80
const END_PADDING_BARS = 4 // a little breathing room past the last clip

export function getTimelineEnd(tracks: Track[]): number {
  let maxEndBar = TIMELINE_START
  for (const track of tracks) {
    for (const clip of track.clips) {
      maxEndBar = Math.max(maxEndBar, clip.startBar + clip.lengthBars)
    }
  }
  const contentBars = maxEndBar - TIMELINE_START
  return TIMELINE_START + Math.max(MIN_TIMELINE_BARS, Math.ceil(contentBars) + END_PADDING_BARS)
}

// Default kosong — playlist ini sekarang diisi dari hasil parsing file .flm
// (lihat flmParser.ts + flmToTracks.ts), bukan lagi data mockup statis.
export const tracks: Track[] = []
