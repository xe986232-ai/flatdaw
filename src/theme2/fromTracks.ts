// Jembatan: ambil Track[]/Clip[] hasil parsing .flm (flmParser.ts +
// flmToTracks.ts, dipakai Template 01) lalu ubah jadi MockTrack[]/MockClip[]
// yang dimengerti PlaylistFrame (Template 02). Template 02 tetap gak nyentuh
// tracks.ts/flmToTracks.ts sama sekali — konversi satu arah di sini aja.

import { TIMELINE_START, getTimelineEnd, isAudioTrack, type Track } from '../tracks'
import { PALETTE, VIEW_BARS, type MockClip, type MockTrack, type WaveStyle } from './mockData'

// x=0 di minimap/overview mewakili bar ini. Sama kayak titik awal absolut
// yang dipakai flmToTracks.ts buat semua clip (TIMELINE_START), jadi posisi
// clip di overview & di grid utama konsisten satu sama lain.
export const REAL_ORIGIN_BAR = TIMELINE_START

const COLOR_CYCLE = Object.values(PALETTE)
const WAVE_STYLES: WaveStyle[] = ['swell', 'texture', 'hits', 'speech']

export interface Theme2Data {
  tracks: MockTrack[]
  browserItems: { name: string; color: string; active?: boolean }[]
  originBar: number
  viewStartBar: number
  viewBars: number
  songBars: number
  playheadBar: number
}

export function tracksToTheme2(tracks: Track[]): Theme2Data {
  const mockTracks: MockTrack[] = tracks.map((track, ti) => {
    const color = COLOR_CYCLE[ti % COLOR_CYCLE.length]
    const audio = isAudioTrack(track)
    const empty = track.clips.length === 0

    const clips: MockClip[] = track.clips.map((clip, ci) => {
      const isAudioClip = clip.pattern === 'dense'
      const seed = ti * 131 + ci * 37 + 11
      return {
        id: clip.id,
        kind: isAudioClip ? 'audio' : 'pattern',
        label: clip.label,
        startBar: clip.startBar,
        lengthBars: clip.lengthBars,
        pattern: isAudioClip ? undefined : 'notes',
        wave: isAudioClip ? WAVE_STYLES[ti % WAVE_STYLES.length] : undefined,
        seed,
      }
    })

    return {
      id: track.id,
      name: track.name,
      color,
      height: empty ? 20 : audio ? 52 : 44,
      icon: audio ? 'wave' : 'keys',
      collapsed: empty,
      clips,
    }
  })

  const songEndBar = getTimelineEnd(tracks)
  const songBars = Math.max(VIEW_BARS, Math.ceil(songEndBar - REAL_ORIGIN_BAR))

  // Mulai viewport di bar pertama yang beneran ada isinya, biar pas dibuka
  // gak nampilin grid kosong (track kosong panjang di depan sebelum clip
  // pertama itu wajar buat project asli).
  let firstBar = Infinity
  for (const t of mockTracks) for (const c of t.clips) firstBar = Math.min(firstBar, c.startBar)
  const viewStartBar = Number.isFinite(firstBar) ? Math.floor(firstBar) : REAL_ORIGIN_BAR

  const browserItems = mockTracks
    .filter((t) => t.clips.length > 0)
    .map((t) => ({ name: t.name, color: t.color }))

  return {
    tracks: mockTracks,
    browserItems,
    originBar: REAL_ORIGIN_BAR,
    viewStartBar,
    viewBars: VIEW_BARS,
    songBars,
    playheadBar: viewStartBar + 0.25,
  }
}
