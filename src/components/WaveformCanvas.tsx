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
      const barW = Math.max(1, cssW / n)

      ctx.fillStyle = 'currentColor'
      ctx.globalAlpha = 0.9
      for (let i = 0; i < n; i++) {
        const x = i * barW
        const topY = midY - Math.max(max[i], 0.02) * midY
        const botY = midY + Math.max(Math.abs(min[i]), 0.02) * midY
        ctx.fillRect(x, topY, Math.max(1, barW - 0.5), Math.max(1, botY - topY))
      }
    }

    draw()
    const ro = new ResizeObserver(draw)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [peaks])

  return <canvas ref={canvasRef} className="block h-full w-full" style={{ color: 'currentColor' }} />
}
