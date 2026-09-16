import { useEffect, useState } from 'react'

export type ClipMenuAction = 'copy' | 'delete' | 'snap' | 'edit' | 'cut' | 'duplicate' | 'rename' | 'stretchFit'

const PRIMARY: { action: ClipMenuAction | 'more'; label: string }[] = [
  { action: 'copy', label: 'Copy' },
  { action: 'delete', label: 'Delete' },
  { action: 'snap', label: 'Snap' },
  { action: 'edit', label: 'Edit' },
  { action: 'more', label: 'More...' },
]

const SECONDARY: { action: ClipMenuAction; label: string }[] = [
  { action: 'cut', label: 'Cut' },
  { action: 'duplicate', label: 'Duplicate' },
  { action: 'rename', label: 'Rename' },
]

// Item tambahan yang cuma nongol buat clip audio (isAudioClip, lihat
// ClipBlock) yang punya "celah" di kanan (nativeSpanBars < lengthBars,
// one-shot) — toggle MURNI visual buat nge-scale gambar waveform-nya sampe
// mentok tepi kanan clip, gak ngubah clip lain sama sekali (lihat
// WaveformCanvas.tsx & clip.waveformStretchToFit di tracks.ts).
const STRETCH_FIT_ITEM: { action: ClipMenuAction; label: string } = {
  action: 'stretchFit',
  label: 'Fit Waveform',
}

function Bubble({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[9px] font-medium whitespace-nowrap"
      style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#141414' }}
    >
      {label}
    </button>
  )
}

export function ClipMenu({
  flipDown = false,
  onAction,
  showStretchFit = false,
}: {
  flipDown?: boolean
  onAction: (action: ClipMenuAction) => void
  // true kalau clip pemilik menu ini adalah audio clip yang lagi nyisa
  // celah blank (lihat ClipBlock: isAudioClip && punya nativeSpanBars <
  // lengthBars) — nampilin item "Fit Waveform" di tab "More...". Default
  // false biar clip non-audio (instrument/pattern) gak keliatan item yang
  // gak relevan buat mereka.
  showStretchFit?: boolean
}) {
  // Small mount-in transition so the menu pops in rather than snapping into place.
  const [shown, setShown] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const secondaryItems = showStretchFit ? [...SECONDARY, STRETCH_FIT_ITEM] : SECONDARY
  const items = expanded ? secondaryItems : PRIMARY

  return (
    <div
      data-clip-interactive="true"
      className={`pointer-events-auto absolute left-1/2 z-40 flex -translate-x-1/2 gap-1.5 ${
        flipDown ? 'top-full mt-2' : 'bottom-full mb-2'
      }`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map(({ action, label }, i) => (
        <div
          key={action}
          className="transition-all duration-150 ease-out"
          style={{
            transitionDelay: `${i * 20}ms`,
            transform: shown ? 'scale(1)' : 'scale(0.85)',
            opacity: shown ? 1 : 0,
          }}
        >
          <Bubble
            label={label}
            onClick={() => (action === 'more' ? setExpanded(true) : onAction(action))}
          />
        </div>
      ))}
    </div>
  )
}
