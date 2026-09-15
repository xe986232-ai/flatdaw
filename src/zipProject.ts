// Buka file .zip hasil export/backup project (FLM + folder sample-nya), lalu
// pisahin jadi: (1) bytes file .flm buat dilempar ke parseFlmFile() yang
// sudah ada, dan (2) index semua file audio di dalam zip (nama -> entry
// JSZip), buat dicocokin ke sampleName tiap klip audio nanti.
import JSZip from 'jszip'
import { normalizeSampleKey } from './waveform'

const AUDIO_EXT = /\.(wav|mp3|ogg|flac|aif|aiff|m4a|wma)$/i

export interface ZipProject {
  flmBytes: Uint8Array
  flmName: string
  // key = normalizeSampleKey(nama file), value = entry buat di-.async('arraybuffer') belakangan
  audioFiles: Map<string, JSZip.JSZipObject>
  audioFileCount: number
}

export type ZipProjectResult = { ok: true; data: ZipProject } | { ok: false; error: string }

export async function loadZipProject(file: File): Promise<ZipProjectResult> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    return { ok: false, error: 'Gagal buka file .zip. Pastikan ini hasil export/backup project yang valid.' }
  }

  const entries = Object.values(zip.files).filter((f) => !f.dir)

  const flmEntry = entries.find((f) => /\.flm$/i.test(f.name))
  if (!flmEntry) {
    return { ok: false, error: 'Gak nemu file .flm di dalam zip ini. Pastikan zip berisi project FL Studio Mobile (.flm) + folder sample-nya.' }
  }

  const flmBuf = await flmEntry.async('arraybuffer')
  const flmName = flmEntry.name.split('/').pop() ?? flmEntry.name

  const audioFiles = new Map<string, JSZip.JSZipObject>()
  for (const entry of entries) {
    if (!AUDIO_EXT.test(entry.name)) continue
    const key = normalizeSampleKey(entry.name)
    // Kalau ada nama file yang sama persis di lebih dari 1 folder, entry
    // pertama menang — untuk kasus umum (1 sample dipakai berkali-kali)
    // hasilnya tetap sama aja karena isinya identik.
    if (!audioFiles.has(key)) audioFiles.set(key, entry)
  }

  return {
    ok: true,
    data: { flmBytes: new Uint8Array(flmBuf), flmName, audioFiles, audioFileCount: audioFiles.size },
  }
}

// Cari file audio di dalam zip yang paling cocok buat sebuah sampleName hasil
// parsing .flm (mis. "Case 19 (Kick)"). Coba exact match dulu (paling
// akurat), baru fallback ke "salah satu mengandung yang lain" buat nama yang
// kepotong/beda sedikit antara metadata proyek vs nama file asli di disk.
export function matchSampleFile(sampleName: string, audioFiles: Map<string, JSZip.JSZipObject>): JSZip.JSZipObject | null {
  const key = normalizeSampleKey(sampleName)
  if (!key) return null

  const exact = audioFiles.get(key)
  if (exact) return exact

  for (const [fileKey, entry] of audioFiles) {
    if (fileKey.includes(key) || key.includes(fileKey)) return entry
  }
  return null
}
