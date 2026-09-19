import { useLayoutEffect, useRef, useState } from 'react'
import { PlaylistFrame } from '../theme2/PlaylistFrame'
import { DESIGN_H, DESIGN_W } from '../theme2/mockData'
import { tracksToTheme2, type Theme2Data } from '../theme2/fromTracks'
import { parseFlmFile } from '../flmParser'
import { flmToTracks } from '../flmToTracks'
import { loadZipProject } from '../zipProject'

// Template 02 — tampilan playlist ala FL Studio. Awalnya murni mock-up,
// sekarang bisa diisi hasil parsing .flm/.zip (dipakai ulang dari parser
// Template 01: flmParser.ts + flmToTracks.ts -> dikonversi ke format
// MockTrack/MockClip lewat theme2/fromTracks.ts). Kalau belum ada yang
// di-import, tetap tampil mock-up statis kayak semula.

const MIN_SCALE = 0.55

export default function EditorTheme2({ onBackToTemplates }: { onBackToTemplates?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [data, setData] = useState<Theme2Data | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportFlm = async (file: File) => {
    setIsImporting(true)
    setError(null)
    setStatus(null)
    try {
      const isZip = /\.zip$/i.test(file.name)
      let flmBytes: Uint8Array
      let flmName = file.name

      if (isZip) {
        const zipResult = await loadZipProject(file)
        if (!zipResult.ok) {
          setError(zipResult.error)
          return
        }
        flmBytes = zipResult.data.flmBytes
        flmName = zipResult.data.flmName
      } else {
        const buffer = await file.arrayBuffer()
        flmBytes = new Uint8Array(buffer)
      }

      const result = parseFlmFile(flmBytes, flmName)
      if (!result.ok) {
        setError(result.error)
        return
      }

      const mappedTracks = flmToTracks(result.data)
      setData(tracksToTheme2(mappedTracks))
      setStatus(`${flmName} · ${mappedTracks.length} track masuk playlist · ${result.data.bpm} BPM`)
    } catch (err) {
      console.error('Gagal membaca file project:', err)
      setError('File gak bisa dibaca. Pastikan ini .flm (FL Studio Mobile) atau .zip berisi project + folder sample.')
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void handleImportFlm(file)
  }

  // Kanvas didesain di ukuran tetap (DESIGN_W x DESIGN_H) lalu di-scale biar
  // muat di lebar layar. Di layar sempit, scale dikunci minimum supaya teks
  // tetap kebaca dan sisanya bisa digeser horizontal.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setScale(Math.max(MIN_SCALE, Math.min(1, el.clientWidth / DESIGN_W)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-4" style={{ backgroundColor: '#8ea6f4' }}>
      <div className="flex w-full items-center justify-between gap-2" style={{ maxWidth: DESIGN_W }}>
        {onBackToTemplates ? (
          <button
            type="button"
            onClick={onBackToTemplates}
            className="rounded-md border border-black/20 bg-[#252d33] px-3 py-1.5 text-xs font-medium text-white/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            ← Template
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="rounded-md border border-black/20 bg-[#3B6FA0] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {isImporting ? 'Mem-parsing project…' : 'Import Project (.zip / .flm)'}
        </button>
        <input ref={fileInputRef} type="file" accept=".zip,.flm" className="hidden" onChange={handleFileInputChange} />
      </div>

      {status && (
        <div className="w-full rounded-md bg-[#1d3a2a] px-3 py-1.5 text-[12px] text-white/85" style={{ maxWidth: DESIGN_W }}>
          {status}
        </div>
      )}
      {error && (
        <div className="w-full rounded-md bg-[#5A2A2A] px-3 py-1.5 text-[12px] text-white/90" style={{ maxWidth: DESIGN_W }}>
          {error}
        </div>
      )}

      <div ref={wrapRef} className="w-full overflow-x-auto" style={{ maxWidth: DESIGN_W }}>
        <div style={{ width: DESIGN_W * scale, height: DESIGN_H * scale }}>
          <div style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <PlaylistFrame
              tracks={data?.tracks}
              browserItems={data?.browserItems}
              originBar={data?.originBar}
              viewStartBar={data?.viewStartBar}
              viewBars={data?.viewBars}
              songBars={data?.songBars}
              playheadBar={data?.playheadBar}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
