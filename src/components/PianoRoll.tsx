import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { BEATS_PER_BAR, type Clip, type Note, type Track } from '../tracks'
import type { FlatColor } from '../colors'
import { PIANO_MIN_PITCH, PIANO_MAX_PITCH, isBlackKey, midiToName } from '../notes'

const BEAT_WIDTH = 32
const ROW_HEIGHT = 16
const KEY_WIDTH = 60
const RULER_HEIGHT = 26
const SNAP_BEAT = 0.25
const CLICK_THRESHOLD_PX = 4
const MIN_NOTE_LENGTH = SNAP_BEAT

function snap(value: number) {
  return Math.round(value / SNAP_BEAT) * SNAP_BEAT
}

export function PianoRoll({
  clip,
  trackName,
  trackKind,
  color,
  onClose,
  onNotesChange,
}: {
  clip: Clip
  trackName: string
  trackKind: Track['kind']
  color?: FlatColor
  onClose: () => void
  onNotesChange: (notes: Note[]) => void
}) {
  const notes = clip.notes ?? []
  const totalBeats = clip.lengthBars * BEATS_PER_BAR
  const totalBars = clip.lengthBars

  const pitches: number[] = []
  for (let p = PIANO_MAX_PITCH; p >= PIANO_MIN_PITCH; p--) pitches.push(p)

  // Close on Escape — feels like "leaving" the piano roll, same as a back button.
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
          <span className="truncate text-[11px] text-white/50">{trackName || trackKind} · Piano Roll</span>
        </div>
        <span className="shrink-0 text-[11px] text-white/40">
          {notes.length} not · {totalBars} bar
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        {/* Ruler */}
        <div className="sticky top-0 z-20 flex">
          <div
            className="sticky left-0 z-30 shrink-0 border-r border-b border-surface-grid/40 bg-surface-base"
            style={{ width: KEY_WIDTH, height: RULER_HEIGHT }}
          />
          <div
            className="relative shrink-0 border-b border-surface-grid/40 bg-surface-base"
            style={{
              width: totalBeats * BEAT_WIDTH,
              height: RULER_HEIGHT,
              backgroundImage: `linear-gradient(to right, rgba(201,168,188,0.4) 0, rgba(201,168,188,0.4) 1px, transparent 1px, transparent ${BEAT_WIDTH * BEATS_PER_BAR}px)`,
              backgroundSize: `${BEAT_WIDTH * BEATS_PER_BAR}px 100%`,
            }}
          >
            {Array.from({ length: totalBars }).map((_, i) => (
              <span
                key={i}
                className="absolute top-1/2 -translate-y-1/2 text-[10px] text-white/40"
                style={{ left: i * BEAT_WIDTH * BEATS_PER_BAR + 4 }}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Keys + grid rows */}
        {pitches.map((pitch) => {
          const black = isBlackKey(pitch)
          const rowNotes = notes.filter((n) => n.pitch === pitch)
          return (
            <div key={pitch} className="flex">
              <div
                className={`sticky left-0 z-10 box-border flex shrink-0 items-center justify-end border-r border-b border-surface-grid/40 pr-1.5 text-[9px] ${
                  black ? 'bg-[#1c1c1f] text-white/30' : 'bg-[#2c2c30] text-white/60'
                }`}
                style={{ width: KEY_WIDTH, height: ROW_HEIGHT }}
              >
                {pitch % 12 === 0 ? midiToName(pitch) : ''}
              </div>
              <div
                className="relative box-border shrink-0 border-b border-surface-grid/10"
                style={{
                  width: totalBeats * BEAT_WIDTH,
                  height: ROW_HEIGHT,
                  backgroundColor: black ? 'rgba(0,0,0,0.18)' : 'transparent',
                  backgroundImage: `linear-gradient(to right, rgba(201,168,188,0.3) 0, rgba(201,168,188,0.3) 1px, transparent 1px, transparent ${BEAT_WIDTH}px)`,
                  backgroundSize: `${BEAT_WIDTH}px 100%`,
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
  const [drag, setDrag] = useState<{ mode: 'move' | 'resize'; dx: number; dy: number; moved: boolean } | null>(null)
  const originRef = useRef({ clientX: 0, clientY: 0 })

  function beginDrag(mode: 'move' | 'resize') {
    return (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      originRef.current = { clientX: e.clientX, clientY: e.clientY }
      setDrag({ mode, dx: 0, dy: 0, moved: false })
    }
  }

  function handleMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return
    const dx = e.clientX - originRef.current.clientX
    const dy = e.clientY - originRef.current.clientY
    const moved = drag.moved || Math.abs(dx) > CLICK_THRESHOLD_PX || Math.abs(dy) > CLICK_THRESHOLD_PX
    setDrag({ ...drag, dx, dy, moved })
  }

  function handleUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (drag.mode === 'move') {
      if (drag.moved) {
        const newStartBeat = Math.min(
          totalBeats - note.lengthBeats,
          Math.max(0, snap(note.startBeat + drag.dx / BEAT_WIDTH)),
        )
        const newPitch = Math.min(PIANO_MAX_PITCH, Math.max(PIANO_MIN_PITCH, note.pitch - Math.round(drag.dy / ROW_HEIGHT)))
        onCommitMove(newStartBeat, newPitch)
      } else {
        onDelete()
      }
    } else {
      const newLength = Math.max(
        MIN_NOTE_LENGTH,
        Math.min(totalBeats - note.startBeat, snap(note.lengthBeats + drag.dx / BEAT_WIDTH)),
      )
      onCommitResize(newLength)
    }
    setDrag(null)
  }

  const left = note.startBeat * BEAT_WIDTH
  const width = (drag?.mode === 'resize' ? Math.max(MIN_NOTE_LENGTH, note.lengthBeats + drag.dx / BEAT_WIDTH) : note.lengthBeats) * BEAT_WIDTH
  const transform = drag?.mode === 'move' ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined

  return (
    <div
      data-note-interactive="true"
      className={`absolute top-0 bottom-0 touch-none select-none rounded-[2px] ${drag ? 'z-30 brightness-110' : 'z-10 cursor-grab'}`}
      style={{ left, width, backgroundColor: color?.fill ?? '#3B6FA0', transform }}
      onPointerDown={beginDrag('move')}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={() => setDrag(null)}
    >
      <div
        className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize"
        onPointerDown={beginDrag('resize')}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={() => setDrag(null)}
      />
    </div>
  )
}
