import { useEffect, useRef } from 'react'
import type { WaveformPeaksData } from '../tracks'

// Gambar waveform audio asli (min/max per bucket) ke <canvas>. Ini murni
// render visual — gak ada elemen <audio>, gak ada AudioContext yang
// disambung ke speaker, jadi gak ada suara yang keluar sama sekali.
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
      const stepX = cssW / (n - 1 || 1)
      const yTop = (i: number) => midY - Math.max(max[i], 0.015) * amp
      const yBot = (i: number) => midY + Math.max(Math.abs(min[i]), 0.015) * amp

      // Gambar sebagai 1 shape envelope yang smooth (top curve -> bottom curve,
      // digabung jadi 1 path lalu di-fill) — mirip tampilan waveform di
      // Ableton/DAW lain, bukan bar chart terpisah-pisah. midpoint antar titik
      // dipakai sebagai titik kontrol quadratic curve biar hasilnya halus
      // walau data peak-nya "kasar".
      ctx.beginPath()
      ctx.moveTo(0, yTop(0))
      for (let i = 1; i < n; i++) {
        const xPrev = (i - 1) * stepX
        const x = i * stepX
        const xMid = (xPrev + x) / 2
        ctx.quadraticCurveTo(xPrev, yTop(i - 1), xMid, (yTop(i - 1) + yTop(i)) / 2)
      }
      ctx.lineTo((n - 1) * stepX, yTop(n - 1))
      ctx.lineTo((n - 1) * stepX, yBot(n - 1))
      for (let i = n - 2; i >= 0; i--) {
        const xNext = (i + 1) * stepX
        const x = i * stepX
        const xMid = (xNext + x) / 2
        ctx.quadraticCurveTo(xNext, yBot(i + 1), xMid, (yBot(i + 1) + yBot(i)) / 2)
      }
      ctx.lineTo(0, yBot(0))
      ctx.closePath()

      ctx.fillStyle = 'currentColor'
      ctx.globalAlpha = 0.32
      ctx.fill()

      ctx.strokeStyle = 'currentColor'
      ctx.globalAlpha = 0.95
      ctx.lineWidth = 1.1
      ctx.lineJoin = 'round'
      ctx.stroke()

      // Garis tengah tipis (nol amplitudo) biar bagian yang senyap/pelan tetep
      // kebaca sebagai garis, bukan kosong total.
      ctx.globalAlpha = 0.35
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, midY)
      ctx.lineTo(cssW, midY)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    draw()
    const ro = new ResizeObserver(draw)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [peaks])

  return <canvas ref={canvasRef} className="block h-full w-full" style={{ color: 'currentColor' }} />
}
