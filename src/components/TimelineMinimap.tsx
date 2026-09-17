import { forwardRef } from 'react'

// Minimap/navigator ala FL Studio — strip panjang & tipis yang ngegambarin
// SELURUH timeline dalam bentuk mini, dengan kotak terang nunjuk area yang
// lagi keliatan di viewport dan garis tipis nunjuk posisi playhead. Dipasang
// di App.tsx sebagai elemen normal (bukan di dalem scrollRef yang
// overflow-auto), jadi posisinya BENERAN gak pernah geser — gak ikut ke-pan
// pas timeline di-scroll ke samping, gak ikut ke-scroll pas ditarik ke bawah,
// dan gak ikut berubah pas di-zoom (cuma kotak & garis di dalemnya yang
// bereaksi).
//
// Kotak viewport & garis playhead di-mutate langsung lewat ref (bukan lewat
// prop React yang re-render tiap frame/scroll) — pola performa yang sama
// dipakai Playhead.tsx & PositionReadout.tsx.
export const TimelineMinimap = forwardRef<
  HTMLDivElement,
  {
    viewportRef: React.Ref<HTMLDivElement>
    tickRef: React.Ref<HTMLDivElement>
    initialViewportLeftPct: number
    initialViewportWidthPct: number
    initialTickLeftPct: number
    onSeekRatio: (ratio: number) => void
  }
>(function TimelineMinimap(
  { viewportRef, tickRef, initialViewportLeftPct, initialViewportWidthPct, initialTickLeftPct, onSeekRatio },
  ref,
) {
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = e.currentTarget
    track.setPointerCapture(e.pointerId)

    const seekFromClientX = (clientX: number) => {
      const rect = track.getBoundingClientRect()
      const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
      onSeekRatio(Math.min(1, Math.max(0, ratio)))
    }

    seekFromClientX(e.clientX)

    const move = (ev: PointerEvent) => seekFromClientX(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      ref={ref}
      onPointerDown={handlePointerDown}
      className="relative h-[15px] w-full shrink-0 cursor-pointer overflow-hidden border-b border-black/50 bg-[#15161a]"
    >
      {/* Kotak terang = area yang lagi keliatan di viewport (jendela scroll
          sekarang). Lebar & posisinya di-update tiap scroll/zoom lewat ref,
          gak lewat re-render. */}
      <div
        ref={viewportRef}
        className="pointer-events-none absolute top-0 h-full rounded-[2px] bg-white/[0.14]"
        style={{ left: `${initialViewportLeftPct}%`, width: `${initialViewportWidthPct}%` }}
      />
      {/* Garis tipis = posisi playhead, diproyeksikan ke skala mini. */}
      <div
        ref={tickRef}
        className="pointer-events-none absolute top-0.5 bottom-0.5 w-[2px] rounded-full bg-[#a4e02a]"
        style={{ left: `${initialTickLeftPct}%` }}
      />
    </div>
  )
})
