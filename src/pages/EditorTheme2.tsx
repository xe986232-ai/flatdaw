import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PlaylistFrame } from '../theme2/PlaylistFrame'
import { DESIGN_H, DESIGN_W } from '../theme2/mockData'
import { tracksToTheme2 } from '../theme2/fromTracks'
import type { FlmProject } from '../useFlmProject'

// Template 02 — tampilan playlist ala FL Studio. Cuma beda TAMPILAN dari
// Template 01: data project (trackList) dan logic import .flm/.zip-nya sama
// persis, satu implementasi di useFlmProject.ts (dipegang App.tsx, dikirim
// ke sini lewat props) — di sini tinggal dikonversi ke bentuk MockTrack lewat
// theme2/fromTracks.ts buat digambar PlaylistFrame. Belum ada project yang
// di-import -> tetap tampil mock-up statis kayak semula.

const MIN_SCALE = 0.55

type EditorTheme2Props = FlmProject & { onBackToTemplates?: () => void }

export default function EditorTheme2({
  onBackToTemplates,
  trackList,
  flmStatus,
  flmError,
  isImportingFlm,
  handleImportFlm,
}: EditorTheme2Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Belum ada project ke-import -> trackList masih array kosong (default di
  // useFlmProject.ts) -> biarin `data` null biar PlaylistFrame jatuh balik
  // ke mock-up statisnya sendiri.
  const data = useMemo(() => (trackList.length > 0 ? tracksToTheme2(trackList) : null), [trackList])

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
          disabled={isImportingFlm}
          className="rounded-md border border-black/20 bg-[#3B6FA0] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {isImportingFlm ? 'Mem-parsing project…' : 'Import Project (.zip / .flm)'}
        </button>
        <input ref={fileInputRef} type="file" accept=".zip,.flm" className="hidden" onChange={handleFileInputChange} />
      </div>

      {flmStatus && (
        <div className="w-full rounded-md bg-[#1d3a2a] px-3 py-1.5 text-[12px] text-white/85" style={{ maxWidth: DESIGN_W }}>
          {flmStatus}
        </div>
      )}
      {flmError && (
        <div className="w-full rounded-md bg-[#5A2A2A] px-3 py-1.5 text-[12px] text-white/90" style={{ maxWidth: DESIGN_W }}>
          {flmError}
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
