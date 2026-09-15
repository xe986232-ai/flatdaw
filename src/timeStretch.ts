// WSOLA (Waveform Similarity Overlap-Add) time-stretch — offline, non-
// realtime. Ngubah DURASI sinyal sebesar `ratio` (outputLen/inputLen) TANPA
// ngubah pitch — beda dari trik playbackRate/resample naif yang ngikut
// ngubah pitch juga. Dipake buat ngoreksi durasi sample ASLI (raw audio,
// sebelum ini cuma didekode apa adanya lalu peaks-nya di-squeeze linear ke
// lebar kotak, lihat catatan lama di WaveformCanvas.tsx) biar waveform yang
// digambar di flatdaw beneran representasi HASIL STRETCH-nya, konsisten
// sama cara FL Studio Mobile ngestretch sample di playlist buat nyamain
// tempo project (lihat stretchRatio/STRC di flmParser.ts).
//
// Algoritma dasar (standar, referensi: Verhelst & Roelands 1993):
//   - Sinyal dipecah jadi window ber-overlap (Hann, 50% overlap).
//   - Window SYNTHESIS (posisi nulis ke output) melangkah dengan hop Hs
//     TETAP.
//   - Window ANALYSIS (posisi baca dari input) melangkah dengan hop Ha =
//     Hs / ratio. ratio > 1 (mau lebih panjang) -> Ha < Hs -> konten
//     dibaca lebih rapat/diulang dikit. ratio < 1 (mau lebih pendek) ->
//     Ha > Hs -> ada bagian yang dilompatin.
//   - Sebelum tiap window (kecuali yang pertama) diambil, posisi
//     analysis-nya digeser dikit (+-searchRadius) buat nyari titik yang
//     PALING MIRIP (cross-correlation tertinggi) sama ekor window
//     sebelumnya — ini yang bikin overlap-add-nya nyambung mulus (gak
//     glitchy kayak SOLA/OLA polos tanpa pencarian).

export interface WsolaOptions {
  sampleRate?: number // dipakai buat nentuin windowSize default (~32ms)
  windowSize?: number // panjang window analysis/synthesis (sample)
  searchRadius?: number // jangkauan pencarian offset terbaik (sample)
}

// Rasio di bawah ini dianggap "gak kedengeran/gak keliatan bedanya" (<0.3%),
// jadi WSOLA di-skip buat hemat CPU — banyak clip di project FL Studio
// Mobile yang stretchRatio-nya cuma beda dikit dari 1 (auto tempo-sync yang
// presisi banget sama project BPM).
const NEGLIGIBLE_RATIO_DELTA = 0.003

function hannWindow(n: number): Float32Array {
  const w = new Float32Array(n)
  if (n <= 1) {
    w.fill(1)
    return w
  }
  // Definisi periodik (bagi N, bukan N-1) — lebih deket ke constant-
  // overlap-add di hop 50%, walau di sini tetep dinormalisasi eksplisit
  // pakai akumulasi weight, jadi gak kritis banget presisinya.
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n)
  return w
}

function mixdownMono(channels: Float32Array[]): Float32Array {
  const len = channels[0].length
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    let sum = 0
    for (let c = 0; c < channels.length; c++) sum += channels[c][i]
    out[i] = sum / channels.length
  }
  return out
}

// Dot-product dua segmen sepanjang `len` dari sinyal REFERENSI YANG SAMA,
// mulai di offset a & b. Dipakai buat nyari kecocokan terbaik antar
// kandidat offset — gak dinormalisasi (bagi energi lokal) biar murah;
// segmen yang dibandingin pendek & dari sinyal yang sama jadi energinya
// biasanya gak beda jauh antar kandidat.
function correlateAt(ref: Float32Array, a: number, b: number, len: number): number {
  let sum = 0
  for (let i = 0; i < len; i++) sum += ref[a + i] * ref[b + i]
  return sum
}

// Resample linear biasa (interpolasi antar sample) — dipakai sebagai
// fallback buat buffer yang kependekan buat WSOLA windowed (lebih pendek
// dari 2x window size). Transient super pendek (kick/klap one-shot) gak
// punya "periode" yang perlu dijaga fasenya, jadi selisih hasil sama WSOLA
// beneran gak signifikan buat sinyal sesingkat itu.
function linearResample(input: Float32Array, outLen: number): Float32Array {
  const inLen = input.length
  const out = new Float32Array(outLen)
  if (inLen === 0 || outLen === 0) return out
  if (inLen === 1) {
    out.fill(input[0])
    return out
  }
  const scale = (inLen - 1) / Math.max(1, outLen - 1)
  for (let i = 0; i < outLen; i++) {
    const srcPos = i * scale
    const i0 = Math.floor(srcPos)
    const i1 = Math.min(inLen - 1, i0 + 1)
    const frac = srcPos - i0
    out[i] = input[i0] * (1 - frac) + input[i1] * frac
  }
  return out
}

