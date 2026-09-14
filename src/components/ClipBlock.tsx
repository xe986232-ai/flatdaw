import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { BEATS_PER_BAR, type Clip, type Note, type TrackKind } from '../tracks'
import type { FlatColor } from '../colors'
import { ClipMenu, type ClipMenuAction } from './ClipMenu'

const fillByKind: Record<TrackKind, string> = {
  marker: 'bg-track-marker',
  melodic: 'bg-track-melodic',
  lead: 'bg-track-lead',
  drum: 'bg-track-drum',
  perc: 'bg-track-perc',
  accent: 'bg-track-accent',
}

const inkByKind: Record<TrackKind, string> = {
  marker: 'text-track-marker-ink',
  melodic: 'text-track-melodic-ink',
  lead: 'text-track-drum-block',
  drum: 'text-track-drum-block',
  perc: 'text-track-perc-step',
  accent: 'text-white',
}

function seeded(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// Mini piano-roll beneran dari clip.notes asli — dipakai begitu clip udah
// punya note (mis. hasil parsing .flm). Rentang pitch auto-fit ke not yang
// ada (mirip PITCH_MIN/PITCH_MAX dinamis di tool HTML), bukan rentang tetap,
// biar pola melodinya kebaca meski cuma dalam kotak kecil.
function NotePreview({ notes, totalBeats }: { notes: Note[]; totalBeats: number }) {
  if (notes.length === 0) return null
  const pitches = notes.map((n) => n.pitch)
  const minPitch = Math.min(...pitches)
  const maxPitch = Math.max(...pitches)
  const pitchSpan = Math.max(1, maxPitch - minPitch)
  const safeTotalBeats = Math.max(totalBeats, 1)

  return (
    <div className="relative h-full w-full opacity-90">
      {notes.map((n) => {
        const left = Math.min(98, Math.max(0, (n.startBeat / safeTotalBeats) * 100))
        const width = Math.max((n.lengthBeats / safeTotalBeats) * 100, 0.8)
        const top = pitchSpan === 0 ? 45 : 8 + ((maxPitch - n.pitch) / pitchSpan) * 78
        return (
          <span
            key={n.id}
            className="absolute rounded-[1px]"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: '2px',
              backgroundColor: 'currentColor',
            }}
          />
        )
      })}
    </div>
  )
}

function Pattern({ pattern, seed = 0 }: { pattern: Clip['pattern']; seed?: number }) {
  if (pattern === 'notes') {
    const count = 22
    return (
      <div className="relative h-full w-full opacity-90">
        {Array.from({ length: count }).map((_, i) => {
          const top = 10 + seeded(i, seed) * 75
          const w = 4 + seeded(i, seed + 1) * 5
          return (
            <span
              key={i}
              className="absolute rounded-[1px]"
              style={{
                left: `${(i / count) * 100}%`,
                top: `${top}%`,
                width: `${w}px`,
                height: '2px',
                backgroundColor: 'currentColor',
              }}
            />
          )
        })}
      </div>
    )
  }
  if (pattern === 'steps') {
    return (
      <div className="flex h-4 w-full items-end gap-[3px]">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="w-[3px] flex-1 rounded-[1px]"
            style={{
              height: i % 4 === 0 ? '100%' : '55%',
              backgroundColor: 'currentColor',
              opacity: i % 4 === 0 ? 0.95 : 0.55,
            }}
          />
        ))}
      </div>
    )
  }
  if (pattern === 'dense') {
    return (
      <div className="flex h-4 w-full items-end gap-[2px] overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="flex-1 rounded-[1px]"
            style={{
              height: `${30 + ((i * 37) % 70)}%`,
              backgroundColor: 'currentColor',
              opacity: 0.85,
            }}
          />
        ))}
      </div>
    )
  }
  if (pattern === 'scribble') {
    return (
      <div className="flex h-4 w-full flex-col justify-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[3px] w-full rounded-full" style={{ backgroundColor: 'currentColor' }} />
        ))}
      </div>
    )
  }
  return null
}

const SNAP_BARS = 0.25 // snap to the beat subdivisions already drawn on the grid
const CLICK_THRESHOLD_PX = 4 // pointer movement below this counts as a tap, not a drag

