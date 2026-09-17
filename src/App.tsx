import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { TimelineControlsHeader } from './components/TimelineControlsHeader'
import { TrackRow } from './components/TrackRow'
import { AutomationLane } from './components/AutomationLane'
import { Playhead } from './components/Playhead'
import { PositionReadout } from './components/PositionReadout'
import { TimelineMinimap } from './components/TimelineMinimap'
import { PianoRoll } from './components/PianoRoll'
import { AudioClipEditor } from './components/AudioClipEditor'
import type { ClipMenuAction } from './components/ClipMenu'
import { ColorPicker } from './components/ColorPicker'
import { tracks, TIMELINE_START, getTimelineEnd, BEATS_PER_BAR, type Clip, type Note } from './tracks'
import { generateNotesForClip } from './notes'
import { randomFlatColor, FLAT_PALETTE, flatColorFromHex, lerpHex, type FlatColor } from './colors'
import { parseFlmFile } from './flmParser'
import { flmToTracks } from './flmToTracks'
import { loadZipProject, matchSampleFile } from './zipProject'
import { decodeAudioBytes, computePeaks } from './waveform'
import { generateMultiResPeaks } from './waveformPeaksMultiRes'

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

// Dipakai selama belum ada project ke-import (playlist kosong) — begitu file
// .flm/.zip di-import, projectBpm di-update ke BPM asli hasil parsing chunk
// HEAD (lihat parseProjectBpm di flmParser.ts), bukan hardcoded lagi.
const DEFAULT_BPM = 120

// Ambang minimal durasi asli sample (dalam bar, sudah dikoreksi stretchRatio)
// buat dianggap "genuinely loopable" di resolveWaveforms(). Ketemu dari cek
// distribusi ke 169 clip di project asli: transient one-shot pendek (Kick
// ~0.12 bar, Claps ~0.25 bar) semuanya di bawah ini, sample yang beneran
// loop (LANA RMX-CHOP ~0.5 bar, FREE UP WOOD LOOP ~1 bar, Hi Hats Loop 28
// ~2 bar) semuanya di atas — ada jarak yang jelas di angka 0.4. Tanpa
// ambang ini, one-shot pendek yang penempatannya lebih lebar dari sample-
// nya cuma karena ada gap/jeda sebelum hit berikutnya bisa ke-flag loop
// keliru cuma berdasar rasio panjang doang.
const MIN_LOOPABLE_NATIVE_SPAN_BARS = 0.4

// Resolusi tick buat readout posisi ala FL Studio (Bar:Beat:Tick) — 96 PPQ
// itu resolusi umum di banyak DAW, jadi dipakai di sini juga.
const TICKS_PER_BEAT = 96

/** Format posisi playhead (satuan bar, boleh pecahan) jadi "Bar:Beat:Tick"
 *  2-digit persis kayak transport display FL Studio (contoh: "19:01:06").
 *  Bar & beat ditampilin 1-indexed biar sama kayak yang keliatan di FL. */
function formatBarBeatTick(bar: number, timelineStart: number): string {
  const relative = Math.max(0, bar - timelineStart)
  const wholeBar = Math.floor(relative)
  const beatFraction = (relative - wholeBar) * BEATS_PER_BAR
  const wholeBeat = Math.floor(beatFraction)
  const tick = Math.min(TICKS_PER_BEAT - 1, Math.round((beatFraction - wholeBeat) * TICKS_PER_BEAT))
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return `${pad2(wholeBar + 1)}:${pad2(wholeBeat + 1)}:${pad2(tick)}`
}

// Dua pilihan rasio canvas — cuma ngatur bentuk/ukuran bingkai luar
// (canvasBoxRef), timeline/playlist di dalemnya nggak diubah sama sekali.
// handleExportImage udah baca box.clientWidth/clientHeight secara dinamis,
// jadi export PNG otomatis ngikutin rasio mana pun yang lagi aktif.
const CANVAS_RATIOS = {
  '16:9': { ratio: '2292 / 1080', maxWidth: 2292 },
  '9:16': { ratio: '9 / 16', maxWidth: 608 },
} as const

