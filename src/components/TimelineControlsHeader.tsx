import { useEffect, useRef, useState } from 'react'
import { BEATS_PER_BAR } from '../tracks'
import { MAX_LAYER, cellsPerBar, pickActiveLayer } from '../grid'

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-[1px]">
      <path d="M6 4 L20 12 L6 20 Z" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path d="M6 4h4v16H6V4Zm8 0h4v16h-4V4Z" fill="currentColor" />
    </svg>
  )
}

function SnapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
      <path
        d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
      <path
        d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.1 5.9l-1.5 1.5M7.4 16.6l-1.5 1.5M18.1 18.1l-1.5-1.5M7.4 7.4 5.9 5.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Bulatkan posisi (dalam satuan bar) ke kelipatan beat terdekat pada lapisan grid aktif. */
function snapBarToActiveLayer(bar: number, barWidth: number): number {
  const layer = pickActiveLayer(barWidth)
  const cells = cellsPerBar(layer)
  return Math.round(bar * cells) / cells
}

function formatBarBeat(bar: number, timelineStart: number): string {
  const relative = bar - timelineStart
  const wholeBar = Math.floor(relative)
  const beat = Math.round((relative - wholeBar) * BEATS_PER_BAR)
  return `bilah ${wholeBar + 1} ketukan ${beat + 1}`
}

/** Marker siklus/loop: strip yang bisa digeser dan diresize buat nentuin area loop. */
function CycleMarker({
  loopStartBar,
  loopEndBar,
  timelineStart,
  timelineEnd,
  barWidth,
  snapEnabled,
  enabled,
  onChange,
}: {
  loopStartBar: number
  loopEndBar: number
  timelineStart: number
  timelineEnd: number
  barWidth: number
  snapEnabled: boolean
  enabled: boolean
  onChange: (start: number, end: number) => void
}) {
  const MIN_LEN = 1 / BEATS_PER_BAR

  const snap = (bar: number) => (snapEnabled ? snapBarToActiveLayer(bar, barWidth) : bar)

  const dragHandle = (kind: 'move' | 'start' | 'end') => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const startClientX = e.clientX
    const startLoopStart = loopStartBar
    const startLoopEnd = loopEndBar

    const move = (ev: PointerEvent) => {
      const deltaBar = (ev.clientX - startClientX) / barWidth

      if (kind === 'move') {
        const len = startLoopEnd - startLoopStart
        let newStart = snap(startLoopStart + deltaBar)
        newStart = Math.min(Math.max(newStart, timelineStart), timelineEnd - len)
        onChange(newStart, newStart + len)
      } else if (kind === 'start') {
        let newStart = snap(startLoopStart + deltaBar)
        newStart = Math.min(Math.max(newStart, timelineStart), loopEndBar - MIN_LEN)
        onChange(newStart, loopEndBar)
      } else {
        let newEnd = snap(startLoopEnd + deltaBar)
        newEnd = Math.max(Math.min(newEnd, timelineEnd), loopStartBar + MIN_LEN)
        onChange(loopStartBar, newEnd)
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const left = (loopStartBar - timelineStart) * barWidth
  const width = (loopEndBar - loopStartBar) * barWidth

  return (
    <div
      className="absolute top-0.5 h-4"
      style={{ left, width }}
    >
      <div
        className={`group relative h-full rounded-full transition-colors ${
          enabled ? 'bg-track-accent/70' : 'bg-track-accent/25'
        }`}
      >
        <span className="sr-only">
          Penanda siklus ini memungkinkan kamu untuk mengatur area loop. Gunakan handel untuk
          menyesuaikan titik awal dan akhir, atau seret bagian tengah untuk memindahkan seluruh
          area.
        </span>

        <div
          role="slider"
          aria-label="Geser dan atur siklus"
          aria-valuemin={0}
          aria-valuemax={999}
          aria-valuenow={Math.round(loopStartBar - timelineStart)}
          aria-valuetext={`Siklus dimulai pada ${formatBarBeat(loopStartBar, timelineStart)} dan berakhir pada ${formatBarBeat(loopEndBar, timelineStart)}`}
          tabIndex={0}
          onPointerDown={dragHandle('move')}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        />

        <div
          role="slider"
          aria-label="Atur bagian awal siklus"
          aria-valuemin={0}
          aria-valuemax={999}
          aria-valuenow={Math.round(loopStartBar - timelineStart)}
          aria-valuetext={`Siklus dimulai pada ${formatBarBeat(loopStartBar, timelineStart)}`}
          tabIndex={0}
          onPointerDown={dragHandle('start')}
          className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-track-accent bg-white"
        />

        <div
          role="slider"
          aria-label="Atur bagian akhir siklus"
          aria-valuemin={0}
          aria-valuemax={999}
          aria-valuenow={Math.round(loopEndBar - timelineStart)}
          aria-valuetext={`Siklus berakhir pada ${formatBarBeat(loopEndBar, timelineStart)}`}
          tabIndex={0}
          onPointerDown={dragHandle('end')}
          className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-track-accent bg-white"
        />
      </div>
    </div>
  )
}

/** Ruler ketukan berbasis canvas — gambar garis bar/beat + nomor bar. */
function BeatRulerCanvas({
  startBar,
  endBar,
  barWidth,
}: {
  startBar: number
  endBar: number
  barWidth: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bars = endBar - startBar
  const cssWidth = bars * barWidth
  const cssHeight = 32

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)

    const layer = pickActiveLayer(barWidth)
    const beatsPerBarLine = cellsPerBar(Math.min(layer, MAX_LAYER)) / bars || 1
    void beatsPerBarLine

    ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255, 255, 255, 1)' // angka durasi/bar — putih
    ctx.strokeStyle = 'rgba(58, 58, 64, 0.9)'

    for (let i = 0; i <= bars; i++) {
      const x = i * barWidth
      const isBar4 = i % 4 === 0
      ctx.lineWidth = isBar4 ? 1.4 : 1
      ctx.beginPath()
      ctx.moveTo(x + 0.5, isBar4 ? 10 : 18)
      ctx.lineTo(x + 0.5, cssHeight - 6)
      ctx.stroke()

      if (isBar4 && i < bars) {
        ctx.fillText(String(startBar + i), x + 6, 14)
      }

      // Sub-beat tick di dalam bar, cuma kalau kolomnya masih cukup lega.
      if (i < bars && barWidth / BEATS_PER_BAR >= 10) {
        ctx.lineWidth = 0.75
        ctx.strokeStyle = 'rgba(58, 58, 64, 0.6)'
        for (let b = 1; b < BEATS_PER_BAR; b++) {
          const bx = x + (barWidth / BEATS_PER_BAR) * b
          ctx.beginPath()
          ctx.moveTo(bx + 0.5, cssHeight - 12)
          ctx.lineTo(bx + 0.5, cssHeight - 6)
          ctx.stroke()
        }
        ctx.strokeStyle = 'rgba(58, 58, 64, 0.9)'
      }
    }
  }, [startBar, endBar, barWidth, bars, cssWidth])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Timeline ruler"
      className="block"
      style={{ width: cssWidth, height: cssHeight }}
    />
  )
}

