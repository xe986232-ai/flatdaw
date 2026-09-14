import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Midi } from '@tonejs/midi'
import { BEATS_PER_BAR, type Clip, type Note, type Track } from '../tracks'
import type { FlatColor } from '../colors'
import { PIANO_MIN_PITCH, PIANO_MAX_PITCH, isBlackKey, midiToName } from '../notes'

const BEAT_WIDTH = 40
const ROW_HEIGHT = 20
const KEY_WIDTH = 64
const RULER_HEIGHT = 28
const SNAP_BEAT = 0.25 // 16th notes
const CLICK_THRESHOLD_PX = 4
const MIN_NOTE_LENGTH = SNAP_BEAT
const BAR_WIDTH = BEAT_WIDTH * BEATS_PER_BAR

function snap(value: number) {
  return Math.round(value / SNAP_BEAT) * SNAP_BEAT
}

// Layered grid: faint 16th-note ticks, a clearer line on every beat, a strong
// line on every bar — tiled per-bar (not one giant repeating gradient) so it
// stays pixel-crisp at any width, same trick TrackRow uses for the arrangement.
const sixteenthTicks = [0.25, 0.5, 0.75]
  .map(
    (f) => `transparent ${BEAT_WIDTH * f - 0.5}px, rgba(255,255,255,0.14) ${BEAT_WIDTH * f - 0.5}px, rgba(255,255,255,0.14) ${BEAT_WIDTH * f + 0.5}px, transparent ${BEAT_WIDTH * f + 0.5}px`,
  )
  .join(', ')
const BEAT_TICK_GRADIENT = `linear-gradient(to right, transparent 0, ${sixteenthTicks}, transparent ${BEAT_WIDTH}px)`
const BEAT_LINE_GRADIENT = `linear-gradient(to right, rgba(255,255,255,0.28) 0, rgba(255,255,255,0.28) 1px, transparent 1px, transparent ${BEAT_WIDTH}px)`
const BAR_LINE_GRADIENT = `linear-gradient(to right, rgba(255,255,255,0.6) 0, rgba(255,255,255,0.6) 2px, transparent 2px, transparent ${BAR_WIDTH}px)`
const ROW_GRID_IMAGE = `${BAR_LINE_GRADIENT}, ${BEAT_LINE_GRADIENT}, ${BEAT_TICK_GRADIENT}`
const ROW_GRID_SIZE = `${BAR_WIDTH}px 100%, ${BEAT_WIDTH}px 100%, ${BEAT_WIDTH}px 100%`

