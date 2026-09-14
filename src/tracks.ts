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

// Timeline window — kept long on purpose so the arrangement never dead-ends
// on the right when scrolling; original reference content sits at 205–213.
export const TIMELINE_START = 205
export const TIMELINE_END = 285

// Default kosong — playlist ini sekarang diisi dari hasil parsing file .flm
// (lihat flmParser.ts + flmToTracks.ts), bukan lagi data mockup statis.
export const tracks: Track[] = []
