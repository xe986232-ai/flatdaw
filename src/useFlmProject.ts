// Satu-satunya tempat state project (trackList, warna track, BPM) dan logic
// import .flm/.zip disimpan & dijalanin. Dulu ini semua hidup di dalam
// EditorTheme1.tsx sendirian, jadi Template 02 kalau mau baca hasil import
// harus parsing ulang file-nya sendiri (duplikat logic). Sekarang App.tsx
// yang pegang hook ini SEKALI, lalu nurunin hasilnya ke Template 01 maupun
// Template 02 lewat props — dua-duanya baca trackList yang SAMA, hasil
// parsing yang SAMA, gak ada logic yang digandain.
import { useState } from 'react'
import type JSZip from 'jszip'
import { tracks, BEATS_PER_BAR, type Clip, type Track } from './tracks'
import type { FlatColor } from './colors'
import { parseFlmFile } from './flmParser'
import { flmToTracks } from './flmToTracks'
import { loadZipProject, matchSampleFile } from './zipProject'
import { decodeAudioBytes, computePeaks } from './waveform'
import { generateMultiResPeaks } from './waveformPeaksMultiRes'

// Dipakai selama belum ada project ke-import (playlist kosong) — begitu file
// .flm/.zip di-import, projectBpm di-update ke BPM asli hasil parsing chunk
// HEAD (lihat parseProjectBpm di flmParser.ts), bukan hardcoded lagi.
export const DEFAULT_BPM = 120

// Ambang minimal durasi asli sample (dalam bar, sudah dikoreksi stretchRatio)
// buat dianggap "genuinely loopable" di resolveWaveforms() — lihat
// EditorTheme1.tsx versi lama buat catatan investigasi lengkapnya.
const MIN_LOOPABLE_NATIVE_SPAN_BARS = 0.4
const BASE_BAR_WIDTH = 96
// Peak waveform dibangun cukup detail buat zoom horizontal sampe ~3x —
// sama kayak H_ZOOM_MAX di Template 01 (satu-satunya tempat waveform-nya
// digambar beneran; Template 02 cuma gambar bentuk dekoratif, gak butuh ini).
const PEAK_TARGET_ZOOM = 3

