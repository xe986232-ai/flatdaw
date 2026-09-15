import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { BEATS_PER_BAR, type Clip, type Note, type TrackKind } from '../tracks'
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

const SNAP_BARS = 0.25 // snap to the beat subdivisions already drawn on the grid
const CLICK_THRESHOLD_PX = 4 // pointer movement below this counts as a tap, not a drag

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

  const regionLabel = clip.label || 'Untitled'
  const ariaLabel = trackName ? `${regionLabel} region on track ${trackName}` : `${regionLabel} region`

  // Klip audio asli (punya sampleName) dulu selalu dipaksa ungu indigo tetap,
  // gak ikut warna track yang di-random lewat tombol "Random Color". Sekarang
  // audio clip juga ikutan kena random color kayak clip instrument — indigo
  // (AUDIO_REGION_COLOR) cuma jadi fallback kalau track-nya belum pernah
  // di-random-in warnanya sama sekali (color masih undefined).
  const isAudioClip = !!clip.sampleName
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
      aria-valuetext={`Area dimulai pada ${formatBarBeat(effectiveStartBar - timelineStart)} dan berakhir pada ${formatBarBeat(effectiveStartBar - timelineStart + clip.lengthBars)}`}
      className={`absolute top-0 bottom-0 flex touch-none select-none flex-col overflow-visible rounded-[3px] ${
        effectiveColor ? '' : `${fillByKind[kind]} ${inkByKind[kind]}`
      } ${dragStartBar != null ? 'z-20 cursor-grabbing brightness-105' : 'cursor-grab'} ${isMenuOpen ? 'z-30' : ''}`}
      style={{ left, width, backgroundColor: effectiveColor?.fill, color: effectiveColor?.ink }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(e) => e.stopPropagation()}
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
                left: `${(bar / clip.lengthBars) * 100}%`,
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
      <div className="min-h-0 flex-1 px-2 pt-1 pb-1">
        {clip.waveformPeaks ? (
          // Sample-nya ketemu di dalam zip project & sudah didekode — gambar
          // waveform beneran, bukan pola dekoratif. Cuma render, gak diputer.
          // lengthBars & waveformNativeSpanBars dikirim biar WaveformCanvas
          // bisa nge-loop (ulang) waveform-nya kalau penempatan clip lebih
          // panjang dari satu putaran penuh sample aslinya, bukan nyetrecth
          // satu kopi jadi panjang gak natural (lihat App.tsx resolveWaveforms).
          <WaveformCanvas
            peaks={clip.waveformPeaks}
            multiRes={clip.waveformMultiRes}
            lengthBars={clip.lengthBars}
            nativeSpanBars={clip.waveformNativeSpanBars}
          />
        ) : clip.notes && clip.notes.length > 0 ? (
          <NotePreview notes={clip.notes} totalBeats={clip.lengthBars * BEATS_PER_BAR} />
        ) : (
          <Pattern pattern={clip.pattern} seed={seed} />
        )}
      </div>

      {isMenuOpen && <ClipMenu flipDown={flipMenuDown} onAction={(action) => onMenuAction?.(clip.id, action)} />}
    </div>
  )
}
