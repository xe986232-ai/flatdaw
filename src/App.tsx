import { useEffect, useRef, useState } from 'react'
import { RulerBar } from './components/RulerBar'
import { TrackRow } from './components/TrackRow'
import { AutomationLane } from './components/AutomationLane'
import { Playhead } from './components/Playhead'
import type { ClipMenuAction } from './components/ClipMenu'
import { tracks, TIMELINE_START, TIMELINE_END, type Clip } from './tracks'
import { randomFlatColor, type FlatColor } from './colors'

const BAR_WIDTH = 96
const LABEL_WIDTH = 72
const TOTAL_BARS = TIMELINE_END - TIMELINE_START

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [playheadBar, setPlayheadBar] = useState(207)
  const [trackList, setTrackList] = useState(tracks)
  const [trackColors, setTrackColors] = useState<Record<string, FlatColor>>({})

  // Clip context menu: which clip's menu/edit state is open, plus a one-slot clipboard for cut/copy → paste.
  const [openMenu, setOpenMenu] = useState<{ trackId: string; clipId: string } | null>(null)
  const [editingClip, setEditingClip] = useState<{ trackId: string; clipId: string } | null>(null)
  const [clipboard, setClipboard] = useState<Clip | null>(null)

  const playheadX = (playheadBar - TIMELINE_START) * BAR_WIDTH

  // Close the floating menu on any pointer interaction outside a clip/menu.
  useEffect(() => {
    if (!openMenu) return
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null
      if (!target?.closest('[data-clip-interactive]')) setOpenMenu(null)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [openMenu])

  const handleDrag = (clientX: number) => {
    const container = scrollRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const localX = clientX - rect.left + container.scrollLeft - LABEL_WIDTH
    const bar = TIMELINE_START + localX / BAR_WIDTH
    const clamped = Math.min(TIMELINE_END, Math.max(TIMELINE_START, bar))
    setPlayheadBar(Math.round(clamped * 4) / 4)
  }

  const handleClipMove = (trackId: string, clipId: string, newStartBar: number) => {
    setTrackList((prev) =>
      prev.map((t) =>
        t.id !== trackId
          ? t
          : { ...t, clips: t.clips.map((c) => (c.id === clipId ? { ...c, startBar: newStartBar } : c)) },
      ),
    )
  }

  const handleClipClick = (trackId: string, clipId: string) => {
    setEditingClip(null)
    setOpenMenu((prev) => (prev?.clipId === clipId ? null : { trackId, clipId }))
  }

  const handleRenameCommit = (trackId: string, clipId: string, label: string) => {
    setTrackList((prev) =>
      prev.map((t) =>
        t.id !== trackId ? t : { ...t, clips: t.clips.map((c) => (c.id === clipId ? { ...c, label } : c)) },
      ),
    )
    setEditingClip(null)
  }

  const handleMenuAction = (trackId: string, clipId: string, action: ClipMenuAction) => {
    setOpenMenu(null)
    const track = trackList.find((t) => t.id === trackId)
    const clip = track?.clips.find((c) => c.id === clipId)
    if (!clip) return

    if (action === 'edit') {
      setEditingClip({ trackId, clipId })
      return
    }
    if (action === 'delete') {
      setTrackList((prev) =>
        prev.map((t) => (t.id !== trackId ? t : { ...t, clips: t.clips.filter((c) => c.id !== clipId) })),
      )
      return
    }
    if (action === 'snap') {
      const maxStart = TIMELINE_END - clip.lengthBars
      const wholeBar = Math.min(maxStart, Math.max(TIMELINE_START, Math.round(clip.startBar)))
      handleClipMove(trackId, clipId, wholeBar)
      return
    }
    if (action === 'copy') {
      setClipboard(clip)
      return
    }
    if (action === 'cut') {
      setClipboard(clip)
      setTrackList((prev) =>
        prev.map((t) => (t.id !== trackId ? t : { ...t, clips: t.clips.filter((c) => c.id !== clipId) })),
      )
      return
    }
    if (action === 'duplicate') {
      const maxStart = TIMELINE_END - clip.lengthBars
      const startBar = Math.min(maxStart, clip.startBar + clip.lengthBars)
      const newClip: Clip = { ...clip, id: `${clip.id}-copy-${Date.now()}`, startBar }
      setTrackList((prev) => prev.map((t) => (t.id !== trackId ? t : { ...t, clips: [...t.clips, newClip] })))
    }
  }

  // Clicking empty grid space pastes whatever's in the clipboard at that bar position.
  const handleBackgroundClick = (trackId: string, bar: number) => {
    setOpenMenu(null)
    if (!clipboard) return
    const maxStart = TIMELINE_END - clipboard.lengthBars
    const snapped = Math.min(maxStart, Math.max(TIMELINE_START, Math.round(bar / 0.25) * 0.25))
    const newClip: Clip = { ...clipboard, id: `${clipboard.id}-paste-${Date.now()}`, startBar: snapped }
    setTrackList((prev) => prev.map((t) => (t.id !== trackId ? t : { ...t, clips: [...t.clips, newClip] })))
  }

  const handleRandomColors = () => {
    setTrackColors((prev) => {
      const next: Record<string, FlatColor> = {}
      for (const track of trackList) {
        next[track.id] = randomFlatColor(prev[track.id]?.fill)
      }
      return next
    })
  }

  return (
    <div className="force-landscape flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#1a1a1d] p-4">
      {/* Landscape canvas — fixed 16:9, holds the whole playlist/arrangement view */}
      <div className="flex aspect-video w-full max-w-[1280px] flex-col overflow-hidden rounded-lg border border-black/40 bg-surface-base text-track-melodic-ink">
        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
          <RulerBar startBar={TIMELINE_START} endBar={TIMELINE_END} barWidth={BAR_WIDTH} labelWidth={LABEL_WIDTH} />

          <div className="relative">
            {trackList.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                barWidth={BAR_WIDTH}
                labelWidth={LABEL_WIDTH}
                totalBars={TOTAL_BARS}
                timelineStart={TIMELINE_START}
                timelineEnd={TIMELINE_END}
                color={trackColors[track.id]}
                onClipMove={(clipId, newStartBar) => handleClipMove(track.id, clipId, newStartBar)}
                openMenuClipId={openMenu?.trackId === track.id ? openMenu.clipId : null}
                editingClipId={editingClip?.trackId === track.id ? editingClip.clipId : null}
                flipMenuDown={index === 0}
                onClipClick={(clipId) => handleClipClick(track.id, clipId)}
                onMenuAction={(clipId, action) => handleMenuAction(track.id, clipId, action)}
                onRenameCommit={(clipId, label) => handleRenameCommit(track.id, clipId, label)}
                onBackgroundClick={(bar) => handleBackgroundClick(track.id, bar)}
              />
            ))}

            <AutomationLane label="Level" totalBars={TOTAL_BARS} barWidth={BAR_WIDTH} labelWidth={LABEL_WIDTH} />
            <AutomationLane
              label="Frequency : FX Filter"
              totalBars={TOTAL_BARS}
              barWidth={BAR_WIDTH}
              labelWidth={LABEL_WIDTH}
              teeth={70}
            />

            <div className="pointer-events-none absolute inset-0" style={{ left: LABEL_WIDTH }}>
              <Playhead x={playheadX} onDrag={handleDrag} />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRandomColors}
        className="w-full max-w-[1280px] shrink-0 bg-track-accent px-4 py-2 text-sm font-medium text-white"
      >
        Random Color
      </button>
    </div>
  )
}
