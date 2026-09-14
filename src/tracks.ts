export type TrackKind = 'marker' | 'melodic' | 'lead' | 'drum' | 'perc' | 'accent'

export interface Clip {
  id: string
  label: string
  startBar: number // in bars, relative to timeline start
  lengthBars: number
  pattern?: 'notes' | 'steps' | 'scribble' | 'dense'
}

export interface Track {
  id: string
  name: string
  kind: TrackKind
  clips: Clip[]
}

// Timeline window mirrors the reference: bars 205–213
export const TIMELINE_START = 205
export const TIMELINE_END = 213

export const tracks: Track[] = [
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
