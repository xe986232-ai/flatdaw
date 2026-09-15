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

  // Row identity = trkhOffset (the actual TRKH chunk this clip's CLIP is
  // nested inside), NEVER trackName. FL Studio Mobile writes a generic
  // default name ("Audio 11", "Audio 33", ...) into the DESc of any track
  // the user never renamed, and it's normal for MULTIPLE distinct real
  // tracks in the same project to end up with that exact same literal
  // string. Grouping by name (as before) silently merged those unrelated
  // tracks into a single playlist row — clips from totally different real
  // tracks landing in the same column, which is exactly the "numpuk"/
  // misplaced-pattern symptom. trkhOffset is unique per real TRKH chunk in
  // the binary, so it's the only safe grouping key; the name is used for
  // the label only, and disambiguated below when it collides.
  const rowLabel = new Map<string, string>()
  const rowClips = new Map<string, Clip[]>()

  timelineClips.forEach((cl, i) => {
    const key = `trkh:${cl.trkhOffset}`
    if (!rowClips.has(key)) {
      rowClips.set(key, [])
      rowLabel.set(key, cl.trackName || `Track ${rowClips.size}`)
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
        stretchRatio: cl.stretchRatio ?? undefined,
      }
    } else {
      const chunk = chunkResults[cl.chunkIdx as number]
      const label = chunk?.displayName || `Pattern #${(cl.chunkIdx as number) + 1}`

      // Panjang pattern ASLI (belum di-loop) dalam beat — dibulatkan ke bar
      // penuh, konsisten sama patternSpanBars(). Ini periode loop-nya kalau
      // penempatan clip di playlist lebih panjang dari pattern aslinya.
      const nativeSpanBars = patternSpanBars(chunk)
      const nativeSpanBeats = nativeSpanBars * BEATS_PER_BAR
      const placementBeats = placementBars * BEATS_PER_BAR
      const originalNotes = chunk?.notes ?? []

      // FL Studio Mobile: kalau clip di playlist ditarik lebih panjang dari
      // pattern piano-roll aslinya, sisanya BUKAN dibiarin kosong — kontennya
      // di-loop/diulang buat ngisi penuh sepanjang penempatan itu (ini yang
      // di tool aslinya ditandain garis kecil di titik loop-nya). Tiling di
      // sini niru itu: salin ulang semua note tiap kelipatan nativeSpanBeats
      // sampai penuh sepanjang placementBeats.
      const shouldLoop = nativeSpanBeats > 0 && placementBeats > nativeSpanBeats + 0.001
      const notes: Note[] = []
      const loopPoints: number[] = []

      if (shouldLoop) {
        let offsetBeats = 0
        let ni = 0
        while (offsetBeats < placementBeats - 0.001) {
          if (offsetBeats > 0) loopPoints.push(offsetBeats / BEATS_PER_BAR)
          for (const n of originalNotes) {
            const startBeat = n.pos_beats + offsetBeats
            if (startBeat >= placementBeats - 0.001) continue
            const lengthBeats = Math.min(n.dur_beats, placementBeats - startBeat)
            notes.push({ id: `flm-${key}-c${i}-n${ni}`, pitch: n.pitch, startBeat, lengthBeats })
            ni++
          }
          offsetBeats += nativeSpanBeats
        }
      } else {
        originalNotes.forEach((n, ni) => {
          notes.push({ id: `flm-${key}-c${i}-n${ni}`, pitch: n.pitch, startBeat: n.pos_beats, lengthBeats: n.dur_beats })
        })
      }

      // Lebar clip = maksimum antara panjang penempatan di playlist DAN
      // panjang pattern note-nya sendiri, jadi gak ada note yang
      // kepotong/overflow.
      const lengthBars = Math.max(placementBars, nativeSpanBars, 1)

      clip = {
        id: `flm-clip-${i}`,
        label,
        startBar,
        lengthBars,
        pattern: 'notes',
        notes,
        loopPoints: loopPoints.length > 0 ? loopPoints : undefined,
      }
    }

    rowClips.get(key)!.push(clip)
  })

  // Row order = ascending trkhOffset, i.e. the order TRKH chunks physically
  // appear in the file — this IS the original track list order in the FL
  // Studio Mobile playlist (track 1, track 2, track 3, ... top to bottom).
  // Previously rows were ordered by "whichever track's first clip starts
  // earliest in time", which has nothing to do with the real track order:
  // a track listed 3rd in the project but whose first clip happens to start
  // late in the arrangement would render far down the list, while a track
  // listed 20th but with an early clip would jump near the top — the whole
  // vertical order came out shuffled relative to the source project.
  const order = [...rowClips.keys()].sort((a, b) => {
    const trkhA = Number(a.slice('trkh:'.length))
    const trkhB = Number(b.slice('trkh:'.length))
    return trkhA - trkhB
  })

  // Two different real tracks (different trkhOffset, so already separate
  // rows above) can still carry the exact same default label text — number
  // them so the rows are visibly distinguishable, same idea as
  // assignDisplayNames() for pattern names.
  const labelTotals: Record<string, number> = {}
  order.forEach((key) => {
    const label = rowLabel.get(key)!
    labelTotals[label] = (labelTotals[label] || 0) + 1
  })
  const labelSeen: Record<string, number> = {}
  order.forEach((key) => {
    const label = rowLabel.get(key)!
    if (labelTotals[label] > 1) {
      labelSeen[label] = (labelSeen[label] || 0) + 1
      rowLabel.set(key, `${label} (${labelSeen[label]})`)
    }
  })

  const kind: TrackKind = 'melodic'

  return order.map((key, i) => ({
    id: `flm-track-${i}`,
    name: rowLabel.get(key) ?? `Track ${i + 1}`,
    kind,
    clips: rowClips.get(key)!,
  }))
}