export function PianoRoll({
  clip,
  trackName,
  trackKind,
  color,
  timelineEnd,
  onClose,
  onNotesChange,
  onImportMidi,
}: {
  clip: Clip
  trackName: string
  trackKind: Track['kind']
  color?: FlatColor
  timelineEnd: number
  onClose: () => void
  onNotesChange: (notes: Note[]) => void
  onImportMidi: (notes: Note[], lengthBars: number) => void
}) {
  const notes = clip.notes ?? []
  const totalBeats = clip.lengthBars * BEATS_PER_BAR
  const totalBars = clip.lengthBars
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const pitches: number[] = []
  for (let p = PIANO_MAX_PITCH; p >= PIANO_MIN_PITCH; p--) pitches.push(p)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function addNote(pitch: number, rawBeat: number) {
    const startBeat = Math.min(totalBeats - MIN_NOTE_LENGTH, Math.max(0, snap(rawBeat)))
    const newNote: Note = {
      id: `${clip.id}-note-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      pitch,
      startBeat,
      lengthBeats: 0.5,
    }
    onNotesChange([...notes, newNote])
  }

  function updateNote(id: string, patch: Partial<Note>) {
    onNotesChange(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  function deleteNote(id: string) {
    onNotesChange(notes.filter((n) => n.id !== id))
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    setImportError(null)
    try {
      const buffer = await file.arrayBuffer()
      const midi = new Midi(buffer)
      const ppq = midi.header.ppq
      const allNotes = midi.tracks.flatMap((t) => t.notes)
      if (allNotes.length === 0) {
        setImportError('File MIDI ini tidak punya note.')
        return
      }

      const maxTicks = Math.max(...allNotes.map((n) => n.ticks + n.durationTicks))
      const neededBars = Math.max(1, Math.ceil(maxTicks / ppq / BEATS_PER_BAR))
      const availableBars = Math.max(1, timelineEnd - clip.startBar)
      const lengthBars = Math.min(neededBars, availableBars)
      const capBeats = lengthBars * BEATS_PER_BAR

      const imported: Note[] = allNotes
        .map((n, i) => ({
          id: `${clip.id}-midi-${Date.now()}-${i}`,
          pitch: Math.min(PIANO_MAX_PITCH, Math.max(PIANO_MIN_PITCH, n.midi)),
          startBeat: n.ticks / ppq,
          lengthBeats: Math.max(MIN_NOTE_LENGTH, n.durationTicks / ppq),
        }))
        .filter((n) => n.startBeat < capBeats)
        .map((n) => ({ ...n, lengthBeats: Math.min(n.lengthBeats, capBeats - n.startBeat) }))

      if (neededBars > availableBars) {
        setImportError(
          `File MIDI ini butuh ${neededBars} bar tapi cuma ${availableBars} bar yang muat sebelum akhir timeline — bagian belakangnya dipotong.`,
        )
      }
      onImportMidi(imported, lengthBars)
    } catch (err) {
      console.error('Gagal membaca file MIDI:', err)
      setImportError('File MIDI tidak bisa dibaca. Pastikan formatnya .mid / .midi yang valid.')
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-surface-base text-track-melodic-ink">
      <div className="flex shrink-0 items-center gap-3 border-b border-surface-grid/40 bg-[#202024] px-4 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm bg-track-accent px-3 text-sm font-medium text-white"
        >
          ← Kembali
        </button>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">{clip.label || 'Untitled'}</span>
          <span className="truncate text-[11px] text-white/50">{trackName || trackKind} · Piano Roll · Snap 1/16</span>
        </div>
        <span className="shrink-0 text-[11px] text-white/40">
          {notes.length} not · {totalBars} bar
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm bg-[#3B6FA0] px-3 text-sm font-medium text-white"
        >
          Import MIDI
        </button>
        <input ref={fileInputRef} type="file" accept=".mid,.midi,audio/midi" className="hidden" onChange={handleImportFile} />
      </div>

      {importError && (
        <div className="shrink-0 bg-[#5A2A2A] px-4 py-1.5 text-[11px] text-white/90">{importError}</div>
      )}

      <div className="relative min-h-0 flex-1 overflow-auto">
        {/* Ruler */}
        <div className="sticky top-0 z-20 flex">
          <div
            className="sticky left-0 z-30 shrink-0 border-r border-b border-surface-grid/40 bg-surface-base"
            style={{ width: KEY_WIDTH, height: RULER_HEIGHT }}
          />
          <div
            className="relative shrink-0 border-b border-surface-grid/40 bg-[#202024]"
            style={{
              width: totalBeats * BEAT_WIDTH,
              height: RULER_HEIGHT,
              backgroundImage: BAR_LINE_GRADIENT,
              backgroundSize: `${BAR_WIDTH}px 100%`,
            }}
          >
            {Array.from({ length: totalBars }).map((_, i) => (
              <span
                key={i}
                className="absolute top-1/2 -translate-y-1/2 text-[11px] font-medium text-white/60"
                style={{ left: i * BAR_WIDTH + 5 }}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Keys + grid rows */}
        {pitches.map((pitch) => {
          const black = isBlackKey(pitch)
          const isC = pitch % 12 === 0
          const rowNotes = notes.filter((n) => n.pitch === pitch)
          return (
            <div key={pitch} className={`flex ${isC ? 'border-t border-t-white/25' : ''}`}>
              <div
                className={`sticky left-0 z-10 box-border flex shrink-0 items-center justify-end border-r border-surface-grid/40 pr-1.5 text-[9px] font-medium ${
                  black ? 'bg-[#1c1c1f] text-white/30' : 'bg-[#2c2c30] text-white/70'
                }`}
                style={{ width: KEY_WIDTH, height: ROW_HEIGHT }}
              >
                {isC ? midiToName(pitch) : ''}
              </div>
              <div
                className="relative box-border shrink-0"
                style={{
                  width: totalBeats * BEAT_WIDTH,
                  height: ROW_HEIGHT,
                  backgroundColor: black ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.02)',
                  backgroundImage: ROW_GRID_IMAGE,
                  backgroundSize: ROW_GRID_SIZE,
                  backgroundRepeat: 'repeat',
                }}
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest('[data-note-interactive]')) return
                  const rect = e.currentTarget.getBoundingClientRect()
                  addNote(pitch, (e.clientX - rect.left) / BEAT_WIDTH)
                }}
              >
                {rowNotes.map((note) => (
                  <NoteBlock
                    key={note.id}
                    note={note}
                    color={color}
                    totalBeats={totalBeats}
                    onCommitMove={(startBeat, newPitch) => updateNote(note.id, { startBeat, pitch: newPitch })}
                    onCommitResize={(lengthBeats) => updateNote(note.id, { lengthBeats })}
                    onDelete={() => deleteNote(note.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type DragState =
  | { mode: 'move'; dx: number; dy: number; moved: boolean; targetStartBeat: number; targetPitch: number }
  | { mode: 'resize'; dx: number; moved: boolean; targetLength: number }

function NoteBlock({
  note,
  color,
  totalBeats,
  onCommitMove,
  onCommitResize,
  onDelete,
}: {
  note: Note
  color?: FlatColor
  totalBeats: number
  onCommitMove: (startBeat: number, pitch: number) => void
  onCommitResize: (lengthBeats: number) => void
  onDelete: () => void
}) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const originRef = useRef({ clientX: 0, clientY: 0 })

  function beginDrag(mode: 'move' | 'resize') {
    return (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      originRef.current = { clientX: e.clientX, clientY: e.clientY }
      setDrag(
        mode === 'move'
          ? { mode: 'move', dx: 0, dy: 0, moved: false, targetStartBeat: note.startBeat, targetPitch: note.pitch }
          : { mode: 'resize', dx: 0, moved: false, targetLength: note.lengthBeats },
      )
    }
  }

  // Every intermediate frame is re-quantized to the grid — this is what makes
  // the drag feel "magnetic" instead of free-floating pixels.
  function handleMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return
    const dxRaw = e.clientX - originRef.current.clientX
    const dyRaw = e.clientY - originRef.current.clientY
    const moved = drag.moved || Math.abs(dxRaw) > CLICK_THRESHOLD_PX || Math.abs(dyRaw) > CLICK_THRESHOLD_PX

    if (drag.mode === 'move') {
      const targetStartBeat = Math.min(totalBeats - note.lengthBeats, Math.max(0, snap(note.startBeat + dxRaw / BEAT_WIDTH)))
      const rowDelta = Math.round(dyRaw / ROW_HEIGHT)
      const targetPitch = Math.min(PIANO_MAX_PITCH, Math.max(PIANO_MIN_PITCH, note.pitch - rowDelta))
      setDrag({
        mode: 'move',
        dx: (targetStartBeat - note.startBeat) * BEAT_WIDTH,
        dy: (note.pitch - targetPitch) * ROW_HEIGHT,
        moved,
        targetStartBeat,
        targetPitch,
      })
    } else {
      const targetLength = Math.max(MIN_NOTE_LENGTH, Math.min(totalBeats - note.startBeat, snap(note.lengthBeats + dxRaw / BEAT_WIDTH)))
      setDrag({ mode: 'resize', dx: (targetLength - note.lengthBeats) * BEAT_WIDTH, moved, targetLength })
    }
  }

  function handleUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (drag.mode === 'move') {
      if (drag.moved) onCommitMove(drag.targetStartBeat, drag.targetPitch)
      else onDelete()
    } else {
      onCommitResize(drag.targetLength)
    }
    setDrag(null)
  }

  const left = note.startBeat * BEAT_WIDTH
  const width = (drag?.mode === 'resize' ? drag.targetLength : note.lengthBeats) * BEAT_WIDTH
  const transform = drag?.mode === 'move' ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined

  return (
    <div
      data-note-interactive="true"
      className={`absolute top-0 bottom-0 touch-none select-none rounded-[2px] border border-black/30 ${
        drag ? 'z-30 brightness-110' : 'z-10 cursor-grab'
      }`}
      style={{ left, width, backgroundColor: color?.fill ?? '#3B6FA0', transform }}
      onPointerDown={beginDrag('move')}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={() => setDrag(null)}
    >
      <div
        data-note-interactive="true"
        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
        onPointerDown={beginDrag('resize')}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={() => setDrag(null)}
      />
    </div>
  )
}
