// Decode audio bytes jadi array "peaks" (min/max per bucket) buat digambar
// sebagai waveform di kanvas — TIDAK ada pemutaran suara sama sekali di sini,
// AudioContext cuma dipakai buat decodeAudioData (murni decode, gak pernah
// disambung ke .destination / dipanggil .start()).

export interface WaveformPeaks {
  min: Float32Array
  max: Float32Array
}

let sharedCtx: AudioContext | null = null
function getDecodeContext(): AudioContext {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    sharedCtx = new Ctor()
  }
  return sharedCtx
}

// Decode buffer audio (wav/mp3/ogg/flac/...) jadi AudioBuffer. Ini cuma
// dekode di memori, gak ada suara yang keluar dari speaker.
export async function decodeAudioBytes(bytes: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = getDecodeContext()
  // decodeAudioData men-detach ArrayBuffer yang dipakai, jadi kirim salinan
  // biar buffer asli (yang mungkin masih dipakai caller) tetap utuh.
  const copy = bytes.slice(0)
  return await ctx.decodeAudioData(copy)
}

// Ringkas AudioBuffer jadi N bucket, tiap bucket nyimpen nilai min & max
// sample (di-mix-down ke mono dulu) — format standar buat gambar waveform
// "mirrored bars" tanpa perlu nyimpen semua sample mentahnya di memori/state.
export function computePeaks(buffer: AudioBuffer, buckets: number): WaveformPeaks {
  const channels = buffer.numberOfChannels
  const length = buffer.length
  const min = new Float32Array(buckets)
  const max = new Float32Array(buckets)
  const samplesPerBucket = Math.max(1, Math.floor(length / buckets))

  const chData: Float32Array[] = []
  for (let c = 0; c < channels; c++) chData.push(buffer.getChannelData(c))

  for (let b = 0; b < buckets; b++) {
    const start = b * samplesPerBucket
    const end = b === buckets - 1 ? length : Math.min(length, start + samplesPerBucket)
    let bucketMin = 0
    let bucketMax = 0
    for (let i = start; i < end; i++) {
      // mix-down mono sederhana: rata-rata semua channel per sample
      let v = 0
      for (let c = 0; c < channels; c++) v += chData[c][i]
      v /= channels
      if (v < bucketMin) bucketMin = v
      if (v > bucketMax) bucketMax = v
    }
    min[b] = bucketMin
    max[b] = bucketMax
  }

  return { min, max }
}

// Normalisasi nama file/sample buat pencocokan: buang path & ekstensi,
// lowercase, buang karakter non-alfanumerik supaya "Case 19 (Kick).wav" dan
// "case_19_kick" ketemu sebagai match yang sama.
export function normalizeSampleKey(name: string): string {
  const base = name.split('/').pop() ?? name
  const noExt = base.replace(/\.(wav|mp3|ogg|flac|aif|aiff|m4a|wma)$/i, '')
  return noExt.toLowerCase().replace(/[^a-z0-9]/g, '')
}
