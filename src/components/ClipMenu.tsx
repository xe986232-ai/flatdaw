import { useEffect, useState } from 'react'

export type ClipMenuAction = 'copy' | 'delete' | 'snap' | 'edit' | 'cut' | 'duplicate'

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
]

function Bubble({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: 'rgba(255,255,255,0.95)', color: '#141414' }}
    >
      {label}
    </button>
  )
}

export function ClipMenu({
  flipDown = false,
  onAction,
}: {
  flipDown?: boolean
  onAction: (action: ClipMenuAction) => void
}) {
  // Small mount-in transition so the menu pops in rather than snapping into place.
  const [shown, setShown] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const items = expanded ? SECONDARY : PRIMARY

  return (
    <div
      data-clip-interactive="true"
      className={`pointer-events-auto absolute left-1/2 z-40 flex -translate-x-1/2 -space-x-2 ${
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