export function useFlmProject() {
  const [trackList, setTrackList] = useState<Track[]>(tracks)
  const [trackColors, setTrackColors] = useState<Record<string, FlatColor>>({})
  const [projectBpm, setProjectBpm] = useState(DEFAULT_BPM)
  const [flmStatus, setFlmStatus] = useState<string | null>(null)
  const [flmError, setFlmError] = useState<string | null>(null)
  const [isImportingFlm, setIsImportingFlm] = useState(false)
  // Naik tiap kali import SUKSES ganti trackList. Template 01 dengerin ini
  // (bukan trackList langsung) buat nutup piano roll/menu/clipboard yang lagi
  // kebuka — trackList sendiri juga berubah tiap edit note biasa, jadi gak
  // bisa dipakai sebagai sinyal "ini import baru".
  const [importVersion, setImportVersion] = useState(0)

  // Update satu clip di trackList tanpa nyentuh yang lain — dipakai buat
  // nempelin hasil decode waveform belakangan (async), satu per satu, tanpa
  // nunggu semua sample kelar didekode dulu.
  const patchClip = (clipId: string, patch: Partial<Clip>) => {
    setTrackList((prev) =>
      prev.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
      })),
    )
  }

  // Setelah tracks ke-render, jalanin pass async: buat tiap klip audio yang
  // punya sampleName, cari file-nya di dalam zip project, decode
  // (decodeAudioData — cuma dekode, GAK diputer/gak nyambung ke speaker),
  // ringkas jadi peaks, terus tempelin ke clip itu biar ClipBlock (Template
  // 01) gambar waveform aslinya. Kalau sample-nya gak ketemu di zip, klip
  // itu tetep jatuh ke pattern 'dense' dekoratif seperti sebelumnya.
  const resolveWaveforms = async (mappedTracks: Track[], audioFiles: Map<string, JSZip.JSZipObject>, bpm: number) => {
    const audioClips = mappedTracks.flatMap((t) => t.clips).filter((c) => c.pattern === 'dense' && c.sampleName)

    let found = 0
    let missing = 0
    await Promise.all(
      audioClips.map(async (clip) => {
        const entry = matchSampleFile(clip.sampleName!, audioFiles)
        if (!entry) {
          missing++
          patchClip(clip.id, { waveformStatus: 'missing' })
          return
        }
        try {
          const arrayBuf = await entry.async('arraybuffer')
          const audioBuffer = await decodeAudioBytes(arrayBuf)
          const bucketCount = Math.max(120, Math.min(2400, Math.round(clip.lengthBars * 80)))
          const peaks = computePeaks(audioBuffer, bucketCount)
          const targetWidth = Math.max(300, Math.round(clip.lengthBars * BASE_BAR_WIDTH * PEAK_TARGET_ZOOM))
          const channels: Float32Array[] = []
          for (let c = 0; c < audioBuffer.numberOfChannels; c++) channels.push(audioBuffer.getChannelData(c))
          const multiRes = generateMultiResPeaks(channels, audioBuffer.length, targetWidth)

          const correctedDurationSec = audioBuffer.duration * (clip.stretchRatio ?? 1)
          const nativeSpanBars = (correctedDurationSec * (bpm / 60)) / BEATS_PER_BAR

          const shouldLoop =
            nativeSpanBars > 0.001 &&
            clip.lengthBars > nativeSpanBars + 0.001 &&
            nativeSpanBars >= MIN_LOOPABLE_NATIVE_SPAN_BARS

          const loopPoints: number[] = []
          if (shouldLoop) {
            let offsetBars = nativeSpanBars
            while (offsetBars < clip.lengthBars - 0.001) {
              loopPoints.push(offsetBars)
              offsetBars += nativeSpanBars
            }
          }

          const resolvedLengthBars =
            !shouldLoop && nativeSpanBars > 0.001
              ? Math.min(clip.lengthBars, Math.max(nativeSpanBars, 0.05))
              : clip.lengthBars

          found++
          patchClip(clip.id, {
            waveformPeaks: { min: Array.from(peaks.min), max: Array.from(peaks.max) },
            waveformMultiRes: multiRes,
            waveformStatus: 'found',
            waveformNativeSpanBars: nativeSpanBars,
            lengthBars: resolvedLengthBars,
            loopPoints: loopPoints.length > 0 ? loopPoints : undefined,
          })
        } catch (err) {
          console.error(`Gagal decode sample "${clip.sampleName}":`, err)
          missing++
          patchClip(clip.id, { waveformStatus: 'missing' })
        }
      }),
    )

    if (audioClips.length > 0) {
      setFlmStatus(
        (prev) => `${prev ?? ''} · waveform: ${found} sample ketemu & ke-render${missing ? `, ${missing} gak ketemu di zip` : ''}`,
      )
    }
  }

  // Baca file .flm ATAU .zip (project + folder sample-nya) -> parseFlmFile
  // (logic EVN2 parser gak diubah sama sekali) -> flmToTracks -> ganti isi
  // trackList. Ini SATU-SATUNYA tempat parseFlmFile/flmToTracks dipanggil —
  // Template 01 & 02 dua-duanya cuma manggil fungsi ini lewat props, gak ada
  // yang parsing sendiri-sendiri lagi.
  const handleImportFlm = async (file: File) => {
    setIsImportingFlm(true)
    setFlmError(null)
    setFlmStatus(null)
    try {
      const isZip = /\.zip$/i.test(file.name)
      let flmBytes: Uint8Array
      let flmName = file.name
      let audioFiles: Map<string, JSZip.JSZipObject> | null = null

      if (isZip) {
        const zipResult = await loadZipProject(file)
        if (!zipResult.ok) {
          setFlmError(zipResult.error)
          return
        }
        flmBytes = zipResult.data.flmBytes
        flmName = zipResult.data.flmName
        audioFiles = zipResult.data.audioFiles
      } else {
        const buffer = await file.arrayBuffer()
        flmBytes = new Uint8Array(buffer)
      }

      const result = parseFlmFile(flmBytes, flmName)
      if (!result.ok) {
        setFlmError(result.error)
        return
      }
      const { chunkResults, timelineClips, namedCount, audioClipCount, bpm } = result.data
      const mappedTracks = flmToTracks(result.data)

      setTrackList(mappedTracks)
      setTrackColors({})
      setProjectBpm(bpm)
      setImportVersion((v) => v + 1)

      setFlmStatus(
        `${flmName} · ${chunkResults.length} pattern` +
          (namedCount ? ` · ${namedCount} instrumen dikenali` : '') +
          (audioClipCount ? ` · ${audioClipCount} klip audio (sample) ikut kebaca` : '') +
          ` · ${timelineClips.length} clip masuk playlist` +
          ` · ${bpm} BPM` +
          (isZip ? ` · zip: ${audioFiles?.size ?? 0} file audio ditemukan` : ''),
      )

      if (audioFiles && audioFiles.size > 0) {
        void resolveWaveforms(mappedTracks, audioFiles, bpm)
      }
    } catch (err) {
      console.error('Gagal membaca file project:', err)
      setFlmError('File gak bisa dibaca. Pastikan ini .flm (FL Studio Mobile) atau .zip berisi project + folder sample.')
    } finally {
      setIsImportingFlm(false)
    }
  }

  return {
    trackList,
    setTrackList,
    trackColors,
    setTrackColors,
    projectBpm,
    setProjectBpm,
    flmStatus,
    flmError,
    isImportingFlm,
    handleImportFlm,
    importVersion,
  }
}

export type FlmProject = ReturnType<typeof useFlmProject>
