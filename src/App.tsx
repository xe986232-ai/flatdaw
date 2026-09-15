import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { RulerBar } from './components/RulerBar'
import { TrackRow } from './components/TrackRow'
import { AutomationLane } from './components/AutomationLane'
import { Playhead } from './components/Playhead'
import { PianoRoll } from './components/PianoRoll'
import type { ClipMenuAction } from './components/ClipMenu'
import { tracks, TIMELINE_START, getTimelineEnd, type Clip, type Note } from './tracks'
import { generateNotesForClip } from './notes'
import { randomFlatColor, type FlatColor } from './colors'
import { parseFlmFile } from './flmParser'
import { flmToTracks } from './flmToTracks'

const BASE_BAR_WIDTH = 96
const BASE_ROW_HEIGHT = 56
const BASE_AUTOMATION_HEIGHT = 44
const LABEL_WIDTH = 72

// Zoom bounds — horizontal stretches clip/bar width, vertical widens track row height.
const H_ZOOM_MIN = 0.4
const H_ZOOM_MAX = 3
const V_ZOOM_MIN = 0.6
const V_ZOOM_MAX = 2.5
const ZOOM_STEP = 0.2

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const canvasBoxRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [playheadBar, setPlayheadBar] = useState(207)
  const [trackList, setTrackList] = useState(tracks)
  const [trackColors, setTrackColors] = useState<Record<string, FlatColor>>({})

  // Arrangement length now follows the actual content instead of a fixed
  // window — recomputed whenever trackList changes (e.g. right after an .flm
  // import), so a short project doesn't leave the grid mostly empty and a
  // long one doesn't get its clips squeezed together at a hard edge.
  const timelineEnd = useMemo(() => getTimelineEnd(trackList), [trackList])
  const totalBars = timelineEnd - TIMELINE_START

  // Import project .flm (FL Studio Mobile): parsing chunk EVN2 -> Track/Clip/Note flatdaw.
  const flmInputRef = useRef<HTMLInputElement>(null)
  const [flmStatus, setFlmStatus] = useState<string | null>(null)
  const [flmError, setFlmError] = useState<string | null>(null)
  const [isImportingFlm, setIsImportingFlm] = useState(false)

  // Clip context menu: which clip's menu/edit state is open, plus a one-slot clipboard for cut/copy → paste.
  const [openMenu, setOpenMenu] = useState<{ trackId: string; clipId: string } | null>(null)
  const [editingClip, setEditingClip] = useState<{ trackId: string; clipId: string } | null>(null)
  const [clipboard, setClipboard] = useState<Clip | null>(null)

  // Which clip's piano roll is currently open — replaces the whole arrangement
  // view with an in-place note editor for that clip until closed.
  const [pianoRoll, setPianoRoll] = useState<{ trackId: string; clipId: string } | null>(null)

  // Zoom: horizontal stretches bar width (clips get wider), vertical widens track row height.
  const [hZoom, setHZoom] = useState(1)
  const [vZoom, setVZoom] = useState(1)
  // Rounded to a whole pixel: this width feeds a tiled CSS background-image
  // (grid lines) repeated ~80x across the row. A fractional tile width there
  // accumulates subpixel drift over that many repeats until the lines thin
  // out and vanish well before the right edge — rounding once here keeps
  // every tile (and every clip/ruler position that uses barWidth) pixel-exact.
  const barWidth = Math.round(BASE_BAR_WIDTH * hZoom)
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

  const pianoRollTrack = pianoRoll ? trackList.find((t) => t.id === pianoRoll.trackId) : undefined
  const pianoRollClip = pianoRollTrack?.clips.find((c) => c.id === pianoRoll?.clipId)

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
    const clamped = Math.min(timelineEnd, Math.max(TIMELINE_START, bar))
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
      // Make sure the clip has note data before entering the piano roll —
      // clips authored without notes get a generated melody on first visit.
      const notes = clip.notes ?? generateNotesForClip(clip)
      setTrackList((prev) =>
        prev.map((t) =>
          t.id !== trackId ? t : { ...t, clips: t.clips.map((c) => (c.id === clipId ? { ...c, notes } : c)) },
        ),
      )
      setPianoRoll({ trackId, clipId })
      return
    }
    if (action === 'rename') {
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
      const maxStart = timelineEnd - clip.lengthBars
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
      const maxStart = timelineEnd - clip.lengthBars
      const startBar = Math.min(maxStart, clip.startBar + clip.lengthBars)
      const newClip: Clip = { ...clip, id: `${clip.id}-copy-${Date.now()}`, startBar }
      setTrackList((prev) => prev.map((t) => (t.id !== trackId ? t : { ...t, clips: [...t.clips, newClip] })))
    }
  }

  // Clicking empty grid space pastes whatever's in the clipboard at that bar position.
  const handleBackgroundClick = (trackId: string, bar: number) => {
    setOpenMenu(null)
    if (!clipboard) return
    const maxStart = timelineEnd - clipboard.lengthBars
    const snapped = Math.min(maxStart, Math.max(TIMELINE_START, Math.round(bar / 0.25) * 0.25))
    const newClip: Clip = { ...clipboard, id: `${clipboard.id}-paste-${Date.now()}`, startBar: snapped }
    setTrackList((prev) => prev.map((t) => (t.id !== trackId ? t : { ...t, clips: [...t.clips, newClip] })))
  }

  const handleNotesChange = (trackId: string, clipId: string, notes: Note[]) => {
    setTrackList((prev) =>
      prev.map((t) =>
        t.id !== trackId ? t : { ...t, clips: t.clips.map((c) => (c.id === clipId ? { ...c, notes } : c)) },
      ),
    )
  }

  const handleImportMidi = (trackId: string, clipId: string, notes: Note[], lengthBars: number) => {
    setTrackList((prev) =>
      prev.map((t) =>
        t.id !== trackId
          ? t
          : { ...t, clips: t.clips.map((c) => (c.id === clipId ? { ...c, notes, lengthBars } : c)) },
      ),
    )
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

  // Export the visible canvas box as a PNG. Note: WebCodecs (VideoEncoder/
  // AudioEncoder) only deals with video/audio frames — there's no browser
  // ImageEncoder for still PNG/JPEG export, so rasterizing the DOM to a
  // bitmap (via html-to-image, which draws into a <canvas> under the hood)
  // and downloading that is the standard/correct approach for a still image.
  const handleExportImage = async () => {
    if (!canvasBoxRef.current || isExporting) return
    setIsExporting(true)
    try {
      const dataUrl = await toPng(canvasBoxRef.current, { pixelRatio: 2, cacheBust: true })
      const link = document.createElement('a')
      link.download = `flatdaw-export-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Export gambar gagal:', err)
    } finally {
      setIsExporting(false)
    }
  }

  // Baca file .flm -> parseFlmFile (logic EVN2 parser gak diubah sama sekali)
  // -> flmToTracks -> ganti isi playlist dengan hasil parsing.
  const handleImportFlm = async (file: File) => {
    setIsImportingFlm(true)
    setFlmError(null)
    setFlmStatus(null)
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const result = parseFlmFile(bytes, file.name)
      if (!result.ok) {
        setFlmError(result.error)
        return
      }
      const { chunkResults, timelineClips, namedCount, audioClipCount } = result.data
      const mappedTracks = flmToTracks(result.data)

      setTrackList(mappedTracks)
      setTrackColors({})
      setOpenMenu(null)
      setEditingClip(null)
      setPianoRoll(null)
      setClipboard(null)

      setFlmStatus(
        `${file.name} · ${chunkResults.length} pattern` +
          (namedCount ? ` · ${namedCount} instrumen dikenali` : '') +
          (audioClipCount ? ` · ${audioClipCount} klip audio (sample) ikut kebaca` : '') +
          ` · ${timelineClips.length} clip masuk playlist`,
      )
    } catch (err) {
      console.error('Gagal membaca file .flm:', err)
      setFlmError('File .flm gak bisa dibaca. Pastikan formatnya sesuai (FL Studio Mobile project).')
    } finally {
      setIsImportingFlm(false)
    }
  }

  const handleFlmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // biar bisa pilih file yang sama lagi
    if (file) handleImportFlm(file)
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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#1a1a1d] p-4">
      {/* Landscape canvas — fixed 2292x1080, holds the whole playlist/arrangement view */}
      <div ref={canvasBoxRef} className="relative flex aspect-[2292/1080] w-full max-w-[2292px] flex-col overflow-hidden rounded-lg border border-surface-grid bg-surface-base text-white">
        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
          <RulerBar startBar={TIMELINE_START} endBar={timelineEnd} barWidth={barWidth} labelWidth={LABEL_WIDTH} />

          <div className="relative">
            {trackList.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                barWidth={barWidth}
                labelWidth={LABEL_WIDTH}
                totalBars={totalBars}
                timelineStart={TIMELINE_START}
                timelineEnd={timelineEnd}
                height={rowHeight}
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

            <AutomationLane label="Level" totalBars={totalBars} barWidth={barWidth} labelWidth={LABEL_WIDTH} height={automationHeight} />
            <AutomationLane
              label="Frequency : FX Filter"
              totalBars={totalBars}
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

        {pianoRoll && pianoRollTrack && pianoRollClip && (
          <PianoRoll
            clip={pianoRollClip}
            trackName={pianoRollTrack.name}
            trackKind={pianoRollTrack.kind}
            color={trackColors[pianoRollTrack.id]}
            timelineEnd={timelineEnd}
            onClose={() => setPianoRoll(null)}
            onNotesChange={(notes) => handleNotesChange(pianoRollTrack.id, pianoRollClip.id, notes)}
            onImportMidi={(notes, lengthBars) => handleImportMidi(pianoRollTrack.id, pianoRollClip.id, notes, lengthBars)}
          />
        )}
      </div>


      <div className="flex w-full max-w-[1280px] shrink-0 flex-col gap-2">
        <button
          type="button"
          onClick={() => flmInputRef.current?.click()}
          disabled={isImportingFlm}
          className="bg-[#3B6FA0] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isImportingFlm ? 'Mem-parsing .flm…' : 'Import Project .flm'}
        </button>
        <input ref={flmInputRef} type="file" accept=".flm" className="hidden" onChange={handleFlmInputChange} />
        {flmStatus && <div className="bg-[#1d3a2a] px-3 py-1.5 text-[12px] text-white/85">{flmStatus}</div>}
        {flmError && <div className="bg-[#5A2A2A] px-3 py-1.5 text-[12px] text-white/90">{flmError}</div>}

        <button
          type="button"
          onClick={handleRandomColors}
          className="bg-track-accent px-4 py-2 text-sm font-medium text-white"
        >
          Random Color
        </button>

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

        <button
          type="button"
          onClick={handleExportImage}
          disabled={isExporting}
          className="bg-track-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isExporting ? 'Mengekspor…' : 'Export Gambar (PNG)'}
        </button>
      </div>
    </div>
  )
}
