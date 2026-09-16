import { useRef, useState, useEffect } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { BEATS_PER_BAR, type Clip } from '../tracks'
import { buildArrangementGrid, cellsPerBar, pickActiveLayer } from '../grid'
import { AUDIO_REGION_BASE_HEX, AUDIO_REGION_COLOR, hexToRgba, lighten, type FlatColor } from '../colors'
import { WaveformCanvas } from './WaveformCanvas'

// Tampilan "Edit" khusus clip audio — niru layar edit sample di FL Studio
// Mobile (lihat referensi: waveform digambar penuh di dalam satu lajur besar
// berpatok ke grid bar/ketukan, ada satu knob bundar di ujung kanan buat
// nge-stretch sample-nya biar pas ngisi grid). Beda dari PianoRoll (buat
// clip instrument/MIDI) — ini murni buat clip yang punya sampleName/
// waveformPeaks (lihat isAudioClip di ClipBlock).
//
// Knob stretch-nya manggil `onStretch` yang sama persis dipakai knob
// kanan-bawah di ClipBlock/App.tsx (handleClipStretch) — beneran ngubah
// stretchRatio & waveformNativeSpanBars clip-nya (bukan cuma preview CSS),
// jadi hasilnya konsisten baik di-drag dari sini atau dari knob di timeline.

const BEAT_WIDTH = 64
const BAR_WIDTH = BEAT_WIDTH * BEATS_PER_BAR
const RULER_HEIGHT = 32
const LANE_HEIGHT = 220
const MIN_LENGTH_BARS = 0.125
const CLICK_THRESHOLD_PX = 4
// Berapa bar tambahan digambar di belakang ujung clip biar grid-nya
// "nerusin" kosong ke kanan (niru screenshot referensi FL Studio Mobile —
// nggak berhenti tepat di ujung clip, masih ada ruang buat narik knob).
const TRAILING_BARS = 6
const MIN_VIEW_BARS = 8

function snapBarsFor(barWidthPx: number) {
  return 1 / cellsPerBar(pickActiveLayer(barWidthPx))
}

function snapLength(bars: number, snapEnabled: boolean) {
  if (!snapEnabled) return Math.max(MIN_LENGTH_BARS, bars)
  const snapBars = snapBarsFor(BAR_WIDTH)
  return Math.max(MIN_LENGTH_BARS, Math.round(bars / snapBars) * snapBars)
}

/** Format DURASI (bukan posisi) jadi "3 bar 2 ketuk" / "3 bar" kalau pas. */
function formatDuration(bars: number): string {
  const wholeBar = Math.floor(bars)
  const beat = Math.round((bars - wholeBar) * BEATS_PER_BAR)
  return beat === 0 ? `${wholeBar} bar` : `${wholeBar} bar ${beat} ketuk`
}

