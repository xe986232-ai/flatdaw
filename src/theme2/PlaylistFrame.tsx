import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  BAR_W,
  BROWSER_ITEMS,
  BROWSER_W,
  DESIGN_H,
  DESIGN_W,
  HEADER_W,
  LIME,
  MOCK_TRACKS,
  OVERVIEW_H,
  PLAYHEAD_BAR,
  RULER_H,
  SONG_BARS,
  TITLE_H,
  TOOLBAR_H,
  VIEW_BARS,
  VIEW_START_BAR,
  type MockTrack,
} from './mockData'
import { mix, rgba } from './utils'
import { ClipMock } from './ClipMock'
import {
  IconDelete,
  IconDraw,
  IconMagnet,
  IconMute,
  IconPaint,
  IconPlay,
  IconRecord,
  IconSelect,
  IconSlice,
  IconSlip,
  IconSpeaker,
  IconStop,
  IconZoom,
  TabAudioIcon,
  TabAutomationIcon,
  TabPatternIcon,
  TrackKeysIcon,
  TrackWaveIcon,
  WinCloseIcon,
  WinMaxIcon,
  WinMinIcon,
} from './icons'

// Warna chrome (badan aplikasi) — slate kebiruan, bukan hitam pekat.
const C = {
  frame: '#252d33',
  title: '#1d2429',
  toolbar: '#2b353c',
  panel: '#222a30',
  overview: '#1a2126',
  ruler: '#2f3a42',
  edge: '#161c20',
  rowLine: '#1b2328',
  gridBase: '#28323a',
  barLine: '#3b4852',
  beatLine: '#2f3a43',
  text: '#e4eaee',
  textDim: '#9aa8b1',
  lcd: '#171d21',
} as const

const GRID_W = VIEW_BARS * BAR_W

// Latar grid: garis bar, garis beat, dan blok 4-bar selang-seling.
const gridBackground: CSSProperties = {
  backgroundColor: C.gridBase,
  backgroundImage: [
    `repeating-linear-gradient(to right, ${C.barLine} 0 1px, transparent 1px ${BAR_W}px)`,
    `repeating-linear-gradient(to right, ${C.beatLine} 0 1px, transparent 1px ${BAR_W / 4}px)`,
    `repeating-linear-gradient(to right, rgba(255,255,255,0.022) 0 ${BAR_W * 4}px, transparent ${BAR_W * 4}px ${BAR_W * 8}px)`,
  ].join(', '),
}

/* ---------- Title bar ---------- */

function TitleBar() {
  return (
    <div
      className="flex shrink-0 items-center justify-between px-3"
      style={{ height: TITLE_H, background: C.title, borderBottom: `1px solid ${C.edge}` }}
    >
      <div className="flex items-center gap-2 text-[12.5px]">
        <span style={{ color: LIME }}>
          <IconSpeaker size={15} />
        </span>
        <span className="font-semibold" style={{ color: C.text }}>
          Playlist - Arrangement
        </span>
        <span style={{ color: C.textDim }}>›</span>
        <span style={{ color: C.textDim }}>Lagu Baru</span>
      </div>
      <div className="flex items-center gap-4" style={{ color: C.textDim }}>
        <WinMinIcon />
        <WinMaxIcon />
        <WinCloseIcon />
      </div>
    </div>
  )
}

/* ---------- Toolbar: transport + tools ---------- */

function TransportButton({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{ width: 32, height: 30, borderRadius: 4, background: '#36434c', color, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25)' }}
    >
      {children}
    </span>
  )
}

function Lcd({ value, caption, width }: { value: string; caption?: string; width: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ width, height: 34, background: C.lcd, borderRadius: 4, boxShadow: `inset 0 0 0 1px ${C.edge}` }}
    >
      <span className="text-[16px] font-medium leading-none tabular-nums" style={{ fontFamily: '"Rubik", Arial, sans-serif', color: '#c4ec8c' }}>
        {value}
      </span>
      {caption && (
        <span className="mt-[2px] text-[8.5px] leading-none" style={{ color: '#6d7c86' }}>
          {caption}
        </span>
      )}
    </div>
  )
}

