import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { BEATS_PER_BAR, type Clip, type Note, type TrackKind } from '../tracks'
import { cellsPerBar, pickActiveLayer } from '../grid'
import { AUDIO_REGION_BASE_HEX, AUDIO_REGION_COLOR, hexToRgba, lighten, type FlatColor } from '../colors'
import { ClipMenu, type ClipMenuAction } from './ClipMenu'
import { WaveformCanvas } from './WaveformCanvas'

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
    // absolute + inset-0 (bukan relative + w-full/h-full) sengaja: elemen
    // absolute mengacu ke PADDING BOX ancestor `position: relative` terdekat
    // (parent-nya, lihat ClipBlock — div `px-2` di sekitar sini), yang
    // artinya kotak ini bentang PENUH termasuk area padding kiri/kanan-nya,
    // BUKAN cuma content-box yang udah kepotong px-2. Kalau dulu (relative +
    // w-full biasa, elemen normal-flow) kotak referensi 0%-100% jadi lebih
    // sempit 16px (8px tiap sisi) drpd lebar clip yang beneran sejajar grid,
    // jadi tiap note ketarik sesuai posisi sepanjang totalBeats: yang dekat
    // awal clip ketarik ke kanan (jadi kayak "telat" dibanding grid), yang
    // dekat akhir clip ketarik ke kiri ("keduluan") — makin lebar
    // padding relatif terhadap clip (clip pendek/sempit), makin kentara.
    // Absolute+inset-0 di sini bikin 0%-100% pas persis sama lebar clip asli
    // (effectiveLengthBars * barWidth), jadi hasilnya sama-sama akurat kayak
    // urutan/posisi note di dalam Piano Roll.
    <div className="absolute inset-0 opacity-90">
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
    // Lebih banyak bar (90, dari 40) + gap lebih tipis buat kesan lebih
    // padet. Tinggi tiap bar sekarang gabungan 2 gelombang sinus beda
    // frekuensi (biar ada bentuk "envelope" naik-turun kayak amplitudo
    // audio asli, bukan garis lurus) plus noise per-bar dari seeded(),
    // dan makein `seed` (sebelumnya diterima tapi gak dipakai di cabang
    // ini) biar tiap clip punya bentuk unik sendiri, bukan pola identik
    // yang diulang persis sama di semua clip audio.
    const count = 90
    return (
      <div className="flex h-4 w-full items-end gap-[1px] overflow-hidden">
        {Array.from({ length: count }).map((_, i) => {
          const envelope = Math.sin(i * 0.35 + seed) * Math.sin(i * 0.06 + seed * 0.31)
          const noise = seeded(i, seed)
          const h = 14 + Math.abs(envelope) * 58 + noise * 28
          return (
            <span
              key={i}
              className="flex-1 rounded-[0.5px]"
              style={{
                height: `${Math.min(100, Math.max(8, h))}%`,
                backgroundColor: 'currentColor',
                opacity: 0.5 + noise * 0.4,
              }}
            />
          )
        })}
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

const CLICK_THRESHOLD_PX = 4 // pointer movement below this counts as a tap, not a drag
const MIN_CLIP_LENGTH_BARS = 0.25 // clip can't be resized/stretched shorter than this

// Snap size (in bars) for the grid layer that's ACTUALLY drawn on screen at
// this barWidth — same pickActiveLayer/cellsPerBar the background grid lines
// (buildArrangementGrid) and the loop/cycle marker (TimelineControlsHeader)
// already use. Used to be a fixed 0.25 bar (1 beat) regardless of zoom, so
// once you zoomed in far enough for the grid to show finer subdivisions
// (1/8, 1/16, ...), dragging/trimming/stretching a clip still only snapped
// to those 4 beat lines per bar instead of every line actually on screen.
function activeSnapBars(barWidth: number) {
  return 1 / cellsPerBar(pickActiveLayer(barWidth))
}

function snapLength(bars: number, barWidth: number, snapEnabled: boolean) {
  if (!snapEnabled) return Math.max(MIN_CLIP_LENGTH_BARS, bars)
  const snapBars = activeSnapBars(barWidth)
  return Math.max(MIN_CLIP_LENGTH_BARS, Math.round(bars / snapBars) * snapBars)
}

type ResizeKind = 'left' | 'right' | 'stretch'

// Knob bundar putih dipakai buat 3 handle resize/stretch di tepi clip audio
// (lihat gambar referensi: kiri = panjangin ke kiri, kanan = panjangin ke
// kanan, kanan-bawah = time-stretch). Bukan cuma dekorasi — tiap knob punya
// pointer handler sendiri yang beneran ngubah startBar/lengthBars/
// stretchRatio clip-nya (lihat handlePointerDown di bawah).
function ResizeKnob({
  className = '',
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  className?: string
  style?: CSSProperties
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      data-clip-interactive="true"
      className={`absolute z-40 h-7 w-7 shrink-0 cursor-ew-resize touch-none rounded-full border border-black/10 shadow-sm ${className}`}
      style={{ backgroundColor: 'rgba(255,255,255,0.95)', ...style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => e.stopPropagation()}
    />
  )
}

/** Format posisi (dalam bar, relatif ke timelineStart) jadi "bilah X ketukan Y". */
function formatBarBeat(bar: number): string {
  const wholeBar = Math.floor(bar)
  const beat = Math.round((bar - wholeBar) * BEATS_PER_BAR)
  return `bilah ${wholeBar + 1} ketukan ${beat + 1}`
}

export function ClipBlock({
  clip,
  kind,
  barWidth,
  timelineStart,
  timelineEnd,
  trackName,
  color,
  isMenuOpen = false,
  isEditing = false,
  flipMenuDown = false,
  onStartBarChange,
  onClipClick,
  onMenuAction,
  onRenameCommit,
  onResizeLeft,
  onResizeRight,
  onStretch,
  snapEnabled = true,
}: {
  clip: Clip
  kind: TrackKind
  barWidth: number
  timelineStart: number
  timelineEnd: number
  trackName?: string
  color?: FlatColor
  isMenuOpen?: boolean
  isEditing?: boolean
  flipMenuDown?: boolean
  onStartBarChange?: (clipId: string, newStartBar: number) => void
  onClipClick?: (clipId: string) => void
  onMenuAction?: (clipId: string, action: ClipMenuAction) => void
  onRenameCommit?: (clipId: string, label: string) => void
  // Knob kiri: geser tepi kiri clip (startBar berubah, tepi kanan diem).
  onResizeLeft?: (clipId: string, newStartBar: number, newLengthBars: number) => void
  // Knob kanan: geser tepi kanan clip (cuma lengthBars berubah).
  onResizeRight?: (clipId: string, newLengthBars: number) => void
  // Knob kanan-bawah: time-stretch beneran — bukan cuma manjangin
  // penempatan, tapi juga ngubah stretchRatio clip-nya (lihat handleStretch
  // di App.tsx) biar audio-nya "dimuluskan" ngisi penuh durasi baru.
  onStretch?: (clipId: string, newLengthBars: number) => void
  // Sama toggle "Snap" yang ada di header timeline (dipakai jg buat loop
  // marker) — kalau false, drag/trim/stretch clip gerak bebas 1:1 sama
  // pointer (cuma di-clamp batas kiri/kanan, gak dibulatkan ke grid sama
  // sekali).
  snapEnabled?: boolean
}) {
  const [dragStartBar, setDragStartBar] = useState<number | null>(null)
  const dragInfo = useRef<{ originClientX: number; originStartBar: number; moved: boolean } | null>(null)

  // Preview live selama knob resize/stretch lagi di-drag — dipisah dari
  // dragStartBar (yang khusus buat drag-pindah posisi clip) biar dua gesture
  // ini gak saling ganggu state satu sama lain.
  const [resizePreview, setResizePreview] = useState<{ startBar: number; lengthBars: number } | null>(null)
  const resizeInfo = useRef<{ kind: ResizeKind; originClientX: number; originStartBar: number; originLengthBars: number } | null>(null)

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

  const effectiveStartBar = dragStartBar ?? resizePreview?.startBar ?? clip.startBar
  const effectiveLengthBars = resizePreview?.lengthBars ?? clip.lengthBars
  const left = (effectiveStartBar - timelineStart) * barWidth
  const width = effectiveLengthBars * barWidth
  const seed = clip.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)

  const minStart = timelineStart
  const maxStart = timelineEnd - clip.lengthBars

  function snap(bar: number) {
    if (!snapEnabled) return Math.min(maxStart, Math.max(minStart, bar))
    const snapBars = activeSnapBars(barWidth)
    const snapped = Math.round(bar / snapBars) * snapBars
    return Math.min(maxStart, Math.max(minStart, snapped))
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (isEditing) return
    e.stopPropagation()
    // Belum diseleksi (outline putih belum nongol) -> tap ini cuma buat
    // nyeleksi clip-nya dulu (lihat onClick di bawah), belum boleh nge-drag.
    // Baru gesture berikutnya (pas udah keseleksi / isMenuOpen true) yang
    // boleh mulai geser posisi clip.
    if (!isMenuOpen) return
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

  // Handler bersama buat ketiga knob (left/right/stretch) — sengaja disatuin
  // di sini (bukan 3 fungsi kepisah) karena matematikanya cuma beda di titik
  // mana yang dianggap "tepi diem" (left knob: tepi kanan diem, right &
  // stretch knob: tepi kiri/startBar diem).
  function startResize(kind: ResizeKind) {
    return (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      resizeInfo.current = { kind, originClientX: e.clientX, originStartBar: clip.startBar, originLengthBars: clip.lengthBars }
      setResizePreview({ startBar: clip.startBar, lengthBars: clip.lengthBars })
    }
  }

  function handleResizeMove(e: ReactPointerEvent<HTMLDivElement>) {
    const info = resizeInfo.current
    if (!info) return
    const deltaBars = (e.clientX - info.originClientX) / barWidth

    if (info.kind === 'left') {
      // Tepi kanan (originStartBar + originLengthBars) diem, tepi kiri yang
      // gerak — geser knob ke kiri = clip manjang ke kiri, ke kanan = clip
      // memendek dari kiri.
      const rightEdge = info.originStartBar + info.originLengthBars
      const rawStart = info.originStartBar + deltaBars
      const clampedStart = Math.min(rightEdge - MIN_CLIP_LENGTH_BARS, Math.max(timelineStart, rawStart))
      const snapBars = activeSnapBars(barWidth)
      const snappedStart = snapEnabled ? Math.round(clampedStart / snapBars) * snapBars : clampedStart
      const newStartBar = Math.min(rightEdge - MIN_CLIP_LENGTH_BARS, Math.max(timelineStart, snappedStart))
      setResizePreview({ startBar: newStartBar, lengthBars: rightEdge - newStartBar })
      return
    }

    // 'right' dan 'stretch' sama-sama cuma manjangin/mendekin dari tepi
    // kanan — bedanya cuma di commit (lihat endResize / onStretch di
    // App.tsx), bukan di gesture drag-nya.
    const maxLength = timelineEnd - info.originStartBar
    const rawLength = info.originLengthBars + deltaBars
    const newLengthBars = snapLength(Math.min(maxLength, Math.max(MIN_CLIP_LENGTH_BARS, rawLength)), barWidth, snapEnabled)
    setResizePreview({ startBar: info.originStartBar, lengthBars: newLengthBars })
  }

  function endResize(e: ReactPointerEvent<HTMLDivElement>) {
    const info = resizeInfo.current
    if (!info) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    resizeInfo.current = null
    setResizePreview((preview) => {
      if (preview) {
        if (info.kind === 'left') onResizeLeft?.(clip.id, preview.startBar, preview.lengthBars)
        else if (info.kind === 'right') onResizeRight?.(clip.id, preview.lengthBars)
        else onStretch?.(clip.id, preview.lengthBars)
      }
      return null
    })
  }

  const regionLabel = clip.label || 'Untitled'
  const ariaLabel = trackName ? `${regionLabel} region on track ${trackName}` : `${regionLabel} region`

  // Klip audio asli (punya sampleName) dulu selalu dipaksa ungu indigo tetap,
  // gak ikut warna track yang di-random lewat tombol "Random Color". Sekarang
  // audio clip juga ikutan kena random color kayak clip instrument — indigo
  // (AUDIO_REGION_COLOR) cuma jadi fallback kalau track-nya belum pernah
  // di-random-in warnanya sama sekali (color masih undefined).
  const isAudioClip = !!clip.sampleName
  // Sama persis logika `hasNativeSpan` di WaveformCanvas — dipakai di sini
  // cuma buat nentuin apa item menu "Fit Waveform" perlu ditampilin (clip
  // one-shot yang beneran nyisa celah blank), bukan buat gambar apa pun.
  const isLoopedClip = !!clip.loopPoints && clip.loopPoints.length > 0
  const hasWaveformGap =
    isAudioClip &&
    !isLoopedClip &&
    !!clip.waveformNativeSpanBars &&
    clip.waveformNativeSpanBars > 0.001 &&
    effectiveLengthBars > clip.waveformNativeSpanBars + 0.001
  // Opacity clip audio sekarang disamain sama clip instrument (0.88) —
  // sebelumnya audio dipaksa lebih transparan (0.55), sekarang ngikutin
  // opacity track instrument biar konsisten.
  const CLIP_FILL_ALPHA = 0.88
  const effectiveColor = color
    ? { fill: hexToRgba(color.fill, CLIP_FILL_ALPHA), ink: color.ink }
    : isAudioClip
      ? AUDIO_REGION_COLOR
      : color

  // Warna header (strip judul) — solid 100% opacity, lebih terang dari fill
  // body (yang semi-transparan). Niru tampilan Soundtrap: strip judul di atas
  // clip kepisah jelas dari badan clip karena kepucetan warnanya, bukan
  // karena garis. Base hex-nya diambil dari warna aslinya sebelum di-alpha.
  const headerFill = color
    ? lighten(color.fill, 0.28)
    : isAudioClip
      ? lighten(AUDIO_REGION_BASE_HEX, 0.28)
      : undefined
  const headerInk = effectiveColor?.ink

  return (
    <div
      data-clip-interactive="true"
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={999}
      aria-valuenow={Math.round(effectiveStartBar - timelineStart)}
      aria-valuetext={`Area dimulai pada ${formatBarBeat(effectiveStartBar - timelineStart)} dan berakhir pada ${formatBarBeat(effectiveStartBar - timelineStart + effectiveLengthBars)}`}
      className={`absolute top-0 bottom-0 flex touch-none select-none flex-col rounded-[3px] ${
        // overflow-visible SEBELUMNYA selalu nyala gak peduli kondisi apa pun
        // — niatnya biar 3 ResizeKnob di bawah (yang emang ditaro nongol
        // separo keluar batas kiri/kanan/bawah clip, cuma dirender pas
        // isMenuOpen && isAudioClip) tetep kelihatan penuh gak kepotong.
        // Masalahnya: overflow-visible itu ngaruh ke SEMUA anak elemen
        // sepanjang waktu, termasuk strip judul (header, px-2 + teks) yang
        // harusnya nempel pas di batas clip — begitu clip-nya sempit banget
        // (zoom H kecil / clip pendek), padding+teks header itu jadi nembus
        // keluar batas box tanpa ke-potong, keliatan kayak "header-nya lebih
        // lebar dari track-nya". Sekarang overflow cuma dilepas (visible)
        // pas menu clip lagi kebuka (isMenuOpen) — itu-itu doang saat knob
        // resize-nya beneran perlu nongol keluar — selain itu overflow-hidden,
        // jadi header (dan apa pun di dalam) selalu ke-potong pas batas clip.
        isMenuOpen ? 'overflow-visible' : 'overflow-hidden'
      } ${
        effectiveColor ? '' : `${fillByKind[kind]} ${inkByKind[kind]}`
      } ${
        dragStartBar != null ? 'z-20 cursor-grabbing brightness-105' : isMenuOpen ? 'cursor-grab' : 'cursor-pointer'
      } ${isMenuOpen ? 'z-30 ring-2 ring-white' : ''}`}
      style={{ left, width, backgroundColor: effectiveColor?.fill, color: effectiveColor?.ink }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(e) => {
        e.stopPropagation()
        // Kalau belum keseleksi, tap ini yang nyeleksi (munculin outline +
        // menu). Kalau udah keseleksi, toggle-nya sudah ditangani lewat
        // endDrag di atas (pointer up tanpa gerak), jadi di sini cukup diem.
        if (!isMenuOpen) onClipClick?.(clip.id)
      }}
    >
      {clip.loopPoints && clip.loopPoints.length > 0 && (
        // Goresan kecil di titik loop — niru tampilan FL Studio Mobile pas
        // pattern-nya diulang buat ngisi penempatan yang lebih panjang.
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0">
          {clip.loopPoints.map((bar, idx) => (
            <span
              key={idx}
              className="absolute -translate-x-1/2"
              style={{
                left: `${(bar / effectiveLengthBars) * 100}%`,
                top: 0,
                width: 0,
                height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: '6px solid rgba(0,0,0,0.5)',
              }}
            />
          ))}
        </div>
      )}
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
          className="sticky left-2 z-30 mx-2 mt-1 mb-1 w-[calc(100%-1rem)] min-w-0 max-w-full shrink-0 rounded-sm border border-black/30 bg-white/95 px-1 text-[11px] font-medium leading-tight text-black outline-none"
        />
      ) : (
        clip.label && (
          // Strip judul (header) sekarang berupa blok warna solid 100% opacity
          // yang narik penuh selebar clip (bukan cuma garis di bawah teks) —
          // niru header kolom di Soundtrap. Lebih terang dari badan clip di
          // bawahnya (lihat headerFill), jadi kepisah jelas walau badannya
          // semi-transparan. Teksnya sendiri sticky biar tetep kebaca pas
          // clip-nya lebar dan track discroll horizontal.
          <div
            className={`z-10 block w-full shrink-0 truncate rounded-t-[3px] px-2 py-0.5 text-[11px] font-medium leading-none opacity-100 ${
              headerFill ? '' : `${fillByKind[kind]} ${inkByKind[kind]} brightness-125`
            }`}
            style={{ backgroundColor: headerFill, color: headerInk }}
          >
            <span className="sticky left-0">{clip.label}</span>
          </div>
        )
      )}
      <div className={`relative min-h-0 flex-1 pt-1 pb-1 ${clip.waveformPeaks ? 'pl-0 pr-0' : 'px-2'}`}>
        {clip.waveformPeaks ? (
          // Sample-nya ketemu di dalam zip project & sudah didekode — gambar
          // waveform beneran, bukan pola dekoratif. lengthBars &
          // waveformNativeSpanBars dikirim biar WaveformCanvas tau lebar
          // satu putaran sample vs lebar penempatan clip-nya, dan `loop`
          // (dari clip.loopPoints, lihat flmToTracks.ts — diisi berdasar
          // sub-chunk LINk di .flm, lihat flmParser.ts) nentuin apa
          // putaran itu di-tile berulang buat ngisi penuh lebar clip atau
          // cuma main sekali terus dibiarin senyap (one-shot asli).
          //
          // Padding kiri & kanan sengaja DIHILANGKAN (pl-0 pr-0) khusus buat
          // waveform — beda dari NotePreview/Pattern yang tetep px-2 di
          // kedua sisi. Awalnya waveform ikut px-2 kayak yang lain, tapi
          // begitu clip audio jadi pendek banget (one-shot kick/clap hasil
          // clamp panjang ke jarak antar hit), 8px padding kiri itu keliatan
          // sebagai jarak/spasi kosong yang jelas banget sebelum bunyinya
          // "mulai" — padahal harusnya nempel mentok ke tepi kiri clip
          // (= titik clip itu beneran mulai main di timeline). Padding kanan
          // (pr-2) awalnya dibiarin, tapi ternyata bikin SEMUA clip audio
          // nyisa jarak kecil di kanan gak peduli hasil stretch/tile-nya —
          // sekarang dihilangin juga (pr-0) biar waveform beneran mentok ke
          // KEDUA tepi clip.
          <WaveformCanvas
            peaks={clip.waveformPeaks}
            multiRes={clip.waveformMultiRes}
            lengthBars={effectiveLengthBars}
            nativeSpanBars={clip.waveformNativeSpanBars}
            // waveformTileFill (di-set handleClipEditorStretch pas stretch
            // dari dalam AudioClipEditor) bikin waveform digambar SATU
            // putaran di lebar proporsionalnya apa adanya (nyisa blank
            // kalau native span dipendekin, ke-crop kalau dipanjangin) —
            // niru persis squeeze yang keliatan di kotak preview editor.
            // `loop` tetep dari data asli (loopPoints hasil import), gak
            // dipaksa true buat tileFill.
            loop={isLoopedClip}
            tileFill={!!clip.waveformTileFill}
            stretchToFit={clip.waveformStretchToFit !== false}
          />
        ) : clip.notes && clip.notes.length > 0 ? (
          <NotePreview notes={clip.notes} totalBeats={effectiveLengthBars * BEATS_PER_BAR} />
        ) : (
          <Pattern pattern={clip.pattern} seed={seed} />
        )}
      </div>

      {isMenuOpen && (
        <ClipMenu
          flipDown={flipMenuDown}
          onAction={(action) => onMenuAction?.(clip.id, action)}
          showStretchFit={hasWaveformGap}
        />
      )}

      {isMenuOpen && isAudioClip && (
        <>
          {/* Knob kiri — geser buat manjangin/mendekin clip dari tepi kiri. */}
          <ResizeKnob
            style={{ left: 0, top: '50%', transform: 'translate(-50%, -50%)' }}
            onPointerDown={startResize('left')}
            onPointerMove={handleResizeMove}
            onPointerUp={endResize}
          />
          {/* Knob kanan — geser buat manjangin/mendekin clip dari tepi kanan
              (penempatan doang, sample-nya gak ikut di-stretch). */}
          <ResizeKnob
            style={{ left: '100%', top: '50%', transform: 'translate(-50%, -50%)' }}
            onPointerDown={startResize('right')}
            onPointerMove={handleResizeMove}
            onPointerUp={endResize}
          />
          {/* Knob kanan-bawah — time-stretch beneran: nge-resample audio
              biar pas ngisi penuh durasi baru (lihat onStretch di App.tsx),
              bukan cuma manjangin penempatan kayak knob kanan. */}
          <ResizeKnob
            className="border-2 border-black/20"
            style={{ left: '100%', top: 'calc(100% + 6px)', transform: 'translate(-50%, 0)' }}
            onPointerDown={startResize('stretch')}
            onPointerMove={handleResizeMove}
            onPointerUp={endResize}
          />
        </>
      )}
    </div>
  )
}
