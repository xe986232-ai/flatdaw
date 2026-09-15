import { useEffect, useRef } from 'react'
import type { WaveformPeaksData } from '../tracks'
import { sampleWaveformColumns, type MultiResPeaks } from '../waveformPeaksMultiRes'

// Gambar waveform audio asli ke <canvas> sebagai polygon solid (mirror
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
//
// Kalau sample-nya stereo (multiRes.numChannels >= 2), digambar sebagai dua
// lane: channel kiri di setengah atas, channel kanan di setengah bawah,
// masing-masing mirror di sekitar garis tengahnya sendiri — niru tampilan
// waveform stereo di DAW pada umumnya. Sample mono tetap satu bentuk penuh
// setinggi klip seperti sebelumnya.
export function WaveformCanvas({ peaks, multiRes }: { peaks: WaveformPeaksData; multiRes?: MultiResPeaks }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Satu polygon kontinu (bukan rectangle terpisah per kolom): jalur atas
    // dari kiri ke kanan pakai nilai max, lalu jalur bawah dari kanan ke
    // kiri pakai nilai min, ditutup jadi satu shape lalu di-fill sekali.
    // Ini yang bikin hasilnya keliatan "padet"/solid kayak Soundtrap, gak
    // blocky/grainy kayak fillRect per-kolom. Dipanggil sekali per lane
    // (satu lane penuh buat mono, dua lane atas/bawah buat stereo).
    const drawLane = (
      ctx: CanvasRenderingContext2D,
      maxs: ArrayLike<number>,
      mins: ArrayLike<number>,
      slotW: number,
      laneMidY: number,
      laneAmp: number
    ) => {
      const n = maxs.length
      if (n === 0) return
      // Sebelumnya ada floor (tinggi minimum) di sini biar bagian senyap
      // masih kebaca sebagai garis tipis. Ternyata garis itu malah keliatan
      // kayak artifact/baseline aneh yang motong di tengah tiap lane
      // (nembus dari kiri ke kanan pas bagian sepi). User minta dihilangin,
      // jadi sekarang bagian yang bener-bener senyap ya kosong aja, gak ada
      // garis flat lagi.
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const x = i * slotW
        const y = laneMidY - maxs[i] * laneAmp
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      for (let i = n - 1; i >= 0; i--) {
        const x = i * slotW
        const y = laneMidY + Math.abs(mins[i]) * laneAmp
        ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fillStyle = 'currentColor'
      ctx.globalAlpha = 0.9
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const draw = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      // clientWidth/clientHeight itu ukuran parent TERMASUK padding-nya.
      // Kalau parent punya padding (mis. px-2/pt-1/pb-1 buat jarak dari tepi
      // clip), canvas yang di-set persis clientWidth/clientHeight bakal
      // kegedean dan numpuk/overflow ke bagian padding-bottom — bikin
      // waveform-nya keliatan "kedorong" turun, ga center lagi. Makanya di
      // sini kita kurangin padding parent-nya dulu biar canvas pas persis di
      // content-box parent, gak lebih.
      const cs = window.getComputedStyle(parent)
      const padX = parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0')
      const padY = parseFloat(cs.paddingTop || '0') + parseFloat(cs.paddingBottom || '0')
      const cssW = Math.max(1, (parent.clientWidth || 1) - padX)
      const cssH = Math.max(1, (parent.clientHeight || 16) - padY)
      canvas.width = Math.max(1, Math.round(cssW * dpr))
      canvas.height = Math.max(1, Math.round(cssH * dpr))
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)

      const isStereo = !!multiRes && multiRes.stages.length > 0 && multiRes.numChannels >= 2

      if (isStereo && multiRes) {
        // Dua lane sama tinggi, masing-masing mirror di sekitar garis
        // tengahnya sendiri (bukan satu garis tengah buat seluruh klip).
        const laneH = cssH / 2
        const laneAmp = (laneH / 2) * 0.92
        const left = sampleWaveformColumns(multiRes, 0, {x0: 0, x1: cssW, u0: 0, u1: multiRes.numFrames})
        const right = sampleWaveformColumns(multiRes, 1, {x0: 0, x1: cssW, u0: 0, u1: multiRes.numFrames})
        drawLane(ctx, left.maxs, left.mins, 1, laneH / 2, laneAmp)
        drawLane(ctx, right.maxs, right.mins, 1, laneH + laneH / 2, laneAmp)
        return
      }

      const midY = cssH / 2
      const amp = midY * 0.92 // dikit padding atas/bawah biar puncaknya gak mepet tepi

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

      drawLane(ctx, maxs, mins, slotW, midY, amp)
    }

    draw()
    const ro = new ResizeObserver(draw)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [peaks, multiRes])

  return <canvas ref={canvasRef} className="block h-full w-full" style={{ color: 'currentColor' }} />
}