export function AudioClipEditor({
  clip,
  trackName,
  color,
  bpm,
  snapEnabled = true,
  onClose,
  onStretch,
}: {
  clip: Clip
  trackName: string
  color?: FlatColor
  bpm?: number
  snapEnabled?: boolean
  onClose: () => void
  // Commit time-stretch beneran (resample) — lihat handleClipStretch di App.tsx.
  onStretch: (newLengthBars: number) => void
}) {
  const [previewLength, setPreviewLength] = useState<number | null>(null)
  const dragInfo = useRef<{ originClientX: number; originLength: number; moved: boolean } | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const effectiveLengthBars = previewLength ?? clip.lengthBars
  const nativeSpanBars = clip.waveformNativeSpanBars
  const isLoopedClip = !!clip.loopPoints && clip.loopPoints.length > 0
  const hasNative = !!nativeSpanBars && nativeSpanBars > 0.001

  const viewBars = Math.max(MIN_VIEW_BARS, Math.ceil(effectiveLengthBars) + TRAILING_BARS)
  const laneWidth = viewBars * BAR_WIDTH
  const regionWidth = effectiveLengthBars * BAR_WIDTH

  const grid = buildArrangementGrid(BAR_WIDTH)
  // Sama konvensi warna kayak ClipBlock: badan clip semi-transparan (0.88
  // alpha), strip judul solid & lebih terang. Base hex-nya dari warna
  // track kalau ada, jatuh balik ke ungu indigo AUDIO_REGION_BASE_HEX.
  const baseHex = color ? color.fill : AUDIO_REGION_BASE_HEX
  const regionInk = color ? color.ink : AUDIO_REGION_COLOR.ink
  const regionFill = hexToRgba(baseHex, 0.88)
  const headerFill = lighten(baseHex, 0.28)

  const stretchPct = hasNative ? Math.round((effectiveLengthBars / nativeSpanBars!) * 100) : 100

  function handleKnobPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragInfo.current = { originClientX: e.clientX, originLength: clip.lengthBars, moved: false }
    setPreviewLength(clip.lengthBars)
  }

  function handleKnobPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const info = dragInfo.current
    if (!info) return
    const deltaPx = e.clientX - info.originClientX
    if (Math.abs(deltaPx) > CLICK_THRESHOLD_PX) info.moved = true
    const deltaBars = deltaPx / BAR_WIDTH
    const rawLength = Math.max(MIN_LENGTH_BARS, info.originLength + deltaBars)
    setPreviewLength(snapLength(rawLength, snapEnabled))
  }

  function endKnobDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const info = dragInfo.current
    if (!info) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragInfo.current = null
    setPreviewLength((len) => {
      if (info.moved && len != null && len !== clip.lengthBars) onStretch(len)
      return null
    })
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-surface-base text-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-surface-grid/40 bg-[#202024] px-4 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm bg-track-accent px-3 text-sm font-medium text-white"
        >
          ← Kembali
        </button>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">{clip.label || clip.sampleName || 'Untitled'}</span>
          <span className="truncate text-[11px] text-white/50">
            {trackName} · Stretch {stretchPct}% {bpm ? `· ${bpm} BPM` : ''}
          </span>
        </div>
        <span className="shrink-0 text-[11px] text-white/40">{formatDuration(effectiveLengthBars)}</span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto p-4">
        <div className="relative" style={{ width: laneWidth }}>
          {/* Ruler */}
          <div
            className="sticky top-0 z-20 rounded-t-sm border-b border-surface-grid/40 bg-[#202024]"
            style={{ width: laneWidth, height: RULER_HEIGHT }}
          >
            {Array.from({ length: viewBars }).map((_, i) => (
              <span
                key={i}
                className="absolute top-1/2 -translate-y-1/2 text-[11px] font-medium text-white/60"
                style={{ left: i * BAR_WIDTH + 6 }}
              >
                {i + 1}
              </span>
            ))}
          </div>

          {/* Lajur waveform, berpatok ke grid bar/ketukan sepenuhnya */}
          <div
            className="relative rounded-b-sm"
            style={{
              width: laneWidth,
              height: LANE_HEIGHT,
              backgroundColor: '#16161a',
              backgroundImage: grid.backgroundImage,
              backgroundSize: grid.backgroundSize,
              backgroundRepeat: grid.backgroundRepeat,
            }}
          >
            {/* Region clip: badan + header, isinya waveform beneran (WaveformCanvas
                sama persis komponen yang dipakai di timeline) — stretchToFit
                selalu true di sini, karena lajur ini KHUSUS buat nge-preview
                gimana hasilnya kalau di-stretch pas ngisi grid. */}
            <div
              className="absolute inset-y-3 left-0 flex flex-col overflow-hidden rounded-[4px]"
              style={{ width: Math.max(2, regionWidth), backgroundColor: regionFill, color: regionInk }}
            >
              <div
                className="shrink-0 truncate px-2 py-0.5 text-[11px] font-medium leading-none"
                style={{ backgroundColor: headerFill, color: regionInk }}
              >
                {clip.label || clip.sampleName}
              </div>
              <div className="relative min-h-0 flex-1 pt-1 pb-1 pr-1">
                {clip.waveformPeaks ? (
                  <WaveformCanvas
                    peaks={clip.waveformPeaks}
                    multiRes={clip.waveformMultiRes}
                    lengthBars={effectiveLengthBars}
                    nativeSpanBars={nativeSpanBars}
                    loop={isLoopedClip}
                    stretchToFit
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-white/50">
                    Sample belum ke-decode
                  </div>
                )}
              </div>
            </div>

            {/* Garis putus-putus penanda panjang ASLI sample (sebelum di-stretch) —
                cuma ditampilin kalau bedanya beneran keliatan, biar user tau
                seberapa jauh dia narik knob dari ukuran natural sample-nya. */}
            {hasNative && Math.abs(nativeSpanBars! - effectiveLengthBars) > 0.01 && nativeSpanBars! < viewBars && (
              <div
                className="pointer-events-none absolute top-3 bottom-3 border-l-2 border-dashed border-white/40"
                style={{ left: nativeSpanBars! * BAR_WIDTH }}
              >
                <span className="absolute -top-4 left-1 whitespace-nowrap text-[10px] text-white/40">asli</span>
              </div>
            )}

            {/* Knob Stretch — satu-satunya kontrol di sini, niru knob kanan-bawah
                di FL Studio Mobile: geser kanan/kiri buat manjangin/mendekin
                clip, berpatok ke grid (snap sama persis kayak timeline). */}
            <div
              data-clip-interactive="true"
              className="absolute z-30 flex h-9 w-9 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full border-2 border-black/20 shadow-md"
              style={{ left: regionWidth, top: LANE_HEIGHT / 2, backgroundColor: 'rgba(255,255,255,0.95)' }}
              onPointerDown={handleKnobPointerDown}
              onPointerMove={handleKnobPointerMove}
              onPointerUp={endKnobDrag}
              onPointerCancel={endKnobDrag}
            >
              <span className="text-[10px] font-semibold text-black/70">↔</span>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-surface-grid/40 bg-[#202024] px-4 py-2 text-[11px] text-white/50">
        Tarik knob bundar di ujung kanan waveform buat stretch sample-nya biar pas ngisi grid — sama kayak knob
        stretch di timeline, cuma di sini kebaca lebih detail.
      </div>
    </div>
  )
}
