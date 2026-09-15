import { BEATS_PER_BAR, TIMELINE_START, type Track, type Clip, type Note, type TrackKind } from './tracks'
import type { EVN2ChunkResult, ParsedFlm } from './flmParser'

// Panjang "penempatan" clip di playlist (CLHd) cuma nunjukin seberapa lebar
// clip itu digambar di timeline — bisa lebih pendek dari rentang note asli di
// dalam pattern-nya. Tool HTML lama selalu nampilin pattern APA ADANYA (lihat
// resizeAndDraw(): totalBeats dihitung dari note terjauh, bukan dari data
// placement). Fungsi ini niru itu, biar piano roll di flatdaw gak kesempitan
// dan notenya gak numpuk/overflow keluar baris.
function patternSpanBars(chunk: EVN2ChunkResult | undefined): number {
  if (!chunk || chunk.notes.length === 0) return 0
  const maxBeat = Math.max(...chunk.notes.map((n) => n.pos_beats + n.dur_beats))
  return Math.ceil(maxBeat / BEATS_PER_BAR)
}

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

    // No upper clamp here anymore — the arrangement's total length (used to
    // size the grid/ruler) is now derived FROM these positions in App.tsx via
    // getTimelineEnd(), instead of clips being squeezed to fit a fixed window.
    const rawStartBar = TIMELINE_START + cl.posBeats / BEATS_PER_BAR
    const startBar = Math.max(TIMELINE_START, rawStartBar)
    const placementBars = Math.max(0.25, cl.lenBeats / BEATS_PER_BAR)

    let clip: Clip

    if (cl.isAudio) {
      // Klip audio gak punya note — panjangnya cuma dari penempatan di
      // playlist (CLHd), dan labelnya nama sample asli (mis. "Case 19
      // (Kick)"), bukan nama pattern. Pattern 'dense' dipakai sebagai
      // stand-in visual waveform (kita gak punya data audio beneran).
      clip = {
        id: `flm-clip-${i}`,
        label: cl.sampleName || 'Audio',
        startBar,
        lengthBars: placementBars,
        pattern: 'dense',
        notes: [],
        sampleName: cl.sampleName ?? undefined,
      }
    } else {
      const chunk = chunkResults[cl.chunkIdx as number]
      const label = chunk?.displayName || `Pattern #${(cl.chunkIdx as number) + 1}`

      // Lebar clip = maksimum antara panjang penempatan di playlist DAN
      // panjang pattern note-nya sendiri, jadi gak ada note yang
      // kepotong/overflow.
      const lengthBars = Math.max(placementBars, patternSpanBars(chunk), 1)

      const notes: Note[] = (chunk?.notes ?? []).map((n, ni) => ({
        id: `flm-${key}-c${i}-n${ni}`,
        pitch: n.pitch,
        startBeat: n.pos_beats,
        lengthBeats: n.dur_beats,
      }))

      clip = {
        id: `flm-clip-${i}`,
        label,
        startBar,
        lengthBars,
        pattern: 'notes',
        notes,
      }
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
