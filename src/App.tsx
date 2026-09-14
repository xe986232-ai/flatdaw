import { useEffect, useRef, useState } from 'react'
import { RulerBar } from './components/RulerBar'
import { TrackRow } from './components/TrackRow'
import { AutomationLane } from './components/AutomationLane'
import { Playhead } from './components/Playhead'
import type { ClipMenuAction } from './components/ClipMenu'
import { tracks, TIMELINE_START, TIMELINE_END, type Clip } from './tracks'
import { randomFlatColor, type FlatColor } from './colors'

const BASE_BAR_WIDTH = 96
const BASE_ROW_HEIGHT = 56
const BASE_AUTOMATION_HEIGHT = 44
const LABEL_WIDTH = 72
const TOTAL_BARS = TIMELINE_END - TIMELINE_START

// Zoom bounds — horizontal stretches clip/bar width, vertical widens track row height.
const H_ZOOM_MIN = 0.4
const H_ZOOM_MAX = 3
const V_ZOOM_MIN = 0.6
const V_ZOOM_MAX = 2.5
const ZOOM_STEP = 0.2

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [playheadBar, setPlayheadBar] = useState(207)
  const [trackList, setTrackList] = useState(tracks)
  const [trackColors, setTrackColors] = useState<Record<string, FlatColor>>({})

  // Clip context menu: which clip's menu/edit state is open, plus a one-slot clipboard for cut/copy → paste.
  const [openMenu, setOpenMenu] = useState<{ trackId: string; clipId: string } | null>(null)
  const [editingClip, setEditingClip] = useState<{ trackId: string; clipId: string } | null>(null)
  const [clipboard, setClipboard] = useState<Clip | null>(null)

  // Playlist-wide display toggles — apply to every track row, not just one.
  const [showDividers, setShowDividers] = useState(true)
  const [showHighlight, setShowHighlight] = useState(true)

  // Zoom: horizontal stretches bar width (clips get wider), vertical widens track row height.
  const [hZoom, setHZoom] = useState(1)
  const [vZoom, setVZoom] = useState(1)
  const barWidth = BASE_BAR_WIDTH * hZoom
  const rowHeight = BASE_ROW_HEIGHT * vZoom
  const automationHeight = BASE_AUTOMATION_HEIGHT * vZoom

  // Kept in sync via effect below so the pinch/wheel listeners (attached once)
  // always read the latest zoom values instead of a stale closure.
  const hZoomRef = useRef(hZoom)
  const vZoomRef = useRef(vZoom)
  useEffect(() => {
    hZoomRef.current = hZoom
    vZoomRef.current = vZoom
  }, [hZoom, vZoom])

  const playheadX = (playheadBar - TIMELINE_START) * barWidth

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
    const bar = TIMELINE_START + localX / barWidth
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

  const handleZoomH = (delta: number) => {
    setHZoom((v) => Math.min(H_ZOOM_MAX, Math.max(H_ZOOM_MIN, Math.round((v + delta) * 100) / 100)))
  }

  const handleZoomV = (delta: number) => {
    setVZoom((v) => Math.min(V_ZOOM_MAX, Math.max(V_ZOOM_MIN, Math.round((v + delta) * 100) / 100)))
  }

  // Pinch-to-zoom directly on the canvas: two-finger touch (mobile/tablet) or
  // Ctrl+scroll (trackpad "pinch" gesture on desktop). Both are intercepted with
  // { passive: false } + preventDefault so the *browser page* never zooms —
  // only the canvas's own hZoom/vZoom state changes.
  //
  // Axes are independent: how far the two fingers move apart *horizontally*
  // only drives hZoom, and how far apart *vertically* only drives vZoom —
  // pulling straight up/down no longer touches hZoom, and vice versa.
  // Updates are batched to one per animation frame so dragging doesn't spam
  // React with a state update (and full re-render) on every raw touch event.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
    const round2 = (v: number) => Math.round(v * 100) / 100

    let rafId: number | null = null
    let pendingHZoom: number | null = null
    let pendingVZoom: number | null = null

    const flush = () => {
      rafId = null
      if (pendingHZoom !== null) setHZoom(pendingHZoom)
      if (pendingVZoom !== null) setVZoom(pendingVZoom)
      pendingHZoom = null
      pendingVZoom = null
    }

    const schedule = (nextH: number | null, nextV: number | null) => {
      if (nextH !== null) pendingHZoom = nextH
      if (nextV !== null) pendingVZoom = nextV
      if (rafId === null) rafId = requestAnimationFrame(flush)
    }

    // --- Touch pinch (mobile/tablet) ---
    let pinchStartDX: number | null = null
    let pinchStartDY: number | null = null
    let pinchStartHZoom = 1
    let pinchStartVZoom = 1

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        pinchStartDX = Math.abs(e.touches[0].clientX - e.touches[1].clientX)
        pinchStartDY = Math.abs(e.touches[0].clientY - e.touches[1].clientY)
        pinchStartHZoom = hZoomRef.current
        pinchStartVZoom = vZoomRef.current
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDX !== null && pinchStartDY !== null) {
        e.preventDefault()
        const dx = Math.abs(e.touches[0].clientX - e.touches[1].clientX)
        const dy = Math.abs(e.touches[0].clientY - e.touches[1].clientY)
        // Ignore an axis that barely had any spread to begin with — dividing by
        // a near-zero start distance would make that axis wildly oversensitive.
        const nextH = pinchStartDX > 20 ? round2(clamp(pinchStartHZoom * (dx / pinchStartDX), H_ZOOM_MIN, H_ZOOM_MAX)) : null
        const nextV = pinchStartDY > 20 ? round2(clamp(pinchStartVZoom * (dy / pinchStartDY), V_ZOOM_MIN, V_ZOOM_MAX)) : null
        schedule(nextH, nextV)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDX = null
        pinchStartDY = null
      }
    }

    // --- Trackpad pinch / Ctrl+scroll (desktop) ---
    // A wheel gesture only reports one axis of intensity (deltaY), so there's no
    // dx/dy to split the way touch has. Hold Shift to target vertical zoom
    // instead of horizontal — same idea as Shift+scroll conventions elsewhere.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return // plain scroll — let the container scroll normally
      e.preventDefault()
      const scale = 1 - e.deltaY * 0.01
      if (e.shiftKey) {
        schedule(null, round2(clamp(vZoomRef.current * scale, V_ZOOM_MIN, V_ZOOM_MAX)))
      } else {
        schedule(round2(clamp(hZoomRef.current * scale, H_ZOOM_MIN, H_ZOOM_MAX)), null)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <div className="force-landscape flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#1a1a1d] p-4">
      {/* Portrait canvas — fixed 1080x2292 frame, but the playlist inside is rotated 90deg
          so it still plays like a wide landscape view, just wrapped into a tall canvas. */}
      <div className="flex aspect-[1080/2292] w-full max-w-[1080px] flex-col overflow-hidden rounded-lg border border-black/40 bg-surface-base text-track-melodic-ink">
        <div className="relative h-full w-full" style={{ containerType: 'size' }}>
          <div
            className="absolute left-1/2 top-1/2 origin-center -translate-x-1/2 -translate-y-1/2 rotate-90"
            style={{ width: '100cqh', height: '100cqw' }}
          >
            <div ref={scrollRef} className="relative h-full w-full overflow-auto">
              <RulerBar startBar={TIMELINE_START} endBar={TIMELINE_END} barWidth={barWidth} labelWidth={LABEL_WIDTH} />

              <div className="relative">
                {trackList.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    barWidth={barWidth}
                    labelWidth={LABEL_WIDTH}
                    totalBars={TOTAL_BARS}
                    timelineStart={TIMELINE_START}
                    timelineEnd={TIMELINE_END}
                    height={rowHeight}
                    color={trackColors[track.id]}
                    showDivider={showDividers}
                    showHighlight={showHighlight}
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

                <AutomationLane label="Level" totalBars={TOTAL_BARS} barWidth={barWidth} labelWidth={LABEL_WIDTH} height={automationHeight} />
                <AutomationLane
                  label="Frequency : FX Filter"
                  totalBars={TOTAL_BARS}
                  barWidth={barWidth}
                  labelWidth={LABEL_WIDTH}
                  height={automationHeight}
                  teeth={70}
                />

                <div className="pointer-events-none absolute inset-0" style={{ left: LABEL_WIDTH }}>
                  <Playhead x={playheadX} onDrag={handleDrag} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-[1080px] shrink-0 flex-col gap-2">
        <button
          type="button"
          onClick={handleRandomColors}
          className="bg-track-accent px-4 py-2 text-sm font-medium text-white"
        >
          Random Color
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowDividers((v) => !v)}
            className="flex-1 px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: showDividers ? '#3B6FA0' : '#6B5A63' }}
          >
            Garis Pembatas: {showDividers ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={() => setShowHighlight((v) => !v)}
            className="flex-1 px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: showHighlight ? '#3B6FA0' : '#6B5A63' }}
          >
            Highlight: {showHighlight ? 'On' : 'Off'}
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 bg-[#2a2a2e] px-3 py-2">
            <span className="flex-1 text-sm font-medium text-white">Zoom H: {Math.round(hZoom * 100)}%</span>
            <button
              type="button"
              onClick={() => handleZoomH(-ZOOM_STEP)}
              disabled={hZoom <= H_ZOOM_MIN}
              className="h-7 w-7 bg-track-accent text-sm font-bold text-white disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => handleZoomH(ZOOM_STEP)}
              disabled={hZoom >= H_ZOOM_MAX}
              className="h-7 w-7 bg-track-accent text-sm font-bold text-white disabled:opacity-40"
            >
              +
            </button>
          </div>
          <div className="flex flex-1 items-center gap-2 bg-[#2a2a2e] px-3 py-2">
            <span className="flex-1 text-sm font-medium text-white">Zoom V: {Math.round(vZoom * 100)}%</span>
            <button
              type="button"
              onClick={() => handleZoomV(-ZOOM_STEP)}
              disabled={vZoom <= V_ZOOM_MIN}
              className="h-7 w-7 bg-track-accent text-sm font-bold text-white disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => handleZoomV(ZOOM_STEP)}
              disabled={vZoom >= V_ZOOM_MAX}
              className="h-7 w-7 bg-track-accent text-sm font-bold text-white disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
