import { BEATS_PER_BAR, type Clip, type Note } from './tracks'

export const PIANO_MIN_PITCH = 36 // C2
export const PIANO_MAX_PITCH = 96 // C7

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const BLACK_KEY_CLASSES = new Set([1, 3, 6, 8, 10])

export function midiToName(pitch: number) {
  return `${NOTE_NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`
}

export function isBlackKey(pitch: number) {
  return BLACK_KEY_CLASSES.has(pitch % 12)
}

function seeded(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// Deterministically invents a plausible little melody for clips that don't
// have hand-authored notes yet, so opening the piano roll never starts blank.
// Same seeding trick as ClipBlock's mini-pattern preview, just richer.
export function generateNotesForClip(clip: Clip): Note[] {
  const totalBeats = clip.lengthBars * BEATS_PER_BAR
  const seed = clip.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const density = clip.pattern === 'dense' ? 2.4 : clip.pattern === 'steps' ? 2 : clip.pattern === 'scribble' ? 1.2 : 1.6
  const count = Math.max(4, Math.round(totalBeats * density))
  const centerPitch = 60 + Math.round((seeded(0, seed) - 0.5) * 12)
  const lengths = [0.25, 0.5, 0.5, 1]

  const notes: Note[] = []
  let cursor = 0
  let i = 0
  while (cursor < totalBeats && i < count) {
    const lengthBeats = lengths[Math.floor(seeded(i, seed + 1) * lengths.length)]
    const rest = seeded(i, seed + 3) < 0.12 ? 0.5 : 0
    const startBeat = Math.round((cursor + rest) * 4) / 4
    if (startBeat < totalBeats) {
      const pitchOffset = Math.round((seeded(i, seed + 2) - 0.5) * 14)
      const pitch = Math.min(PIANO_MAX_PITCH, Math.max(PIANO_MIN_PITCH, centerPitch + pitchOffset))
      const clampedLength = Math.min(lengthBeats, totalBeats - startBeat)
      notes.push({ id: `${clip.id}-gen-${i}`, pitch, startBeat, lengthBeats: clampedLength })
    }
    cursor += lengthBeats + rest
    i++
  }
  return notes
}
