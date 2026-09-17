import { forwardRef } from 'react'

// Posisi horizontal playhead digerakkan lewat CSS transform (bukan re-render
// React/props "x" biasa) — lihat pemakaiannya di App.tsx: selama isPlaying,
// tiap frame rAF cuma nge-mutate elemen DOM ini langsung lewat ref
// (el.style.transform), TANPA setState. Transform juga lebih murah buat
// browser dibanding ngubah "left" (translate dikompositori GPU, gak
// nge-trigger layout/reflow), jadi geraknya mulus walau di-update tiap frame.
export const Playhead = forwardRef<
  HTMLDivElement,
  { x: number; onDrag: (clientX: number) => void; isPlaying?: boolean }
>(function Playhead({ x, onDrag, isPlaying = false }, ref) {
    const handlePointerDown = (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      const move = (ev: PointerEvent) => onDrag(ev.clientX)
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
        className="pointer-events-none absolute top-0 bottom-0 left-0 z-30 will-change-transform"
        style={{ transform: `translateX(${x}px)` }}
      >
        <div
          onPointerDown={handlePointerDown}
          className="pointer-events-auto absolute -top-[1px] -left-2 h-3.5 w-4 cursor-ew-resize rounded-b-sm bg-white"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)' }}
        />
        {/* Trail/glow di belakang garis playhead — cuma nongol pas beneran
            jalan (isPlaying), ilang lagi kalau berhenti/diseret manual.
            Warna sama (putih), pudar ke belakang (kiri, kebalikan arah
            gerak). Nempel di wrapper yang sama yang di-translate tiap frame
            (lihat App.tsx), jadi otomatis ikut gerak bareng garis. */}
        {isPlaying && (
          <div
            className="absolute top-0 bottom-0 right-full w-4"
            style={{ background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.45))' }}
          />
        )}
        <div className="h-full w-px bg-white/90" style={{ boxShadow: '0 0 6px 1px rgba(255,255,255,0.55)' }} />
      </div>
    )
  },
)