export function ClipBlock({
  clip,
  kind,
  barWidth,
  timelineStart,
  timelineEnd,
  color,
  isMenuOpen = false,
  isEditing = false,
  flipMenuDown = false,
  onStartBarChange,
  onClipClick,
  onMenuAction,
  onRenameCommit,
}: {
  clip: Clip
  kind: TrackKind
  barWidth: number
  timelineStart: number
  timelineEnd: number
  color?: FlatColor
  isMenuOpen?: boolean
  isEditing?: boolean
  flipMenuDown?: boolean
  onStartBarChange?: (clipId: string, newStartBar: number) => void
  onClipClick?: (clipId: string) => void
  onMenuAction?: (clipId: string, action: ClipMenuAction) => void
  onRenameCommit?: (clipId: string, label: string) => void
}) {
  const [dragStartBar, setDragStartBar] = useState<number | null>(null)
  const dragInfo = useRef<{ originClientX: number; originStartBar: number; moved: boolean } | null>(null)

  const [labelDraft, setLabelDraft] = useState(clip.label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEditing) return
    setLabelDraft(clip.label)
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(id)
  }, [isEditing, clip.label])

  const effectiveStartBar = dragStartBar ?? clip.startBar
  const left = (effectiveStartBar - timelineStart) * barWidth
  const width = clip.lengthBars * barWidth
  const seed = clip.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)

  const minStart = timelineStart
  const maxStart = timelineEnd - clip.lengthBars

  function snap(bar: number) {
    const snapped = Math.round(bar / SNAP_BARS) * SNAP_BARS
    return Math.min(maxStart, Math.max(minStart, snapped))
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (isEditing) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragInfo.current = { originClientX: e.clientX, originStartBar: clip.startBar, moved: false }
    setDragStartBar(clip.startBar)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragInfo.current) return
    const { originClientX, originStartBar } = dragInfo.current
    const deltaPx = e.clientX - originClientX
    if (Math.abs(deltaPx) > CLICK_THRESHOLD_PX) dragInfo.current.moved = true
    const deltaBars = deltaPx / barWidth
    setDragStartBar(snap(originStartBar + deltaBars))
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragInfo.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    const { moved } = dragInfo.current
    dragInfo.current = null
    setDragStartBar((finalBar) => {
      if (moved && finalBar != null) onStartBarChange?.(clip.id, finalBar)
      return null
    })
    if (!moved) onClipClick?.(clip.id)
  }

  function commitRename() {
    const trimmed = labelDraft.trim()
    onRenameCommit?.(clip.id, trimmed || clip.label)
  }

  return (
    <div
      data-clip-interactive="true"
      className={`absolute top-0 bottom-0 flex touch-none select-none flex-col overflow-visible px-2 py-1 ${
        color ? '' : `${fillByKind[kind]} ${inkByKind[kind]}`
      } ${dragStartBar != null ? 'z-20 cursor-grabbing brightness-105' : 'cursor-grab'} ${isMenuOpen ? 'z-30' : ''}`}
      style={{ left, width, backgroundColor: color?.fill, color: color?.ink }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(e) => e.stopPropagation()}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setLabelDraft(clip.label)
              e.currentTarget.blur()
            }
          }}
          className="relative z-30 mb-1 w-full min-w-0 shrink-0 rounded-sm border border-black/30 bg-white/95 px-1 text-[11px] font-medium leading-tight text-black outline-none"
        />
      ) : (
        clip.label && (
          <span className="block shrink-0 truncate text-[11px] font-medium leading-none mb-1">{clip.label}</span>
        )
      )}
      <div className="min-h-0 flex-1">
        {clip.notes && clip.notes.length > 0 ? (
          <NotePreview notes={clip.notes} totalBeats={clip.lengthBars * BEATS_PER_BAR} />
        ) : (
          <Pattern pattern={clip.pattern} seed={seed} />
        )}
      </div>

      {isMenuOpen && <ClipMenu flipDown={flipMenuDown} onAction={(action) => onMenuAction?.(clip.id, action)} />}
    </div>
  )
}