/**
 * Stretch beberapa channel audio (harus sama panjang) sebesar `ratio`
 * (outputLen/inputLen). Semua channel dipaksa pakai OFFSET SEARCH yang SAMA
 * (dihitung dari mixdown mono kalau multi-channel), biar stereo tetep
 * phase-locked antar channel — gak geser sendiri-sendiri yang bisa ngerusak
 * image stereo.
 */
export function wsolaTimeStretch(channels: Float32Array[], ratio: number, opts: WsolaOptions = {}): Float32Array[] {
  const numCh = channels.length
  const inLen = channels[0]?.length ?? 0
  if (numCh === 0 || inLen === 0) return channels.map((c) => c.slice())
  if (!Number.isFinite(ratio) || ratio <= 0) return channels.map((c) => c.slice())

  const outLenTarget = Math.max(1, Math.round(inLen * ratio))
  if (Math.abs(ratio - 1) < NEGLIGIBLE_RATIO_DELTA) return channels.map((c) => c.slice())

  const sampleRate = opts.sampleRate ?? 44100
  const N = opts.windowSize ?? Math.max(64, Math.round(sampleRate * 0.032)) // ~32ms per window

  // Sinyal kependekan buat window+search WSOLA yang berarti -> fallback ke
  // resample linear (lihat komentar linearResample di atas).
  if (inLen < N * 2) {
    return channels.map((ch) => linearResample(ch, outLenTarget))
  }

  const Hs = Math.max(1, Math.floor(N / 2)) // synthesis hop, overlap 50%
  const Ha = Math.max(1, Math.round(Hs / ratio)) // analysis hop
  const searchRadius = opts.searchRadius ?? Math.min(512, Math.max(32, Math.floor(Ha / 2)))
  const win = hannWindow(N)
  const overlapLen = N - Hs // = Hs kalau overlap 50%

  const outLen = outLenTarget
  const outBuffers = channels.map(() => new Float32Array(outLen + N))
  const weight = new Float32Array(outLen + N)

  const ref = numCh === 1 ? channels[0] : mixdownMono(channels)

  let synthPos = 0
  let idealAnalysisPos = 0
  let actualAnalysisPos = 0
  let first = true

  while (synthPos < outLen) {
    let pos = idealAnalysisPos
    if (!first) {
      // Cari offset -searchRadius..+searchRadius di sekitar idealAnalysisPos
      // yang bikin AWAL segmen (overlapLen sample pertama) paling mirip sama
      // EKOR window sebelumnya (posisi actualAnalysisPos+Hs..+N di sinyal
      // input asli — bukan output, karena window sebelumnya belum
      // di-windowing waktu dibandingin di sini).
      const tailStart = actualAnalysisPos + Hs
      let bestOffset = 0
      let bestScore = -Infinity
      const lo = Math.max(-searchRadius, -idealAnalysisPos)
      const hi = Math.min(searchRadius, inLen - overlapLen - idealAnalysisPos)
      for (let off = lo; off <= hi; off++) {
        const candStart = idealAnalysisPos + off
        if (candStart < 0 || candStart + overlapLen > inLen || tailStart + overlapLen > inLen) continue
        const score = correlateAt(ref, tailStart, candStart, overlapLen)
        if (score > bestScore) {
          bestScore = score
          bestOffset = off
        }
      }
      pos = idealAnalysisPos + bestOffset
    }
    pos = Math.max(0, Math.min(pos, Math.max(0, inLen - N)))

    const segEnd = Math.min(inLen, pos + N)
    const segLen = segEnd - pos
    for (let c = 0; c < numCh; c++) {
      const src = channels[c]
      const dst = outBuffers[c]
      for (let i = 0; i < segLen; i++) dst[synthPos + i] += src[pos + i] * win[i]
    }
    for (let i = 0; i < segLen; i++) weight[synthPos + i] += win[i]

    actualAnalysisPos = pos
    synthPos += Hs
    idealAnalysisPos += Ha
    first = false
    if (idealAnalysisPos >= inLen) break
  }

  // Normalisasi pakai akumulasi weight window (bukan asumsi COLA=1 persis),
  // biar tepi awal/akhir yang overlap-nya gak penuh tetep bener
  // amplitudonya.
  for (let c = 0; c < numCh; c++) {
    const dst = outBuffers[c]
    for (let i = 0; i < outLen; i++) {
      const w = weight[i]
      if (w > 1e-6) dst[i] = dst[i] / w
    }
  }

  return outBuffers.map((b) => b.slice(0, outLen))
}
