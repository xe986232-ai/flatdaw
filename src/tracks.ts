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

const baseTracks: Track[] = [
  {
    id: 'note-a',
    name: '',
    kind: 'marker',
    clips: [{ id: 'more', label: 'more', startBar: 208, lengthBars: 1, pattern: 'scribble' }],
  },
  {
    id: 'note-b',
    name: '',
    kind: 'marker',
    clips: [{ id: 'even-more', label: 'even more', startBar: 209, lengthBars: 1.5, pattern: 'scribble' }],
  },
  {
    id: 'fireflies',
    name: 'fireflies',
    kind: 'melodic',
    clips: [
      { id: 'fireflies-1', label: 'fireflies', startBar: 205, lengthBars: 4, pattern: 'notes' },
      { id: 'fireflies-2', label: 'fireflies', startBar: 209, lengthBars: 4, pattern: 'notes' },
    ],
  },
  {
    id: 'lenno',
    name: 'lenno',
    kind: 'melodic',
    clips: [{ id: 'lenno-1', label: 'lenno', startBar: 209, lengthBars: 4, pattern: 'notes' }],
  },
  {
    id: 'starbean',
    name: 'starbean',
    kind: 'melodic',
    clips: [
      { id: 'starbean-1', label: 'starbean', startBar: 205, lengthBars: 4, pattern: 'notes' },
      { id: 'starbean-2', label: 'starbean', startBar: 209, lengthBars: 4, pattern: 'notes' },
    ],
  },
  {
    id: 'organ',
    name: 'organ',
    kind: 'accent',
    clips: [{ id: 'organ-1', label: 'organ', startBar: 209, lengthBars: 4, pattern: 'notes' }],
  },
  {
    id: 'top',
    name: 'top',
    kind: 'lead',
    clips: [{ id: 'top-1', label: 'top', startBar: 205, lengthBars: 8, pattern: 'dense' }],
  },
  {
    id: 'dnb',
    name: 'dnb',
    kind: 'drum',
    clips: [{ id: 'dnb-1', label: 'dnb', startBar: 205, lengthBars: 8, pattern: 'dense' }],
  },
  {
    id: 'clap',
    name: 'clap',
    kind: 'perc',
    clips: [{ id: 'clap-1', label: 'clap', startBar: 205, lengthBars: 8, pattern: 'steps' }],
  },
  {
    id: 'jc-kick',
    name: 'jc kick',
    kind: 'perc',
    clips: [{ id: 'jc-kick-1', label: 'jc kick', startBar: 205, lengthBars: 8, pattern: 'steps' }],
  },
]

// A bunch of extra tracks so the arrangement feels like a real full project —
// content is arbitrary, just spread evenly across the whole extended timeline.
const EXTRA_TRACK_KINDS: TrackKind[] = ['marker', 'melodic', 'lead', 'drum', 'perc', 'accent']
const EXTRA_TRACK_NAMES = [
  'pad', 'sub bass', 'pluck', 'riser', 'vox chop', 'arp', 'perc 2', 'fx sweep', 'strings 2', 'outro synth',
  'hats', 'perc fill',
]
const EXTRA_PATTERNS: Array<Clip['pattern']> = ['notes', 'steps', 'dense', 'scribble']

function buildExtraTracks(): Track[] {
  const totalBars = TIMELINE_END - TIMELINE_START
  return EXTRA_TRACK_NAMES.map((name, i) => {
    const kind = EXTRA_TRACK_KINDS[i % EXTRA_TRACK_KINDS.length]
    const clipCount = 3 + (i % 3) // 3–5 clips per track
    const spacing = Math.floor(totalBars / clipCount)
    const clips: Clip[] = Array.from({ length: clipCount }, (_, c) => {
      const lengthBars = [2, 4, 6, 8][(i + c) % 4]
      const rawStart = TIMELINE_START + c * spacing
      const startBar = Math.min(TIMELINE_END - lengthBars, rawStart)
      return {
        id: `extra-${i}-${c}`,
        label: name,
        startBar,
        lengthBars,
        pattern: EXTRA_PATTERNS[(i + c) % EXTRA_PATTERNS.length],
      }
    })
    return { id: `extra-${i}`, name, kind, clips }
  })
}

export const tracks: Track[] = [...baseTracks, ...buildExtraTracks()]
