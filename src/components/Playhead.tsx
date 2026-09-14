export function Playhead({ x, onDrag }: { x: number; onDrag: (clientX: number) => void }) {
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
    <div className="pointer-events-none absolute top-0 bottom-0 z-30" style={{ left: x }}>
      <div
        onPointerDown={handlePointerDown}
        className="pointer-events-auto absolute -top-[1px] -left-2 h-3.5 w-4 cursor-ew-resize rounded-b-sm bg-white/90"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)' }}
      />
      <div className="h-full w-px bg-white/80" />
    </div>
  )
}