const TOOLS = [
  { key: 'draw', Icon: IconDraw, active: true },
  { key: 'paint', Icon: IconPaint },
  { key: 'delete', Icon: IconDelete },
  { key: 'mute', Icon: IconMute },
  { key: 'slip', Icon: IconSlip },
  { key: 'slice', Icon: IconSlice },
  { key: 'select', Icon: IconSelect },
  { key: 'zoom', Icon: IconZoom },
  { key: 'audition', Icon: IconSpeaker },
]

function Toolbar() {
  return (
    <div
      className="flex shrink-0 items-center gap-5 px-3"
      style={{ height: TOOLBAR_H, background: C.toolbar, borderBottom: `1px solid ${C.edge}` }}
    >
      {/* Transport */}
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden text-[10.5px] font-semibold" style={{ borderRadius: 4, boxShadow: `inset 0 0 0 1px ${C.edge}` }}>
          <span className="px-2 py-[7px]" style={{ background: '#222a30', color: '#6d7c86' }}>
            PAT
          </span>
          <span className="px-2 py-[7px]" style={{ background: rgba(LIME, 0.18), color: LIME }}>
            SONG
          </span>
        </div>
        <TransportButton color={LIME}>
          <IconPlay />
        </TransportButton>
        <TransportButton color="#c3ced5">
          <IconStop />
        </TransportButton>
        <TransportButton color="#f0585f">
          <IconRecord />
        </TransportButton>
      </div>

      <div className="flex items-center gap-2">
        <Lcd value="130.000" width={74} />
        <Lcd value="0:12:04" caption="M:S:CS" width={82} />
      </div>

      {/* Tools */}
      <div className="flex items-center gap-[2px] rounded-[5px] p-[2px]" style={{ background: '#222a30' }}>
        {TOOLS.map(({ key, Icon, active }) => (
          <span
            key={key}
            className="inline-flex items-center justify-center"
            style={{
              width: 30,
              height: 28,
              borderRadius: 4,
              color: active ? LIME : '#aab8c1',
              background: active ? rgba(LIME, 0.16) : 'transparent',
              boxShadow: active ? `inset 0 0 0 1px ${rgba(LIME, 0.45)}` : undefined,
            }}
          >
            <Icon size={16} />
          </span>
        ))}
      </div>

      {/* Kanan: snap + volume master */}
      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-1.5 rounded-[4px] px-2 py-[6px] text-[11.5px]" style={{ background: '#222a30', color: '#c3ced5' }}>
          <IconMagnet size={14} />
          <span>Bar</span>
        </div>
        <div className="relative" style={{ width: 150, height: 6, borderRadius: 3, background: '#161c20' }}>
          <div style={{ width: '68%', height: '100%', borderRadius: 3, background: LIME }} />
          <div
            className="absolute"
            style={{ left: 'calc(68% - 5px)', top: -5, width: 10, height: 16, borderRadius: 3, background: '#dfe7ec', boxShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          />
        </div>
      </div>
    </div>
  )
}

/* ---------- Panel kiri: daftar pattern ---------- */

function BrowserPanel({ items }: { items: { name: string; color: string; active?: boolean }[] }) {
  const tabs = [TabPatternIcon, TabAudioIcon, TabAutomationIcon]
  return (
    <div
      className="relative flex shrink-0 flex-col"
      style={{ width: BROWSER_W, background: C.panel, borderRight: `1px solid ${C.edge}` }}
    >
      <div className="flex items-center gap-1 px-2" style={{ height: OVERVIEW_H }}>
        {tabs.map((Tab, i) => (
          <span
            key={i}
            className="inline-flex items-center justify-center"
            style={{
              width: 34,
              height: 26,
              borderRadius: 4,
              color: i === 0 ? LIME : '#8a99a3',
              background: i === 0 ? rgba(LIME, 0.14) : 'transparent',
            }}
          >
            <Tab size={16} />
          </span>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-[2px] overflow-hidden pl-2 pr-4 pt-1">
        {items.map((item) => (
          <div
            key={item.name}
            className="relative flex shrink-0 items-center truncate text-[11.5px]"
            style={{
              height: 24,
              paddingLeft: 12,
              borderRadius: 3,
              background: item.active ? rgba(LIME, 0.16) : '#2a343b',
              color: item.active ? '#f2f7f9' : '#b4c0c8',
              fontWeight: item.active ? 600 : 500,
              boxShadow: item.active ? `inset 0 0 0 1px ${rgba(LIME, 0.4)}` : undefined,
            }}
          >
            <span className="absolute left-0 top-0 bottom-0" style={{ width: 4, background: item.color, borderRadius: '3px 0 0 3px' }} />
            <span className="truncate">{item.name}</span>
          </div>
        ))}
      </div>
      {/* Scrollbar tipis */}
      <div className="absolute bottom-2 right-[3px]" style={{ top: OVERVIEW_H + 4, width: 6, borderRadius: 3, background: '#1a2126' }}>
        <div style={{ height: '46%', marginTop: 2, borderRadius: 3, background: '#3c4a54' }} />
      </div>
    </div>
  )
}

/* ---------- Overview (mini-map seluruh lagu) ---------- */

// Dulu blok minimap ini di-generate acak (RNG per-track), gak nyambung ke
// clip beneran — cukup buat mock visual. Sekarang blok digambar dari posisi
// clip asli (track.clips[].startBar/lengthBars, dinormalisasi ke originBar),
// jadi minimap ini beneran nunjukin di mana isi lagu numpuk, termasuk buat
// hasil import .flm yang panjangnya variatif.
function Overview({
  tracks,
  songBars,
  originBar,
  viewStartBar,
  viewBars,
  onSeekBar,
}: {
  tracks: MockTrack[]
  songBars: number
  originBar: number
  viewStartBar: number
  viewBars: number
  // Klik/drag di minimap buat lompat langsung ke posisi bar itu di playlist
  // utama (lihat handleOverviewSeek di PlaylistFrame) -- opsional biar
  // Overview tetap kepake tanpa ini kalau ada pemanggil lain yang gak butuh.
  onSeekBar?: (bar: number) => void
}) {
  const overviewTracks = tracks.filter((t) => t.clips.length > 0)
  const rows = Math.max(1, overviewTracks.length)
  const blocks: ReactNode[] = []
  overviewTracks.forEach((track, i) => {
    track.clips.forEach((clip) => {
      const x = clip.startBar - originBar
      if (x + clip.lengthBars < 0 || x > songBars) return
      blocks.push(
        <rect
          key={clip.id}
          x={Math.max(0, x)}
          y={i + 0.14}
          width={Math.max(0.3, Math.min(clip.lengthBars, songBars - x) - 0.1)}
          height={0.72}
          fill={track.color}
          fillOpacity={0.85}
        />,
      )
    })
  })

  // Klik (atau drag) di dalam minimap -> hitung bar yang diklik dari posisi
  // x relatif terhadap lebar minimap, lalu lompat ke sana (posisi klik jadi
  // TENGAH viewport, bukan tepi kiri, biar kerasa natural).
  const seekFromEvent = (e: { clientX: number; currentTarget: HTMLElement }) => {
    if (!onSeekBar) return
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    onSeekBar(originBar + frac * songBars - viewBars / 2)
  }

  return (
    <div
      className="relative shrink-0"
      style={{ height: OVERVIEW_H, background: C.overview, borderBottom: `1px solid ${C.edge}`, cursor: onSeekBar ? 'pointer' : undefined }}
      onMouseDown={(e) => {
        if (!onSeekBar) return
        seekFromEvent(e)
        const onMove = (ev: MouseEvent) => seekFromEvent({ clientX: ev.clientX, currentTarget: e.currentTarget })
        const onUp = () => {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }}
    >
      <svg
        className="absolute"
        style={{ left: 8, right: 8, top: 5, bottom: 5, width: 'calc(100% - 16px)', height: OVERVIEW_H - 10 }}
        viewBox={`0 0 ${songBars} ${rows}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {blocks}
      </svg>
      {/* Kotak area yang lagi kelihatan di playlist */}
      <div
        className="absolute"
        style={{
          left: `calc(8px + (100% - 16px) * ${(viewStartBar - originBar) / songBars})`,
          width: `calc((100% - 16px) * ${viewBars / songBars})`,
          top: 2,
          bottom: 2,
          borderRadius: 3,
          background: rgba('#ffffff', 0.09),
          boxShadow: `inset 0 0 0 1.5px ${LIME}`,
        }}
      />
    </div>
  )
}

/* ---------- Ruler ---------- */

// Ruler ini sendiri gak bisa di-scroll langsung -- dia cuma "dituntun" oleh
// scrollX (pixel) dari grid track di bawahnya (satu-satunya elemen yang
// beneran overflow-auto, lihat TrackRows), lewat CSS transform. Ini yang
// bikin ruler ikut geser mulus pas user scroll grid pakai wheel/trackpad/
// drag/touch, tanpa perlu nyalain scrollbar sendiri di sini.
function RulerRow({ songBars, originBar, scrollX, playheadX }: { songBars: number; originBar: number; scrollX: number; playheadX: number }) {
  const barCount = Math.ceil(songBars) + 1
  const bars = Array.from({ length: barCount }, (_, i) => originBar + i)
  return (
    <div className="flex shrink-0" style={{ height: RULER_H, borderBottom: `1px solid ${C.edge}` }}>
      <div
        className="flex shrink-0 items-center gap-3 px-3"
        style={{ width: HEADER_W, background: C.toolbar, borderRight: `1px solid ${C.edge}`, color: '#8a99a3' }}
      >
        <span className="text-[16px] leading-none">+</span>
        <span className="text-[14px] leading-none">×</span>
      </div>
      <div className="relative shrink-0 overflow-hidden" style={{ width: GRID_W, background: C.ruler }}>
        <div style={{ transform: `translateX(${-scrollX}px)` }}>
          {bars.map((b) => {
            const strong = (b - originBar) % 4 === 0
            return (
              <div key={b} className="absolute top-0 bottom-0" style={{ left: (b - originBar) * BAR_W, width: BAR_W }}>
                <span
                  className="absolute left-[5px] top-[3px] text-[11px] leading-none tabular-nums"
                  style={{ color: strong ? '#e4eaee' : '#8797a1', fontWeight: strong ? 700 : 500 }}
                >
                  {b}
                </span>
                <span className="absolute bottom-0 left-0" style={{ width: 1, height: 9, background: '#6f7f8a' }} />
                {[1, 2, 3].map((q) => (
                  <span key={q} className="absolute bottom-0" style={{ left: q * (BAR_W / 4), width: 1, height: 4, background: '#55646e' }} />
                ))}
              </div>
            )
          })}
        </div>
        {/* Penanda playhead di ruler -- overlay TETAP, di luar div yang
            ke-translate di atas, biar posisinya konsisten sama garis
            playhead di grid track (playheadX udah dihitung relatif ke
            viewport, bukan ke konten penuh). */}
        <svg className="pointer-events-none absolute top-0" style={{ left: playheadX - 7 }} width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
          <path d="M1 1h12L7 11z" fill={LIME} stroke="#3f6a0f" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

/* ---------- Header track ---------- */

function TrackHeader({ track }: { track: MockTrack }) {
  const bg = track.selected ? '#3a4852' : mix('#2b353c', track.color, track.collapsed ? 0.1 : 0.17)
  const Icon = track.icon === 'wave' ? TrackWaveIcon : TrackKeysIcon
  const muted = track.clips.length === 0
  return (
    <div
      className="relative shrink-0"
      style={{ width: HEADER_W, height: track.height, background: bg, borderRight: `1px solid ${C.edge}` }}
    >
      <span className="absolute left-0 top-0 bottom-0" style={{ width: 5, background: track.selected ? '#f4f7f9' : track.color }} />
      <span
        className="absolute truncate font-semibold"
        style={{
          left: 13,
          right: track.collapsed ? 26 : 10,
          top: track.collapsed ? 2 : 6,
          fontSize: track.collapsed ? 10.5 : 12.5,
          lineHeight: track.collapsed ? '16px' : '15px',
          color: muted ? '#8a99a3' : C.text,
        }}
      >
        {track.name}
      </span>
      {!track.collapsed && (
        <span className="absolute" style={{ left: 13, bottom: 6, color: mix(track.color, '#ffffff', 0.35) }}>
          <Icon />
        </span>
      )}
      <span
        className="absolute rounded-full"
        style={{
          right: 10,
          width: 9,
          height: 9,
          ...(track.collapsed ? { top: 5 } : { bottom: 7 }),
          background: LIME,
          boxShadow: `0 0 0 1.5px #1b2328, 0 0 6px ${rgba(LIME, 0.6)}`,
        }}
      />
    </div>
  )
}

/* ---------- Baris track + playhead ---------- */

// Kolom header track (kiri) -- gak punya scrollbar sendiri, cuma "dituntun"
// (translateY) sama scrollY dari grid di sebelah kanannya, biar nama track
// selalu nempel sejajar sama baris clip-nya pas di-scroll vertikal.
function TrackHeaderColumn({ tracks, scrollY }: { tracks: MockTrack[]; scrollY: number }) {
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: HEADER_W }}>
      <div style={{ transform: `translateY(${-scrollY}px)` }}>
        {tracks.map((track) => (
          <TrackHeader key={track.id} track={track} />
        ))}
      </div>
    </div>
  )
}

// Grid track: SATU-SATUNYA elemen yang beneran overflow-auto (native scroll
// dua arah -- wheel, trackpad, drag scrollbar, swipe touch semua kepake
// langsung dari browser, gak perlu logic custom). Kontennya digambar penuh
// selebar songBars & setinggi total semua track (bukan cuma jendela
// VIEW_BARS/viewport kayak sebelumnya), jadi scroll beneran punya sesuatu
// buat digeser. onScroll di sini yang jadi sumber scrollX/scrollY buat
// nuntun Ruler & TrackHeaderColumn di atas/samping (lihat PlaylistFrame).
function TrackGrid({
  tracks,
  fullW,
  originBar,
  onScroll,
  gridRef,
}: {
  tracks: MockTrack[]
  fullW: number
  originBar: number
  onScroll: (scrollLeft: number, scrollTop: number) => void
  gridRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={gridRef}
      className="relative shrink-0 overflow-auto overscroll-contain"
      style={{ width: GRID_W, background: C.toolbar }}
      onScroll={(e) => onScroll(e.currentTarget.scrollLeft, e.currentTarget.scrollTop)}
    >
      <div className="relative" style={{ width: fullW, minHeight: '100%', ...gridBackground }}>
        {tracks.map((track) => (
          <div
            key={track.id}
            className="relative box-border"
            style={{
              height: track.height,
              borderBottom: `1px solid ${C.rowLine}`,
              background: track.selected ? 'rgba(255,255,255,0.035)' : undefined,
            }}
          >
            {track.clips.map((clip) => (
              <ClipMock
                key={clip.id}
                clip={clip}
                color={track.color}
                trackHeight={track.height - 1}
                collapsed={track.collapsed}
                viewStartBar={originBar}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function TrackRows({
  tracks,
  fullW,
  originBar,
  playheadX,
  scrollY,
  onScroll,
  gridRef,
}: {
  tracks: MockTrack[]
  fullW: number
  originBar: number
  playheadX: number
  scrollY: number
  onScroll: (scrollLeft: number, scrollTop: number) => void
  gridRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden" style={{ background: C.toolbar }}>
      <div className="flex h-full">
        <TrackHeaderColumn tracks={tracks} scrollY={scrollY} />
        <TrackGrid tracks={tracks} fullW={fullW} originBar={originBar} onScroll={onScroll} gridRef={gridRef} />
      </div>

      {/* Playhead: garis lime tebal dengan glow -- overlay di atas grid,
          posisinya udah relatif ke viewport (bukan ke konten penuh) jadi
          gak perlu ikut scroll. */}
      <div className="pointer-events-none absolute inset-y-0" style={{ left: HEADER_W + playheadX - 26, width: 26, background: `linear-gradient(to right, transparent, ${rgba(LIME, 0.13)})` }} />
      <div
        className="pointer-events-none absolute inset-y-0"
        style={{ left: HEADER_W + playheadX - 1.5, width: 3, background: LIME, boxShadow: `0 0 12px 2px ${rgba(LIME, 0.55)}` }}
      />
    </div>
  )
}

/* ---------- Frame ---------- */

export type PlaylistFrameProps = {
  // Semua opsional — kalau kosong, tampilannya balik ke mock-up statis
  // (MOCK_TRACKS/BROWSER_ITEMS) kayak sebelumnya. Diisi (lewat
  // theme2/fromTracks.ts) begitu ada project .flm yang di-import.
  tracks?: MockTrack[]
  browserItems?: { name: string; color: string; active?: boolean }[]
  originBar?: number
  viewStartBar?: number
  viewBars?: number
  songBars?: number
  playheadBar?: number
}

export function PlaylistFrame({
  tracks = MOCK_TRACKS,
  browserItems = BROWSER_ITEMS,
  originBar = 1,
  viewStartBar: initialViewStartBar = VIEW_START_BAR,
  viewBars = VIEW_BARS,
  songBars = SONG_BARS,
  playheadBar = PLAYHEAD_BAR,
}: PlaylistFrameProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  // scrollX/scrollY (px) = satu-satunya sumber kebenaran posisi scroll,
  // dibaca langsung dari onScroll TrackGrid (lihat TrackRows) -- semua yang
  // butuh tau "lagi liat bar berapa" (Ruler, Overview, playhead) diturunkan
  // dari sini, bukan nyimpen viewStartBar terpisah yang bisa out-of-sync.
  const [scrollX, setScrollX] = useState(0)
  const [scrollY, setScrollY] = useState(0)

  const fullW = Math.max(GRID_W, songBars * BAR_W)
  const viewStartBar = originBar + scrollX / BAR_W

  // Posisi awal scroll: mulai dari bar pertama yang beneran ada isinya
  // (dihitung fromTracks.ts). Kepicu ulang kalau project baru di-import
  // (originBar/initialViewStartBar berubah), gak tiap render biasa --
  // makanya user tetep bisa scroll manual tanpa ke-reset paksa.
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const left = Math.max(0, (initialViewStartBar - originBar) * BAR_W)
    el.scrollTo({ left, top: 0 })
    setScrollX(left)
    setScrollY(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialViewStartBar, originBar])

  const handleGridScroll = (left: number, top: number) => {
    setScrollX(left)
    setScrollY(top)
  }

  // Overview di-klik/drag -> lompat ke bar itu (jadi tengah viewport).
  const handleOverviewSeek = (bar: number) => {
    const el = gridRef.current
    if (!el) return
    const left = Math.max(0, (bar - originBar) * BAR_W)
    el.scrollTo({ left, top: el.scrollTop, behavior: 'smooth' })
  }

  const playheadX = (playheadBar - viewStartBar) * BAR_W
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        width: DESIGN_W,
        height: DESIGN_H,
        background: C.frame,
        color: C.text,
        borderRadius: 6,
        fontFamily: '"Noto Sans", Arial, Helvetica, sans-serif',
      }}
    >
      <TitleBar />
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <BrowserPanel items={browserItems} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Overview
            tracks={tracks}
            songBars={songBars}
            originBar={originBar}
            viewStartBar={viewStartBar}
            viewBars={viewBars}
            onSeekBar={handleOverviewSeek}
          />
          <RulerRow songBars={songBars} originBar={originBar} scrollX={scrollX} playheadX={playheadX} />
          <TrackRows
            tracks={tracks}
            fullW={fullW}
            originBar={originBar}
            playheadX={playheadX}
            scrollY={scrollY}
            onScroll={handleGridScroll}
            gridRef={gridRef}
          />
        </div>
      </div>
    </div>
  )
}
