import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Clip, TrackKind } from '../tracks'

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

export function ClipBlock({
  clip,
  kind,
  barWidth,
  timelineStart,
  timelineEnd,
  onStartBarChange,
}: {
  clip: Clip
  kind: TrackKind
  barWidth: number
  timelineStart: number
  timelineEnd: number
  onStartBarChange?: (clipId: string, newStartBar: number) => void
}) {
  const [dragStartBar, setDragStartBar] = useState<number | null>(null)
  const dragInfo = useRef<{ originClientX: number; originStartBar: number } | null>(null)

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
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragInfo.current = { originClientX: e.clientX, originStartBar: clip.startBar }
    setDragStartBar(clip.startBar)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragInfo.current) return
    const { originClientX, originStartBar } = dragInfo.current
    const deltaBars = (e.clientX - originClientX) / barWidth
    setDragStartBar(snap(originStartBar + deltaBars))
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragInfo.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragInfo.current = null
    setDragStartBar((finalBar) => {
      if (finalBar != null) onStartBarChange?.(clip.id, finalBar)
      return null
    })
  }

  return (
    <div
      className={`absolute top-0 bottom-0 flex touch-none select-none flex-col overflow-hidden px-2 py-1 ${fillByKind[kind]} ${inkByKind[kind]} ${
        dragStartBar != null ? 'z-20 cursor-grabbing brightness-105' : 'cursor-grab'
      }`}
      style={{ left, width }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {clip.label && (
        <span className="block shrink-0 truncate text-[11px] font-medium leading-none mb-1">{clip.label}</span>
      )}
      <div className="min-h-0 flex-1">
        <Pattern pattern={clip.pattern} seed={seed} />
      </div>
    </div>
  )
}
