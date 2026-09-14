import { BEATS_PER_BAR, TIMELINE_START, TIMELINE_END, type Track, type Clip, type Note, type TrackKind } from './tracks'
import type { ParsedFlm } from './flmParser'

// Susun ulang timelineClips (hasil parsing) jadi baris-per-track, urut
// kemunculan pertama — persis pola grouping yang dipakai buildTimeline() di
// tool HTML lama, cuma hasil akhirnya sekarang Track[]/Clip[]/Note[] milik
// flatdaw, bukan HTML string.
export function flmToTracks(parsed: ParsedFlm): Track[] {
  const { chunkResults, timelineClips } = parsed

  const order: string[] = []
  const rowLabel = new Map<string, string>()
  const rowClips = new Map<string, Clip[]>()

  timelineClips.forEach((cl, i) => {
    const key = cl.trackName || `trkh:${cl.trkhOffset}`
    if (!rowClips.has(key)) {
      rowClips.set(key, [])
      rowLabel.set(key, cl.trackName || `Track ${order.length + 1}`)
      order.push(key)
    }

    const chunk = chunkResults[cl.chunkIdx]
    const label = chunk?.displayName || `Pattern #${cl.chunkIdx + 1}`

    const lengthBars = Math.max(0.25, cl.lenBeats / BEATS_PER_BAR)
    const rawStartBar = TIMELINE_START + cl.posBeats / BEATS_PER_BAR
    const startBar = Math.min(TIMELINE_END - lengthBars, Math.max(TIMELINE_START, rawStartBar))

    const notes: Note[] = (chunk?.notes ?? []).map((n, ni) => ({
      id: `flm-${key}-c${i}-n${ni}`,
      pitch: n.pitch,
      startBeat: n.pos_beats,
      lengthBeats: n.dur_beats,
    }))

    const clip: Clip = {
      id: `flm-clip-${i}`,
      label,
      startBar,
      lengthBars,
      pattern: 'notes',
      notes,
    }

    rowClips.get(key)!.push(clip)
  })

  const kind: TrackKind = 'melodic'

  return order.map((key, i) => ({
    id: `flm-track-${i}`,
    name: rowLabel.get(key) ?? `Track ${i + 1}`,
    kind,
    clips: rowClips.get(key)!,
  }))
}
