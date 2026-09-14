export type TrackKind = 'marker' | 'melodic' | 'lead' | 'drum' | 'perc' | 'accent'

// A single note inside a clip's piano roll.
export interface Note {
  id: string
  pitch: number // MIDI note number, e.g. 60 = C4
  startBeat: number // beats from the clip's own start (0 = first beat of the clip)
  lengthBeats: number
}

export const BEATS_PER_BAR = 4

export interface Clip {
  id: string
  label: string
  startBar: number // in bars, relative to timeline start
  lengthBars: number
  pattern?: 'notes' | 'steps' | 'scribble' | 'dense'
  notes?: Note[] // piano-roll content; generated on first "Edit" if absent
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
