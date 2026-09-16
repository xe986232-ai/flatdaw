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
//
// LOOP: dulu (lihat commit lama) diasumsikan FL Studio Mobile gak pernah
// ngulang sample audio buat ngisi penempatan clip yang lebih panjang dari
// durasi aslinya, jadi waveform SELALU digambar sekali doang lalu sisanya
// dibiarin kosong. Ternyata itu keliru — sub-chunk "LINk" di dalam CLSm
// (lihat flmParser.ts) eksplisit nyimpen berapa kali sample-nya diulang,
// dan flmToTracks.ts udah ngisi `clip.loopPoints` berdasarkan itu (periodenya
// nativeSpanBars, bukan sekali doang). Jadi sekarang: kalau `loop` true DAN
// nativeSpanBars lebih pendek dari lengthBars, satu putaran sample
// (selebar nativeSpanBars/lengthBars dari lebar clip) digambar berulang
// nempel-nempelan (tile) sampe ngisi penuh lebar clip — niru tampilan
// FL Studio Mobile pas sample di-drag jadi lebih panjang. Kalau `loop`
// false (genuine one-shot, repeatCount==1), perilaku lama tetep dipakai:
// digambar sekali, sisanya kosong/senyap.
export function WaveformCanvas({
  peaks,
  multiRes,
  lengthBars,
  nativeSpanBars,
  loop,
  stretchToFit,
}: {
  peaks: WaveformPeaksData
  multiRes?: MultiResPeaks
  lengthBars?: number
  nativeSpanBars?: number
  loop?: boolean
  // Toggle per-clip (clip.waveformStretchToFit, lihat tracks.ts) — MURNI
  // ubah lebar gambar di canvas, gak nyentuh tileCount/shouldTile buat clip
  // yang loop=true, jadi clip lain (termasuk clip loop lain) gak kepengaruh
  // sama sekali walau prop ini true di sini.
  stretchToFit?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Satu polygon kontinu (bukan rectangle terpisah per kolom): jalur atas
    // dari kiri ke kanan pakai nilai max, lalu jalur bawah dari kanan ke
    // kiri pakai nilai min, ditutup jadi satu shape lalu di-fill sekali.
    // Ini yang bikin hasilnya keliatan "padet"/solid kayak Soundtrap, gak
    // blocky/grainy kayak fillRect per-kolom. xOffset menggeser seluruh
    // polygon ke kanan sejauh N piksel — dipakai buat naro tiap tile
    // (putaran ulang sample) di posisi x yang bener saat di-loop.
    const drawLane = (
      ctx: CanvasRenderingContext2D,
      maxs: ArrayLike<number>,
      mins: ArrayLike<number>,
      slotW: number,
      xOffset: number,
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
        const x = xOffset + i * slotW
        const y = laneMidY - maxs[i] * laneAmp
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      for (let i = n - 1; i >= 0; i--) {
        const x = xOffset + i * slotW
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

      // Lebar SATU PUTARAN sample (dalam px) = proporsi durasi asli sample
      // terhadap penempatan clip di playlist. Kalau nativeSpanBars gak
      // dikasih atau lebih panjang/sama dengan lengthBars, sample digambar
      // penuh selebar cssW (perilaku lama, gak ada yang perlu dipotong/
      // di-tile). Kalau clip ini loop (`loop` true), tileWidthCss diulang
      // nempel-nempelan sampe ngisi cssW; kalau bukan (one-shot asli), cuma
      // satu tile yang digambar terus sisanya dibiarin kosong/senyap.
      const hasNativeSpan =
        !!nativeSpanBars && !!lengthBars && nativeSpanBars > 0.001 && lengthBars > nativeSpanBars + 0.001
      const drawWidthCss = hasNativeSpan ? Math.max(1, (nativeSpanBars! / lengthBars!) * cssW) : cssW
      const shouldTile = hasNativeSpan && !!loop
      // Kasus one-shot (gak loop) yang nyisa blank di kanan (hasNativeSpan
      // true) DAN user eksplisit nyalain stretchToFit lewat menu clip: satu
      // putaran sample digambar di-scale horizontal sampe cssW (mentok tepi
      // kanan), bukan cuma sepanjang drawWidthCss. shouldTile (clip loop)
      // gak disentuh sama sekali — tileWidthCss-nya tetep drawWidthCss kayak
      // sebelumnya — jadi cuma clip one-shot yang di-toggle ini doang yang
      // berubah tampilannya.
      const shouldStretchOneShot = hasNativeSpan && !shouldTile && !!stretchToFit
      const tileWidthCss = shouldStretchOneShot ? cssW : drawWidthCss
      // Jumlah tile yang perlu digambar buat nutupin lebar clip penuh.
      // Math.ceil biar tile terakhir yang kepotong di tepi kanan clip tetep
      // ke-render (bukan cuma sampe tile utuh terakhir).
      const tileCount = shouldTile ? Math.max(1, Math.ceil(cssW / tileWidthCss)) : 1

      const isStereo = !!multiRes && multiRes.stages.length > 0 && multiRes.numChannels >= 2

      if (isStereo && multiRes) {
        // Dua lane sama tinggi, masing-masing mirror di sekitar garis
        // tengahnya sendiri (bukan satu garis tengah buat seluruh klip).
        const laneH = cssH / 2
        const laneAmp = (laneH / 2) * 0.92
        const left = sampleWaveformColumns(multiRes, 0, { x0: 0, x1: tileWidthCss, u0: 0, u1: multiRes.numFrames })
        const right = sampleWaveformColumns(multiRes, 1, { x0: 0, x1: tileWidthCss, u0: 0, u1: multiRes.numFrames })
        for (let t = 0; t < tileCount; t++) {
          const xOffset = t * tileWidthCss
          if (xOffset >= cssW) break
          drawLane(ctx, left.maxs, left.mins, 1, xOffset, laneH / 2, laneAmp)
          drawLane(ctx, right.maxs, right.mins, 1, xOffset, laneH + laneH / 2, laneAmp)
        }
        return
      }

      const midY = cssH / 2
      const amp = midY * 0.92 // dikit padding atas/bawah biar puncaknya gak mepet tepi

      if (multiRes && multiRes.stages.length > 0) {
        const sampled = sampleWaveformColumns(multiRes, 0, { x0: 0, x1: tileWidthCss, u0: 0, u1: multiRes.numFrames })
        for (let t = 0; t < tileCount; t++) {
          const xOffset = t * tileWidthCss
          if (xOffset >= cssW) break
          drawLane(ctx, sampled.maxs, sampled.mins, 1, xOffset, midY, amp)
        }
        return
      }

      // Fallback (gak ada multiRes, cuma `peaks` bucket tetap dari waktu
      // import) — 1 kolom = 1 bucket (bisa lebih lebar dari 1px), bukan 1
      // kolom = 1px kayak multiRes. Digambar tileCount kali kalau loop,
      // sekali doang kalau one-shot.
      const slotW = tileWidthCss / Math.max(1, peaks.max.length)
      for (let t = 0; t < tileCount; t++) {
        const xOffset = t * tileWidthCss
        if (xOffset >= cssW) break
        drawLane(ctx, peaks.max, peaks.min, slotW, xOffset, midY, amp)
      }
    }

    draw()
    const ro = new ResizeObserver(draw)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [peaks, multiRes, lengthBars, nativeSpanBars, loop, stretchToFit])

  return <canvas ref={canvasRef} className="block h-full w-full" style={{ color: 'currentColor' }} />
}
