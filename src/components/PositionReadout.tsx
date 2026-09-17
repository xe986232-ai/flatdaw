import { forwardRef } from 'react'

// Readout posisi playhead format Bar:Beat:Tick — niru display transport FL
// Studio ("19:01:06"). Dipasang FIXED di pojok kanan-atas frame canvas (lihat
// App.tsx: elemen ini jadi SIBLING dari scrollRef, bukan anak di dalemnya),
// jadi posisinya gak ikut geser pas timeline di-scroll/pan atau di-zoom —
// selalu nempel di tempat yang sama persis kayak transport bar di FL Studio
// yang gak pernah ikut scroll piano roll/playlist di bawahnya.
//
// Teks digitnya di-mutate langsung lewat DOM ref (textContent) di rAF loop
// App.tsx selama isPlaying, bukan lewat prop React yang re-render tiap frame
// — pola yang sama dipakai Playhead.tsx buat alasan performa yang sama.
export const PositionReadout = forwardRef<HTMLDivElement, { initialText: string }>(
  function PositionReadout({ initialText }, ref) {
    return (
      <div className="pointer-events-none absolute right-2.5 top-[19px] z-40 select-none rounded-[3px] border border-black/70 bg-[#0b0b0d] px-2.5 py-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
        <div
          ref={ref}
          className="font-mono text-[15px] font-semibold tracking-[0.12em] text-white tabular-nums"
          style={{ textShadow: '0 0 6px rgba(255,255,255,0.25)' }}
        >
          {initialText}
        </div>
      </div>
    )
  },
)
