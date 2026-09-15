import { useEffect, useRef } from 'react'
import type { WaveformPeaksData } from '../tracks'

// Gambar waveform audio asli (min/max per bucket) ke <canvas>. Ini murni
// render visual — gak ada elemen <audio>, gak ada AudioContext yang
// disambung ke speaker, jadi gak ada suara yang keluar sama sekali.
//
// Gaya bar tegak rapat (mirror atas/bawah dari garis tengah), niru tampilan
// region audio Soundtrap — bukan lagi kurva envelope halus. Tiap bar mewakili
// satu bucket peak (min/max), digambar sebagai satu batang solid dari
// midY-max sampai midY+|min|, dipisah celah tipis biar keliatan sebagai
// deretan bar diskrit, konsisten sama pola 'dense' (placeholder sebelum
// waveform asli ketemu) yang juga bar-style.
export function WaveformCanvas({ peaks }: { peaks: WaveformPeaksData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      const cssW = parent.clientWidth || 1
      const cssH = parent.clientHeight || 16
      canvas.width = Math.max(1, Math.round(cssW * dpr))
      canvas.height = Math.max(1, Math.round(cssH * dpr))
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)

      const { min, max } = peaks
      const n = max.length
      if (n === 0) return
      const midY = cssH / 2
      const amp = midY * 0.92 // dikit padding atas/bawah biar puncaknya gak mepet tepi

      // Lebar tiap bar + celah antar-bar. Kalau bucket-nya lebih rapat dari
      // ~2px/bar, celahnya dihilangkan (jadi rapat solid) biar gak jadi
      // noise garis-garis tipis pas clip-nya lebar/banyak data.
      const slotW = cssW / n
      const gap = slotW > 2.2 ? Math.min(1, slotW * 0.25) : 0
      const barW = Math.max(0.6, slotW - gap)

      ctx.fillStyle = 'currentColor'

      for (let i = 0; i < n; i++) {
        const x = i * slotW
        const top = midY - Math.max(max[i], 0.02) * amp
        const bottom = midY + Math.max(Math.abs(min[i]), 0.02) * amp
        ctx.globalAlpha = 0.9
        ctx.fillRect(x, top, barW, Math.max(1, bottom - top))
      }

      // Garis tengah tipis (nol amplitudo) biar bagian yang senyap/pelan tetep
      // kebaca sebagai garis, bukan kosong total.
      ctx.globalAlpha = 0.35
      ctx.fillRect(0, midY - 0.5, cssW, 1)
      ctx.globalAlpha = 1
    }

    draw()
    const ro = new ResizeObserver(draw)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [peaks])

  return <canvas ref={canvasRef} className="block h-full w-full" style={{ color: 'currentColor' }} />
}