type CanvasRatioKey = keyof typeof CANVAS_RATIOS

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const canvasBoxRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStage, setExportStage] = useState('')
  const [canvasRatio, setCanvasRatio] = useState<CanvasRatioKey>('16:9')
  const [playheadBar, setPlayheadBar] = useState(207)
  const playheadElRef = useRef<HTMLDivElement>(null)
  const positionReadoutRef = useRef<HTMLDivElement>(null)
  const minimapViewportRef = useRef<HTMLDivElement>(null)
  const minimapTickRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [projectBpm, setProjectBpm] = useState(DEFAULT_BPM)
  const lastFrameTimeRef = useRef<number | null>(null)
  const playheadBarRef = useRef(playheadBar)
  useEffect(() => {
    playheadBarRef.current = playheadBar
  }, [playheadBar])

  // Cycle/loop marker — area loop dalam satuan bar, plus toggle aktif/nonaktif
  // dan toggle snap-to-grid yang dipakai bareng sama drag playhead di bawah.
  const [loopStartBar, setLoopStartBar] = useState(TIMELINE_START)
  const [loopEndBar, setLoopEndBar] = useState(TIMELINE_START + 8)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [trackList, setTrackList] = useState(tracks)
  const [trackColors, setTrackColors] = useState<Record<string, FlatColor>>({})
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  // Warna terakhir dipilih di custom picker (single color) & di dua ujung
  // gradient (atas/bawah) — cuma buat nge-drive value <input type="color">
  // di popover, gak dipake buat render clip mana pun sampe user beneran
  // pencet "Terapkan Gradient" (atau berubah lewat picker single yang
  // langsung ke-apply tiap ganti, lihat handlePickCustomColor).
  const [customColorHex, setCustomColorHex] = useState('#C25355')
  const [gradientTopHex, setGradientTopHex] = useState('#D63A2E')
  const [gradientBottomHex, setGradientBottomHex] = useState('#2E63D6')
  // Swatch mana yang lagi buka custom color picker-nya (cuma satu yang
  // kebuka dalam satu waktu, gantian dipake buat customColorHex /
  // gradientTopHex / gradientBottomHex biar popovernya gak numpuk 3x).
  const [activeColorTarget, setActiveColorTarget] = useState<'custom' | 'gradientTop' | 'gradientBottom' | null>(null)

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
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<{ trackId: string; clipId: string } | null>(null)
  const [editingClip, setEditingClip] = useState<{ trackId: string; clipId: string } | null>(null)
  const [clipboard, setClipboard] = useState<Clip | null>(null)

  // Which clip's piano roll is currently open — replaces the whole arrangement
  // view with an in-place note editor for that clip until closed.
  const [pianoRoll, setPianoRoll] = useState<{ trackId: string; clipId: string } | null>(null)
  // Sama pola kayak pianoRoll di atas, tapi buat clip AUDIO (punya
  // sampleName) — niru layar edit sample FL Studio Mobile (lihat
  // AudioClipEditor.tsx), gantiin PianoRoll yang emang cuma masuk akal
  // buat clip instrument/MIDI.
  const [audioEditor, setAudioEditor] = useState<{ trackId: string; clipId: string } | null>(null)

  // Zoom: horizontal stretches bar width (clips get wider), vertical widens track row height.
  const [hZoom, setHZoom] = useState(1)
  const [vZoom, setVZoom] = useState(1)
  // Rounded to a whole pixel: this width feeds a tiled CSS background-image
  // (grid lines) repeated ~80x across the row. A fractional tile width there
  // accumulates subpixel drift over that many repeats until the lines thin
  // out and vanish well before the right edge — rounding once here keeps
  // every tile (and every clip/ruler position that uses barWidth) pixel-exact.
  const barWidth = Math.round(BASE_BAR_WIDTH * hZoom)

  // Minimap/navigator — konversi posisi/lebar viewport scrollRef (piksel)
  // ke rasio 0..1 relatif ke SELURUH panjang timeline (TIMELINE_START..
  // timelineEnd), lalu di-mutate langsung ke style kotak/garis minimap lewat
  // ref (bukan re-render React) tiap kali di-scroll, di-zoom, atau playhead
  // jalan. Rumus offset -LABEL_WIDTH sama persis kayak yang dipakai
  // handleDrag di bawah buat konsisten nentuin bar di bawah tepi viewport.
  const updateMinimapViewport = () => {
    const container = scrollRef.current
    if (!container || totalBars <= 0) return
    const startBar = TIMELINE_START + (container.scrollLeft - LABEL_WIDTH) / barWidth
    const endBar = TIMELINE_START + (container.scrollLeft + container.clientWidth - LABEL_WIDTH) / barWidth
    const startRatio = Math.min(1, Math.max(0, (startBar - TIMELINE_START) / totalBars))
    const endRatio = Math.min(1, Math.max(0, (endBar - TIMELINE_START) / totalBars))
    if (minimapViewportRef.current) {
      minimapViewportRef.current.style.left = `${startRatio * 100}%`
      minimapViewportRef.current.style.width = `${Math.max(0, endRatio - startRatio) * 100}%`
    }
  }

  const updateMinimapTick = (bar: number) => {
    if (!minimapTickRef.current || totalBars <= 0) return
    const ratio = Math.min(1, Math.max(0, (bar - TIMELINE_START) / totalBars))
    minimapTickRef.current.style.left = `${ratio * 100}%`
  }

  // Klik/drag di minimap → geser scrollRef biar bar yang diklik jadi tengah
  // viewport (sama kayak nge-drag jendela viewport di FL Studio), plus
  // pindahin playhead ke situ juga.
  const handleMinimapSeek = (ratio: number) => {
    const container = scrollRef.current
    if (!container) return
    const targetBar = TIMELINE_START + ratio * totalBars
    const targetX = (targetBar - TIMELINE_START) * barWidth + LABEL_WIDTH
    container.scrollLeft = Math.max(0, targetX - container.clientWidth / 2)
    setPlayheadBar(Math.min(timelineEnd, Math.max(TIMELINE_START, Math.round(targetBar * 4) / 4)))
  }

  // Sinkronin kotak viewport minimap tiap kali scrollRef di-scroll (drag
  // manual/trackpad), dan tiap kali total panjang timeline atau lebar bar
  // (zoom H) berubah — dua hal itu ngubah rasio viewport walau gak ada
  // event scroll baru.
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    updateMinimapViewport()
    container.addEventListener('scroll', updateMinimapViewport, { passive: true })
    return () => container.removeEventListener('scroll', updateMinimapViewport)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barWidth, totalBars])

  useEffect(() => {
    if (!isPlaying) updateMinimapTick(playheadBar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playheadBar, totalBars, isPlaying])
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

  const audioEditorTrack = audioEditor ? trackList.find((t) => t.id === audioEditor.trackId) : undefined
  const audioEditorClip = audioEditorTrack?.clips.find((c) => c.id === audioEditor?.clipId)

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

  // Deselect track on any pointer interaction outside the track's icon column.
  useEffect(() => {
    if (!selectedTrackId) return
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null
      if (!target?.closest('[data-track-interactive]')) setSelectedTrackId(null)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [selectedTrackId])

  // Play/Pause: mulai dari posisi playhead sekarang. Kalau mode loop aktif
  // dan posisi sekarang di luar area loop, lompat ke awal loop dulu. Kalau
  // gak loop dan playhead udah di ujung timeline, balik ke awal.
  const handlePlayClick = () => {
    setIsPlaying((wasPlaying) => {
      const next = !wasPlaying
      if (next) {
        lastFrameTimeRef.current = null
        setPlayheadBar((bar) => {
          if (loopEnabled) {
            if (bar < loopStartBar || bar >= loopEndBar) return loopStartBar
            return bar
          }
          if (bar >= timelineEnd) return TIMELINE_START
          return bar
        })
      }
      return next
    })
  }

  // Jalanin playhead pakai requestAnimationFrame selama isPlaying — gak ada
  // audio yang diputer (sesuai permintaan), tapi posisi playhead maju sesuai
  // waktu asli lewat delta antar frame, bukan increment tetap per frame.
  // Auto-scroll digabung di loop yang sama (bukan efek terpisah yang cuma
  // ngecek posisi tiap re-render) supaya scroll-nya benar-benar smooth,
  // ngikutin garis playhead tiap frame lewat easing, bukan lompat begitu
  // playhead nyentuh tepi viewport.
  useEffect(() => {
    if (!isPlaying) return

    const barsPerSecond = projectBpm / 60 / BEATS_PER_BAR
    const SCROLL_FOLLOW_TAU = 0.25 // detik — makin kecil, makin cepat "ngejar" playhead
    const SCROLL_ANCHOR_RATIO = 0.35 // playhead dijaga di ~35% dari kiri viewport
    let rafId = 0

    const step = (time: number) => {
      if (lastFrameTimeRef.current === null) lastFrameTimeRef.current = time
      const deltaSec = (time - lastFrameTimeRef.current) / 1000
      lastFrameTimeRef.current = time

      let next = playheadBarRef.current + deltaSec * barsPerSecond

      if (loopEnabled) {
        const len = loopEndBar - loopStartBar
        if (len > 0) {
          while (next >= loopEndBar) next -= len
        }
        if (next < loopStartBar) next = loopStartBar
      } else if (next >= timelineEnd) {
        next = timelineEnd
        setIsPlaying(false)
      }

      playheadBarRef.current = next
      // Selama animasi jalan, JANGAN setState tiap frame — App ini punya 33+
      // track & ratusan clip, jadi re-render React penuh tiap frame (60x/detik)
      // bikin main-thread keteteran & playhead-nya keliatan patah-patah/glitch.
      // Posisi visualnya sekarang di-mutate langsung ke DOM node Playhead lewat
      // ref (translateX, GPU-composited), state React (playheadBar) cuma
      // disinkronin lagi pas animasi berhenti (lihat effect cleanup di bawah).
      const elX = (next - TIMELINE_START) * barWidth
      if (playheadElRef.current) {
        playheadElRef.current.style.transform = `translateX(${elX}px)`
      }
      if (positionReadoutRef.current) {
        positionReadoutRef.current.textContent = formatBarBeatTick(next, TIMELINE_START)
      }
      if (minimapTickRef.current && totalBars > 0) {
        const tickRatio = Math.min(1, Math.max(0, (next - TIMELINE_START) / totalBars))
        minimapTickRef.current.style.left = `${tickRatio * 100}%`
      }

      // Smooth follow: cuma aktif selama mode loop nyala (sesuai permintaan
      // — klik tombol Loop yang mengaktifkan auto-scroll). Easing eksponensial
      // biar konsisten mulus di berbagai frame rate, bukan lerp tetap per frame.
      if (loopEnabled) {
        const container = scrollRef.current
        if (container) {
          const x = (next - TIMELINE_START) * barWidth + LABEL_WIDTH
          const target = Math.max(0, x - container.clientWidth * SCROLL_ANCHOR_RATIO)
          const ease = 1 - Math.exp(-deltaSec / SCROLL_FOLLOW_TAU)
          container.scrollLeft += (target - container.scrollLeft) * ease
        }
      }

      rafId = requestAnimationFrame(step)
    }

    rafId = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(rafId)
      lastFrameTimeRef.current = null
      // Sinkronin balik state React ke posisi terakhir pas animasi berhenti
      // (pause, loop diubah, zoom H diubah, dll — semua ini masuk deps efek
      // ini) — biar interaksi lain (drag playhead, klik background) mulai
      // dari posisi yang bener, bukan posisi lama sebelum playback jalan.
      setPlayheadBar(playheadBarRef.current)
    }
  }, [isPlaying, loopEnabled, loopStartBar, loopEndBar, timelineEnd, barWidth, projectBpm])

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

  // Knob kiri: geser tepi kiri clip audio — startBar & lengthBars berubah
  // bareng, tepi kanan tetep diem.
  const handleClipResizeLeft = (trackId: string, clipId: string, newStartBar: number, newLengthBars: number) => {
    setTrackList((prev) =>
      prev.map((t) =>
        t.id !== trackId
          ? t
          : {
              ...t,
              clips: t.clips.map((c) => (c.id === clipId ? { ...c, startBar: newStartBar, lengthBars: newLengthBars } : c)),
            },
      ),
    )
  }

  // Knob kanan: geser tepi kanan clip audio — cuma manjangin/mendekin
  // PENEMPATANNYA di playlist (startBar tetep). Kalau sample-nya lebih
  // pendek dari penempatan baru, WaveformCanvas otomatis nge-tile ulang
  // (loop) berdasar waveformNativeSpanBars yang udah ada — persis kayak
  // drag "extend" sample drum loop di FL Studio Mobile asli.
  const handleClipResizeRight = (trackId: string, clipId: string, newLengthBars: number) => {
    setTrackList((prev) =>
      prev.map((t) =>
        t.id !== trackId ? t : { ...t, clips: t.clips.map((c) => (c.id === clipId ? { ...c, lengthBars: newLengthBars } : c)) },
      ),
    )
  }

  // Knob kanan-bawah: TIME-STRETCH beneran, beda dari resize kanan biasa.
  // stretchRatio di-update proporsional (biar konsisten kalau nanti
  // resolveWaveforms ke-jalanin ulang), dan waveformNativeSpanBars langsung
  // disamain ke lengthBars baru — ini yang bikin WaveformCanvas berhenti
  // nge-tile/nge-loop dan malah nge-resample seluruh gelombang biar mulus
  // ngisi penuh durasi baru (hasView "di-mulur/dipadetin", bukan diulang
  // atau dipotong). loopPoints lama juga dibuang karena udah gak relevan.
  const handleClipStretch = (trackId: string, clipId: string, newLengthBars: number) => {
    setTrackList((prev) =>
      prev.map((t) =>
        t.id !== trackId
          ? t
          : {
              ...t,
              clips: t.clips.map((c) => {
                if (c.id !== clipId || c.lengthBars <= 0) return c
                const ratioChange = newLengthBars / c.lengthBars
                return {
                  ...c,
                  lengthBars: newLengthBars,
                  stretchRatio: (c.stretchRatio ?? 1) * ratioChange,
                  waveformNativeSpanBars: newLengthBars,
                  loopPoints: undefined,
                }
              }),
            },
      ),
    )
  }

  // Stretch DARI DALAM EDITOR (AudioClipEditor) — beda dari handleClipStretch
  // di atas: di sini CUMA waveform-nya yang di-stretch (waveformNativeSpanBars
  // & stretchRatio), lengthBars (= ukuran card di timeline) SENGAJA gak
  // disentuh sama sekali. Jadi kalau di-stretch panjang/pendek dari editor,
  // card clip-nya di timeline diem gak ikut berubah — cuma isi waveform-nya
  // doang yang ke-stretch. waveformStretchToFit dipaksa TRUE (bukan false)
  // biar di TIMELINE waveform-nya SELALU ngisi penuh card dari ujung ke
  // ujung, gak peduli seberapa jauh nativeSpanBars digeser di editor — gak
  // boleh ada sisa ruang kosong ("mentok separo") di timeline. Beda cerita
  // di DALAM editor sendiri: di situ nativeSpanBars/effectiveSpanBars-nya
  // yang dibandingin ke cardBars (lihat AudioClipEditor.tsx), jadi user
  // masih bisa lihat efek stretch-nya di sana tanpa timeline ikut kepotong.
  // loopPoints SENGAJA gak dibuang (beda dari handleClipStretch) karena ini
  // bukan resample penuh clip, cuma nyesuain tile/isi di dalam durasi yang
  // tetap sama.
  const handleClipEditorStretch = (trackId: string, clipId: string, newNativeSpanBars: number) => {
    setTrackList((prev) =>
      prev.map((t) =>
        t.id !== trackId
          ? t
          : {
              ...t,
              clips: t.clips.map((c) => {
                if (c.id !== clipId) return c
                const prevSpan = c.waveformNativeSpanBars && c.waveformNativeSpanBars > 0.001 ? c.waveformNativeSpanBars : c.lengthBars
                if (prevSpan <= 0) return c
                const ratioChange = newNativeSpanBars / prevSpan
                return {
                  ...c,
                  waveformNativeSpanBars: newNativeSpanBars,
                  stretchRatio: (c.stretchRatio ?? 1) * ratioChange,
                  waveformTileFill: true,
                }
              }),
            },
      ),
    )
  }

  const handleClipClick = (trackId: string, clipId: string) => {
    setEditingClip(null)
    setOpenMenu((prev) => (prev?.clipId === clipId ? null : { trackId, clipId }))
  }

  const handleTrackClick = (trackId: string) => {
    setSelectedTrackId((prev) => (prev === trackId ? null : trackId))
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
      // Clip audio (punya sampleName) masuk ke AudioClipEditor (layar
      // edit sample ala FL Studio Mobile), bukan PianoRoll — notasi
      // piano roll gak relevan buat sample audio.
      if (clip.sampleName) {
        setAudioEditor({ trackId, clipId })
        return
      }
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
    if (action === 'stretchFit') {
      // Toggle MURNI visual (lihat clip.waveformStretchToFit di tracks.ts &
      // WaveformCanvas.tsx) — cuma ngubah field ini di clip yang di-tap,
      // clip lain di track manapun sama sekali gak disentuh. Default
      // sekarang udah "full/stretch" (lihat WaveformCanvas: cek `=== false`),
      // jadi tombol ini di-toggle berdasar nilai efektifnya: kalau clip lagi
      // full (waveformStretchToFit belum ke-set / true) — kalau clip ini juga
  // kena waveformTileFill (dari stretch di editor), toggle ini gak ngaruh
  // apa-apa karena tileFill selalu menang di WaveformCanvas (lihat komentar
  // di sana). tap ini eksplisit
      // matiin jadi false (balik ke tampilan lama, ada celah kosong);
      // ditap lagi -> balik ke true (full lagi).
      setTrackList((prev) =>
        prev.map((t) =>
          t.id !== trackId
            ? t
            : {
                ...t,
                clips: t.clips.map((c) =>
                  c.id !== clipId
                    ? c
                    : { ...c, waveformStretchToFit: c.waveformStretchToFit === false ? true : false },
                ),
              },
        ),
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

  // Set SATU warna yang sama ke semua track sekaligus (beda dari Random
  // Color yang ngacak per-track) — dipilih manual dari FLAT_PALETTE yang
  // sama biar tetep konsisten sama warna yang dipakai Random Color.
  const handlePickSingleColor = (picked: FlatColor) => {
    setTrackColors(() => {
      const next: Record<string, FlatColor> = {}
      for (const track of trackList) {
        next[track.id] = picked
      }
      return next
    })
    setIsColorPickerOpen(false)
  }

  // Custom color picker (bukan dari 10 warna FLAT_PALETTE) — dipanggil tiap
  // <input type="color"> berubah, langsung nge-apply ke semua track (gak
  // nunggu tombol "Terapkan" biar user bisa lihat hasilnya real-time sambil
  // geser-geser di native color picker Android/Chrome). ink-nya dihitung
  // otomatis (lihat flatColorFromHex) karena fill-nya bisa apa aja, gak ada
  // pasangan ink yang udah ditentuin manual kayak FLAT_PALETTE.
  const handlePickCustomColor = (hex: string) => {
    setCustomColorHex(hex)
    handlePickSingleColorRaw(flatColorFromHex(hex))
  }

  // Sama persis handlePickSingleColor, tapi TANPA nutup popover-nya (dipake
  // internal buat custom picker & gradient yang popover-nya mesti tetep
  // kebuka sambil user masih ngatur-ngatur warnanya).
  const handlePickSingleColorRaw = (picked: FlatColor) => {
    setTrackColors(() => {
      const next: Record<string, FlatColor> = {}
      for (const track of trackList) {
        next[track.id] = picked
      }
      return next
    })
  }

  // Tema gradient — track PERTAMA (paling atas di layar, lihat trackList.map
  // di render) dapet gradientTopHex apa adanya, track TERAKHIR (paling
  // bawah) dapet gradientBottomHex apa adanya, dan track di antaranya
  // nge-blend proporsional sesuai posisi index-nya (lerpHex). Kalau cuma ada
  // 1 track, dia dapet warna atas (t=0) biar gak ambigu bagi nol.
  const handleApplyGradient = () => {
    setTrackColors(() => {
      const next: Record<string, FlatColor> = {}
      const lastIndex = trackList.length - 1
      trackList.forEach((track, i) => {
        const t = lastIndex > 0 ? i / lastIndex : 0
        next[track.id] = flatColorFromHex(lerpHex(gradientTopHex, gradientBottomHex, t))
      })
      return next
    })
  }

  // Export the visible canvas box as a PNG. Note: WebCodecs (VideoEncoder/
  // AudioEncoder) only deals with video/audio frames — there's no browser
  // ImageEncoder for still PNG/JPEG export, so rasterizing the DOM to a
  // bitmap (via html-to-image, which draws into a <canvas> under the hood)
  // and downloading that is the standard/correct approach for a still image.
  //
  // Sebelumnya toPng dipanggil langsung di canvasBoxRef, tapi anak-nya
  // (scrollRef) punya overflow-auto — html-to-image nge-clone & ngerender
  // SELURUH scrollWidth/scrollHeight konten (semua track & bar, termasuk
  // yang lagi di-scroll keluar layar), bukan cuma yang keliatan. Itu
  // sebabnya hasil export nggak match posisi yang lagi dilihat, dan
  // kenapa prosesnya lama banget — bisa ngerender kanvas yang jauh lebih
  // gede dari yang sebenernya butuh keliatan.
  //
  // Fix: geser SELURUH konten scrollRef pake transform (persis sebesar
  // scrollLeft/scrollTop saat ini), lalu matiin overflow-clipping punya
  // scrollRef sendiri (jadi overflow: visible) biar kontennya nggak
  // ke-crop dua kali. Yang ngerjain pemotongan ke area viewport itu tetep
  // canvasBoxRef (parent) — dia udah overflow-hidden & ukurannya fixed
  // sesuai box yang keliatan di layar, jadi abis kontennya digeser,
  // bagian yang nongol pas persis sama kaya yang lagi kita liat.
  //
  // (Percobaan pertama kemarin salah: scrollRef-nya ikut dikecilin ke
  // ukuran viewport SEBELUM digeser transform-nya — jadinya box yang udah
  // kepotong kecil itu malah ikut ke-translate keluar dari canvasBoxRef,
  // hasil export jadi kosong/blank.)
  const handleExportImage = async () => {
    const box = canvasBoxRef.current
    const scrollEl = scrollRef.current
    if (!box || !scrollEl || isExporting) return

    setIsExporting(true)
    setExportProgress(4)
    setExportStage('Menyiapkan tampilan yang lagi keliatan…')

    const prevTransform = scrollEl.style.transform
    const prevOverflow = scrollEl.style.overflow

    const { scrollLeft, scrollTop } = scrollEl

    let progressTimer: ReturnType<typeof setInterval> | null = null

    try {
      scrollEl.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`
      scrollEl.style.overflow = 'visible'

      // html-to-image nggak nyediain callback progress asli buat toPng,
      // jadi progress bar-nya di-animasiin manual pelan-pelan sampe ~90%
      // selama proses render jalan, biar ada tanda progresnya JALAN
      // (bukan macet), terus dilompatin ke 100% begitu beneran selesai.
      setExportStage('Merender gambar…')
      progressTimer = setInterval(() => {
        setExportProgress((p) => Math.min(p + 4 + Math.random() * 6, 90))
      }, 150)

      const dataUrl = await toPng(box, {
        pixelRatio: 2,
        cacheBust: true,
        width: box.clientWidth,
        height: box.clientHeight,
      })

      if (progressTimer) {
        clearInterval(progressTimer)
        progressTimer = null
      }
      setExportProgress(96)
      setExportStage('Menyimpan file…')

      const link = document.createElement('a')
      link.download = `flatdaw-export-${Date.now()}.png`
      link.href = dataUrl
      link.click()

      setExportProgress(100)
      setExportStage('Selesai!')
    } catch (err) {
      console.error('Export gambar gagal:', err)
      setExportStage('Export gagal, coba lagi.')
    } finally {
      if (progressTimer) clearInterval(progressTimer)
      scrollEl.style.transform = prevTransform
      scrollEl.style.overflow = prevOverflow
      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(0)
        setExportStage('')
      }, 700)
    }
  }

  // Update satu clip di trackList tanpa nyentuh yang lain — dipakai buat
  // nempelin hasil decode waveform belakangan (async), satu per satu, tanpa
  // nunggu semua sample kelar didekode dulu.
  const patchClip = (clipId: string, patch: Partial<Clip>) => {
    setTrackList((prev) =>
      prev.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
      })),
    )
  }

  // Setelah tracks ke-render, jalanin pass async: buat tiap klip audio yang
  // punya sampleName, cari file-nya di dalam zip project, decode
  // (decodeAudioData — cuma dekode, GAK diputer/gak nyambung ke speaker),
  // ringkas jadi peaks, terus tempelin ke clip itu biar ClipBlock gambar
  // waveform aslinya. Kalau sample-nya gak ketemu di zip, klip itu tetep
  // jatuh ke pattern 'dense' dekoratif seperti sebelumnya.
  const resolveWaveforms = async (mappedTracks: typeof tracks, audioFiles: Map<string, import('jszip').JSZipObject>, bpm: number) => {
    const audioClips = mappedTracks.flatMap((t) => t.clips).filter((c) => c.pattern === 'dense' && c.sampleName)

    let found = 0
    let missing = 0
    await Promise.all(
      audioClips.map(async (clip) => {
        const entry = matchSampleFile(clip.sampleName!, audioFiles)
        if (!entry) {
          missing++
          patchClip(clip.id, { waveformStatus: 'missing' })
          return
        }
        try {
          const arrayBuf = await entry.async('arraybuffer')
          const audioBuffer = await decodeAudioBytes(arrayBuf)
          const bucketCount = Math.max(120, Math.min(2400, Math.round(clip.lengthBars * 80)))
          const peaks = computePeaks(audioBuffer, bucketCount)
          // Peak multi-resolusi ("mipmap"): dibangun sekali di sini dari
          // audioBuffer (gak perlu di-generate ulang tiap re-render), lalu
          // WaveformCanvas otomatis milih tingkat resolusi paling pas tiap
          // kali barWidth berubah karena Zoom H — jadi waveform tetep tajam
          // pas di-zoom in, bukan stuck di resolusi bucket saat import.
          // targetWidth dihitung dari lebar klip di piksel pada Zoom H
          // maksimum (H_ZOOM_MAX), biar stage paling detail-nya cukup buat
          // seluruh rentang zoom yang tersedia di UI.
          const targetWidth = Math.max(300, Math.round(clip.lengthBars * BASE_BAR_WIDTH * H_ZOOM_MAX))
          // Peak per channel dipisah (gak di-mixdown ke mono kayak sebelumnya)
          // — biar file stereo bisa digambar sebagai dua lane kiri/kanan
          // (lihat WaveformCanvas). File mono otomatis tetap 1 channel aja.
          const channels: Float32Array[] = []
          for (let c = 0; c < audioBuffer.numberOfChannels; c++) channels.push(audioBuffer.getChannelData(c))
          const multiRes = generateMultiResPeaks(channels, audioBuffer.length, targetWidth)

          // Durasi asli sample (dalam bar, di BPM project), dari audio yang
          // beneran ke-decode — sumber ini jauh lebih dipercaya dibanding
          // field binary apa pun di .flm (LINk sudah pernah dicek KELIRU,
          // lihat flmParser.ts). Dikoreksi dulu pakai stretchRatio (STRC)
          // biar klip yang user SENGAJA time-stretch gak salah kehitung
          // durasi native-nya (durasi_hasil_stretch = audioBuffer.duration
          // * stretchRatio — lihat extractStretchRatio di flmParser.ts).
          const correctedDurationSec = audioBuffer.duration * (clip.stretchRatio ?? 1)
          const nativeSpanBars = (correctedDurationSec * (bpm / 60)) / BEATS_PER_BAR

          // shouldLoop: sama pola kayak shouldLoop buat pattern MIDI di
          // flmToTracks.ts (penempatan lebih panjang dari konten asli ->
          // di-loop, bukan dibiarin kosong), cuma DUA syarat sekarang,
          // gabungan:
          // 1. Penempatan (lengthBars) harus lebih panjang dari durasi
          //    asli sample yang udah dikoreksi stretchRatio.
          // 2. DAN durasi asli sample itu minimal
          //    MIN_LOOPABLE_NATIVE_SPAN_BARS — nyaring transient pendek
          //    kayak kick/klap yang emang gak pernah dimaksudkan buat
          //    di-loop meskipun placement-nya lebih lebar dari durasi
          //    bunyinya (ada gap/jeda sebelum hit berikutnya).
          const shouldLoop =
            nativeSpanBars > 0.001 &&
            clip.lengthBars > nativeSpanBars + 0.001 &&
            nativeSpanBars >= MIN_LOOPABLE_NATIVE_SPAN_BARS

          const loopPoints: number[] = []
          if (shouldLoop) {
            let offsetBars = nativeSpanBars
            while (offsetBars < clip.lengthBars - 0.001) {
              loopPoints.push(offsetBars)
              offsetBars += nativeSpanBars
            }
          }

          // Kalau bukan loop, lebar visual clip HARUS ngikutin durasi asli
          // sample (nativeSpanBars), bukan penempatan/gap ke clip berikutnya
          // yang dipakai sebagai lebar sementara di flmToTracks.ts. Tanpa ini,
          // one-shot pendek (Kick ~0.12 bar, Claps ~0.25 bar) kegambar mulur
          // sampe ke clip berikutnya walau bunyinya udah abis jauh sebelum
          // itu — persis mismatch yang kelihatan dibanding tool FL Studio
          // Mobile aslinya. Di-clamp max ke clip.lengthBars biar gak pernah
          // MELEBIHI penempatan/gap yang udah dihitung sebelumnya (kasus
          // sample udah ke-trim lebih pendek dari placement-nya sendiri).
          const resolvedLengthBars =
            !shouldLoop && nativeSpanBars > 0.001
              ? Math.min(clip.lengthBars, Math.max(nativeSpanBars, 0.05))
              : clip.lengthBars

          found++
          patchClip(clip.id, {
            waveformPeaks: { min: Array.from(peaks.min), max: Array.from(peaks.max) },
            waveformMultiRes: multiRes,
            waveformStatus: 'found',
            waveformNativeSpanBars: nativeSpanBars,
            lengthBars: resolvedLengthBars,
            loopPoints: loopPoints.length > 0 ? loopPoints : undefined,
          })
        } catch (err) {
          console.error(`Gagal decode sample "${clip.sampleName}":`, err)
          missing++
          patchClip(clip.id, { waveformStatus: 'missing' })
        }
      }),
    )

    if (audioClips.length > 0) {
      setFlmStatus(
        (prev) => `${prev ?? ''} · waveform: ${found} sample ketemu & ke-render${missing ? `, ${missing} gak ketemu di zip` : ''}`,
      )
    }
  }

  // Baca file .flm ATAU .zip (project + folder sample-nya) -> parseFlmFile
  // (logic EVN2 parser gak diubah sama sekali) -> flmToTracks -> ganti isi
  // playlist dengan hasil parsing. Kalau yang di-import .zip dan ada file
  // audio yang cocok sama sample klip, waveform asli ikut di-decode & digambar.
  const handleImportFlm = async (file: File) => {
    setIsImportingFlm(true)
    setFlmError(null)
    setFlmStatus(null)
    try {
      const isZip = /\.zip$/i.test(file.name)
      let flmBytes: Uint8Array
      let flmName = file.name
      let audioFiles: Map<string, import('jszip').JSZipObject> | null = null

      if (isZip) {
        const zipResult = await loadZipProject(file)
        if (!zipResult.ok) {
          setFlmError(zipResult.error)
          return
        }
        flmBytes = zipResult.data.flmBytes
        flmName = zipResult.data.flmName
        audioFiles = zipResult.data.audioFiles
      } else {
        const buffer = await file.arrayBuffer()
        flmBytes = new Uint8Array(buffer)
      }

      const result = parseFlmFile(flmBytes, flmName)
      if (!result.ok) {
        setFlmError(result.error)
        return
      }
      const { chunkResults, timelineClips, namedCount, audioClipCount, bpm } = result.data
      const mappedTracks = flmToTracks(result.data)

      setTrackList(mappedTracks)
      setTrackColors({})
      setOpenMenu(null)
      setEditingClip(null)
      setPianoRoll(null)
      setAudioEditor(null)
      setClipboard(null)
      setIsPlaying(false)
      setProjectBpm(bpm)

      setFlmStatus(
        `${flmName} · ${chunkResults.length} pattern` +
          (namedCount ? ` · ${namedCount} instrumen dikenali` : '') +
          (audioClipCount ? ` · ${audioClipCount} klip audio (sample) ikut kebaca` : '') +
          ` · ${timelineClips.length} clip masuk playlist` +
          ` · ${bpm} BPM` +
          (isZip ? ` · zip: ${audioFiles?.size ?? 0} file audio ditemukan` : ''),
      )

      if (audioFiles && audioFiles.size > 0) {
        void resolveWaveforms(mappedTracks, audioFiles, bpm)
      }
    } catch (err) {
      console.error('Gagal membaca file project:', err)
      setFlmError('File gak bisa dibaca. Pastikan ini .flm (FL Studio Mobile) atau .zip berisi project + folder sample.')
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
      {/* Canvas — bentuk/ukuran bingkai luar ngikutin pilihan canvasRatio
          (16:9 / 9:16), holds the whole playlist/arrangement view */}
      <div
        ref={canvasBoxRef}
        className="relative flex w-full flex-col overflow-hidden rounded-lg border border-surface-grid bg-surface-base text-white"
        style={{ aspectRatio: CANVAS_RATIOS[canvasRatio].ratio, maxWidth: CANVAS_RATIOS[canvasRatio].maxWidth }}
      >
        {/* Minimap/navigator — baris normal (bukan absolute), jadi beneran
            paling atas & gak pernah ke-scroll/geser sama sekali, gak
            peduli scroll horizontal, scroll vertikal, atau zoom. */}
        <TimelineMinimap
          viewportRef={minimapViewportRef}
          tickRef={minimapTickRef}
          initialViewportLeftPct={0}
          initialViewportWidthPct={100}
          initialTickLeftPct={totalBars > 0 ? ((playheadBar - TIMELINE_START) / totalBars) * 100 : 0}
          onSeekRatio={handleMinimapSeek}
        />

        {/* Fixed di frame canvas (sibling scrollRef, BUKAN anak di dalemnya)
            — jadi gak ikut ke-scroll/pan pas timeline digeser atau di-zoom,
            selalu nempel di pojok kanan-atas persis kayak transport bar FL
            Studio yang gak pernah kebawa scroll playlist di bawahnya. */}
        <PositionReadout ref={positionReadoutRef} initialText={formatBarBeatTick(playheadBar, TIMELINE_START)} />

        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
          <TimelineControlsHeader
            startBar={TIMELINE_START}
            endBar={timelineEnd}
            barWidth={barWidth}
            labelWidth={LABEL_WIDTH}
            loopStartBar={loopStartBar}
            loopEndBar={loopEndBar}
            loopEnabled={loopEnabled}
            snapEnabled={snapEnabled}
            bpm={projectBpm}
            onLoopChange={(start, end) => {
              setLoopStartBar(start)
              setLoopEndBar(end)
            }}
            onToggleLoop={() => setLoopEnabled((v) => !v)}
            onToggleSnap={() => setSnapEnabled((v) => !v)}
          />

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
                isSelected={selectedTrackId === track.id}
                onClipClick={(clipId) => handleClipClick(track.id, clipId)}
                onMenuAction={(clipId, action) => handleMenuAction(track.id, clipId, action)}
                onRenameCommit={(clipId, label) => handleRenameCommit(track.id, clipId, label)}
                onBackgroundClick={(bar) => handleBackgroundClick(track.id, bar)}
                onTrackClick={() => handleTrackClick(track.id)}
                onClipResizeLeft={(clipId, newStartBar, newLengthBars) =>
                  handleClipResizeLeft(track.id, clipId, newStartBar, newLengthBars)
                }
                onClipResizeRight={(clipId, newLengthBars) => handleClipResizeRight(track.id, clipId, newLengthBars)}
                onClipStretch={(clipId, newLengthBars) => handleClipStretch(track.id, clipId, newLengthBars)}
                snapEnabled={snapEnabled}
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
              <Playhead ref={playheadElRef} x={playheadX} onDrag={handleDrag} isPlaying={isPlaying} />
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

        {audioEditor && audioEditorTrack && audioEditorClip && (
          <AudioClipEditor
            clip={audioEditorClip}
            trackName={audioEditorTrack.name}
            color={trackColors[audioEditorTrack.id]}
            bpm={projectBpm}
            snapEnabled={snapEnabled}
            onClose={() => setAudioEditor(null)}
            onWaveformStretch={(newNativeSpanBars) =>
              handleClipEditorStretch(audioEditorTrack.id, audioEditorClip.id, newNativeSpanBars)
            }
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
          {isImportingFlm ? 'Mem-parsing project…' : 'Import Project (.zip / .flm)'}
        </button>
        <input ref={flmInputRef} type="file" accept=".zip,.flm" className="hidden" onChange={handleFlmInputChange} />
        {flmStatus && <div className="bg-[#1d3a2a] px-3 py-1.5 text-[12px] text-white/85">{flmStatus}</div>}
        {flmError && <div className="bg-[#5A2A2A] px-3 py-1.5 text-[12px] text-white/90">{flmError}</div>}

        <button
          type="button"
          onClick={handleRandomColors}
          className="bg-track-accent px-4 py-2 text-sm font-medium text-white"
        >
          Random Color
        </button>

        <button
          type="button"
          onClick={() => {
            setIsColorPickerOpen((v) => !v)
            setActiveColorTarget(null)
          }}
          className="bg-track-accent px-4 py-2 text-sm font-medium text-white"
        >
          {isColorPickerOpen ? 'Tutup Pengaturan Warna' : 'Pilih Warna'}
        </button>

        <button
          type="button"
          onClick={handlePlayClick}
          className="flex items-center justify-center gap-2 bg-track-accent px-4 py-2 text-sm font-medium text-white"
        >
          {isPlaying ? 'Pause' : 'Play'} Timeline — {projectBpm} BPM
        </button>

        <div className="flex items-center gap-2 bg-[#2a2a2e] px-3 py-2">
          <span className="flex-1 text-sm font-medium text-white">Canvas</span>
          <button
            type="button"
            onClick={() => setCanvasRatio('16:9')}
            className={`px-3 py-1.5 text-[12px] font-medium ${
              canvasRatio === '16:9' ? 'bg-track-accent text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            16:9
          </button>
          <button
            type="button"
            onClick={() => setCanvasRatio('9:16')}
            className={`px-3 py-1.5 text-[12px] font-medium ${
              canvasRatio === '9:16' ? 'bg-track-accent text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            9:16
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

        <button
          type="button"
          onClick={handleExportImage}
          disabled={isExporting}
          className="bg-track-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isExporting ? 'Mengekspor…' : 'Export Gambar (PNG)'}
        </button>

        {isExporting && (
          <div className="flex flex-col gap-1 bg-[#2a2a2e] px-3 py-2">
            <div className="flex items-center justify-between text-[12px] text-white/80">
              <span>{exportStage}</span>
              <span>{Math.round(exportProgress)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-track-accent transition-[width] duration-150 ease-out"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Pengaturan warna dipindah ke SINI (di bawah tombol Export) — ruang
            kosong di bawah situ lebih luas dibanding popover kecil yang
            nyembul dari tombol "Pilih Warna". Susunan 3 bagiannya (swatch
            cepat, custom, gradient) HORIZONTAL berdampingan (flex-wrap biar
            tetep rapi kalau space-nya sempit), dan picker gede-nya nongol di
            bawah baris itu, full-width, pas salah satu swatch di-tap. */}
        {isColorPickerOpen && (
          <div className="flex flex-col gap-3 rounded-sm bg-[#2a2a2e] p-3">
            <div className="flex flex-wrap gap-5">
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-white/60">Warna cepat</div>
                <div className="flex w-max max-w-[220px] flex-wrap gap-1.5">
                  {FLAT_PALETTE.map((c) => (
                    <button
                      key={c.fill}
                      type="button"
                      title={c.fill}
                      onClick={() => handlePickSingleColor(c)}
                      className="h-7 w-7 rounded-full border border-black/30"
                      style={{ backgroundColor: c.fill }}
                    />
                  ))}
                </div>
              </div>

              <div className="w-px self-stretch bg-white/10" />

              <div>
                <div className="mb-1.5 text-[11px] font-medium text-white/60">Custom (semua warna)</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveColorTarget((t) => (t === 'custom' ? null : 'custom'))}
                    className="h-9 w-9 shrink-0 rounded border border-black/30"
                    style={{ backgroundColor: customColorHex }}
                  />
                  <span className="text-[11px] text-white/70">{customColorHex.toUpperCase()}</span>
                </div>
              </div>

              <div className="w-px self-stretch bg-white/10" />

              <div>
                <div className="mb-1.5 text-[11px] font-medium text-white/60">
                  Tema gradient (atas → bawah)
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveColorTarget((t) => (t === 'gradientTop' ? null : 'gradientTop'))}
                      className="h-9 w-9 shrink-0 rounded border border-black/30"
                      style={{ backgroundColor: gradientTopHex }}
                    />
                    <span className="text-[10px] text-white/50">Atas</span>
                  </div>
                  <div
                    className="h-6 w-16 rounded-sm"
                    style={{ background: `linear-gradient(90deg, ${gradientTopHex}, ${gradientBottomHex})` }}
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveColorTarget((t) => (t === 'gradientBottom' ? null : 'gradientBottom'))}
                      className="h-9 w-9 shrink-0 rounded border border-black/30"
                      style={{ backgroundColor: gradientBottomHex }}
                    />
                    <span className="text-[10px] text-white/50">Bawah</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyGradient}
                    className="ml-1 bg-track-accent px-3 py-1.5 text-[12px] font-medium text-white"
                  >
                    Terapkan Gradient
                  </button>
                </div>
              </div>
            </div>

            {/* Picker gede-nya (SV square + hue slider + hex) — nongol full
                lebar di bawah baris horizontal di atas, ngedit warna mana
                pun yang lagi aktif. */}
            {activeColorTarget && (
              <div className="border-t border-white/10 pt-3">
                <div className="mb-1.5 text-[11px] font-medium text-white/60">
                  {activeColorTarget === 'custom' && 'Atur warna custom'}
                  {activeColorTarget === 'gradientTop' && 'Atur warna gradient (atas)'}
                  {activeColorTarget === 'gradientBottom' && 'Atur warna gradient (bawah)'}
                </div>
                <div className="max-w-[360px]">
                  {activeColorTarget === 'custom' && (
                    <ColorPicker value={customColorHex} onChange={handlePickCustomColor} />
                  )}
                  {activeColorTarget === 'gradientTop' && (
                    <ColorPicker value={gradientTopHex} onChange={setGradientTopHex} />
                  )}
                  {activeColorTarget === 'gradientBottom' && (
                    <ColorPicker value={gradientBottomHex} onChange={setGradientBottomHex} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