// Berapa lama harus ditahan (ms) di card ruler sebelum gesture "bikin area
// loop baru" aktif, dan seberapa jauh pointer boleh geser (px) sebelum itu
// dianggap batal (misal orang cuma mau scroll/pan, bukan nahan).
const LOOP_CREATE_HOLD_MS = 220
const LOOP_CREATE_CANCEL_PX = 6

export function TimelineControlsHeader({
  startBar,
  endBar,
  barWidth,
  labelWidth,
  loopStartBar,
  loopEndBar,
  loopEnabled,
  snapEnabled,
  onLoopChange,
  onLoopCreate,
  onToggleLoop,
  onToggleSnap,
  onPlayClick,
  isPlaying = false,
  bpm,
}: {
  startBar: number
  endBar: number
  barWidth: number
  labelWidth: number
  loopStartBar: number | null
  loopEndBar: number | null
  loopEnabled: boolean
  snapEnabled: boolean
  onLoopChange: (start: number, end: number) => void
  onLoopCreate: (start: number, end: number) => void
  onToggleLoop: () => void
  onToggleSnap: () => void
  onPlayClick?: () => void
  isPlaying?: boolean
  bpm?: number
}) {
  // Preview area loop yang lagi dibikin lewat gesture tahan-lalu-drag —
  // null kalau gak lagi ada gesture bikin-baru yang aktif.
  const [draftLoop, setDraftLoop] = useState<{ start: number; end: number } | null>(null)

  const snapBar = (bar: number) => (snapEnabled ? snapBarToActiveLayer(bar, barWidth) : bar)

  // Ruler cuma bikin area loop baru kalau user NAHAN dulu (biar gak
  // ke-trigger gak sengaja pas tap/scroll biasa), baru drag ke arah yang
  // dimau buat nentuin rentangnya. Klik-lepas cepat (tanpa nahan) gak ngapa-
  // ngapain. Drag handle/badan loop yang udah ada (CycleMarker) stopPropagation
  // duluan jadi gesture ini gak kepicu pas nyeret marker yang udah ada.
  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const startClientX = e.clientX
    const startClientY = e.clientY
    let active = false
    let originBar = startBar

    const activate = () => {
      active = true
      const bar = snapBar(startBar + (startClientX - rect.left) / barWidth)
      originBar = Math.min(Math.max(bar, startBar), endBar)
      setDraftLoop({ start: originBar, end: originBar })
    }

    const holdTimer = window.setTimeout(activate, LOOP_CREATE_HOLD_MS)

    const handleMove = (ev: PointerEvent) => {
      if (!active) {
        const dx = Math.abs(ev.clientX - startClientX)
        const dy = Math.abs(ev.clientY - startClientY)
        if (dx > LOOP_CREATE_CANCEL_PX || dy > LOOP_CREATE_CANCEL_PX) cleanup()
        return
      }
      const bar = snapBar(startBar + (ev.clientX - rect.left) / barWidth)
      const clamped = Math.min(Math.max(bar, startBar), endBar)
      setDraftLoop({ start: Math.min(originBar, clamped), end: Math.max(originBar, clamped) })
    }

    const handleUp = () => {
      if (active) {
        setDraftLoop((current) => {
          const MIN_LEN = 1 / BEATS_PER_BAR
          if (current && current.end - current.start >= MIN_LEN) {
            onLoopCreate(current.start, current.end)
          }
          return null
        })
      }
      cleanup()
    }

    const cleanup = () => {
      window.clearTimeout(holdTimer)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      if (!active) setDraftLoop(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }

  return (
    <div className="sticky top-0 z-20 box-border flex h-12 items-stretch border-b border-surface-grid/60 bg-surface-panel">
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center justify-center gap-1 border-r border-surface-grid/60 bg-surface-panel"
        style={{ width: labelWidth }}
      >
        <button
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
          onClick={onPlayClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-track-accent text-white"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        {typeof bpm === 'number' && (
          <span className="text-[10px] font-medium tabular-nums text-white/70">{bpm} BPM</span>
        )}
      </div>

      <div
        className="sticky top-0 z-20 relative shrink-0 touch-none rounded-t-md border-b border-surface-grid/60 bg-surface-panel"
        style={{ width: (endBar - startBar) * barWidth }}
        onPointerDown={handleRulerPointerDown}
      >
        {/* Area loop yang udah tersimpan — cuma dirender kalau ada (gak ada
            default lagi) dan lagi gak dalam proses bikin area baru. */}
        {loopStartBar !== null && loopEndBar !== null && !draftLoop && (
          <CycleMarker
            loopStartBar={loopStartBar}
            loopEndBar={loopEndBar}
            timelineStart={startBar}
            timelineEnd={endBar}
            barWidth={barWidth}
            snapEnabled={snapEnabled}
            enabled={loopEnabled}
            onChange={onLoopChange}
          />
        )}

        {/* Preview area loop yang lagi dibikin (nahan lalu drag) — strip putus-
            putus, belum final sampe pointer dilepas. */}
        {draftLoop && (
          <div
            className="pointer-events-none absolute top-0.5 h-4 rounded-full border-2 border-dashed border-track-accent bg-track-accent/40"
            style={{
              left: (draftLoop.start - startBar) * barWidth,
              width: Math.max(2, (draftLoop.end - draftLoop.start) * barWidth),
            }}
          />
        )}

        <div className="absolute bottom-0 left-0">
          <BeatRulerCanvas startBar={startBar} endBar={endBar} barWidth={barWidth} />
        </div>
      </div>

      {/* Grid controls — dipin di kanan atas, di luar area yang ikut discroll horizontal. */}
      <div className="sticky right-0 z-10 ml-auto flex shrink-0 items-center gap-1 border-l border-surface-grid/60 bg-surface-panel px-2">
        <button
          type="button"
          role="switch"
          aria-checked={loopEnabled}
          aria-label="Aktifkan mode siklus"
          onClick={onToggleLoop}
          className={`flex h-7 items-center rounded-full px-2 text-[10px] font-medium transition-colors ${
            loopEnabled ? 'bg-track-accent text-white' : 'bg-surface-base text-white/50'
          }`}
        >
          Loop
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={snapEnabled}
          aria-label="Lompat ke grid"
          onClick={onToggleSnap}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            snapEnabled ? 'bg-track-accent text-white' : 'bg-surface-base text-white/50'
          }`}
        >
          <SnapIcon />
        </button>
        <button
          type="button"
          aria-expanded={false}
          aria-label="Pengaturan grid"
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:text-white"
        >
          <SettingsIcon />
        </button>
      </div>
    </div>
  )
}
