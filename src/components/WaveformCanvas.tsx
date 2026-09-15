import { useEffect, useRef } from 'react'
import type { WaveformPeaksData } from '../tracks'
import { sampleWaveformColumns, type MultiResPeaks } from '../waveformPeaksMultiRes'

// Gambar waveform audio asli ke <canvas> sebagai satu polygon solid (mirror
// atas/bawah dari garis tengah, jalur atas pakai nilai max lalu jalur bawah
// pakai nilai min, ditutup jadi satu shape lalu di-fill sekali) — niru
// tampilan region audio Soundtrap. Ini murni render visual — gak ada elemen
// <audio>, gak ada AudioContext yang disambung ke speaker, jadi gak ada
// suara yang keluar sama sekali.
//
// Kalau `multiRes` ada, dipakai duluan: tiap render dia otomatis milih
// tingkat resolusi ("mipmap stage") paling pas buat lebar klip saat ini,
// jadi waveform tetep detail pas Zoom H dinaikin, bukan stuck di resolusi
// bucket tetap dari waktu import (itu fallback `peaks` di bawah, dipakai
// kalau multiRes belum/gak ada).
export function WaveformCanvas({ peaks, multiRes }: { peaks: WaveformPeaksData; multiRes?: MultiResPeaks }) {
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

      const midY = cssH / 2
      const amp = midY * 0.92 // dikit padding atas/bawah biar puncaknya gak mepet tepi
      const floor = 0.02 // tinggi minimum biar bagian senyap tetep kebaca sebagai garis tipis, bukan kosong total

      // Dua sumber data yang mungkin dipakai, disamakan jadi satu bentuk
      // umum: array nilai max per-kolom + array nilai min per-kolom, lebar
      // slot per kolom (px). Multi-res sumbernya 1 kolom = 1 pixel asli;
      // fallback sumbernya 1 kolom = 1 bucket (bisa lebih lebar dari 1px).
      let maxs: ArrayLike<number>
      let mins: ArrayLike<number>
      let slotW: number

      if (multiRes && multiRes.stages.length > 0) {
        const sampled = sampleWaveformColumns(multiRes, 0, {x0: 0, x1: cssW, u0: 0, u1: multiRes.numFrames})
        maxs = sampled.maxs
        mins = sampled.mins
        slotW = 1
      } else {
        maxs = peaks.max
        mins = peaks.min
        slotW = cssW / Math.max(1, peaks.max.length)
      }

      const n = maxs.length
      if (n === 0) return

      // Satu polygon kontinu (bukan rectangle terpisah per kolom): jalur atas
      // dari kiri ke kanan pakai nilai max, lalu jalur bawah dari kanan ke
      // kiri pakai nilai min, ditutup jadi satu shape lalu di-fill sekali.
      // Ini yang bikin hasilnya keliatan "padet"/solid kayak Soundtrap,
      // gak blocky/grainy kayak fillRect per-kolom — nggak ada celah subpixel
      // atau rounding antar-kolom yang bikin noise garis-garis tipis.
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const x = i * slotW
        const y = midY - Math.max(maxs[i], floor) * amp
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      for (let i = n - 1; i >= 0; i--) {
        const x = i * slotW
        const y = midY + Math.max(Math.abs(mins[i]), floor) * amp
        ctx.lineTo(x, y)
      }
      ctx.closePath()

      ctx.fillStyle = 'currentColor'
      ctx.globalAlpha = 0.9
      ctx.fill()

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
  }, [peaks, multiRes])

  return <canvas ref={canvasRef} className="block h-full w-full" style={{ color: 'currentColor' }} />
}
