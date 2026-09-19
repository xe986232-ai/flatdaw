import { useLayoutEffect, useRef, useState } from 'react'
import { PlaylistFrame } from '../theme2/PlaylistFrame'
import { DESIGN_H, DESIGN_W } from '../theme2/mockData'

// Template 02 — mock-up tampilan playlist ala FL Studio.
// Murni visual (belum ada fungsi), dan berdiri sendiri: semua komponen &
// data-nya ada di src/theme2/, gak ada yang dipakai bareng Template 01.

const MIN_SCALE = 0.55

export default function EditorTheme2({ onBackToTemplates }: { onBackToTemplates?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // Kanvas didesain di ukuran tetap (DESIGN_W x DESIGN_H) lalu di-scale biar
  // muat di lebar layar. Di layar sempit, scale dikunci minimum supaya teks
  // tetap kebaca dan sisanya bisa digeser horizontal.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setScale(Math.max(MIN_SCALE, Math.min(1, el.clientWidth / DESIGN_W)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-4" style={{ backgroundColor: '#8ea6f4' }}>
      {onBackToTemplates && (
        <button
          type="button"
          onClick={onBackToTemplates}
          className="self-start rounded-md border border-black/20 bg-[#252d33] px-3 py-1.5 text-xs font-medium text-white/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          ← Template
        </button>
      )}
      <div ref={wrapRef} className="w-full overflow-x-auto" style={{ maxWidth: DESIGN_W }}>
        <div style={{ width: DESIGN_W * scale, height: DESIGN_H * scale }}>
          <div style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <PlaylistFrame />
          </div>
        </div>
      </div>
    </div>
  )
}
