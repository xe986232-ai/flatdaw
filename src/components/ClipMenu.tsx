import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'

export type ClipMenuAction = 'edit' | 'copy' | 'duplicate' | 'cut' | 'delete'

function EditIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.4 3.6 16.4 6.6 7 16H4v-3z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="7" width="9" height="9" rx="1" />
      <path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7" />
    </svg>
  )
}

function DuplicateIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="10" height="10" rx="1" />
      <path d="M4 12V5.5A1.5 1.5 0 0 1 5.5 4H12" />
      <path d="M9.5 11h3M11 9.5v3" />
    </svg>
  )
}

function CutIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.2" cy="5.2" r="2" />
      <circle cx="5.2" cy="14.8" r="2" />
      <path d="M7 6.6 16 14.8M16 5.2 7 13.4" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 6h11M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6M6 6l.6 9a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9L14 6" />
    </svg>
  )
}

const ITEMS: { action: ClipMenuAction; label: string; icon: ComponentType; warn?: boolean }[] = [
  { action: 'edit', label: 'Edit', icon: EditIcon },
  { action: 'copy', label: 'Copy', icon: CopyIcon },
  { action: 'duplicate', label: 'Duplicate', icon: DuplicateIcon },
  { action: 'cut', label: 'Cut', icon: CutIcon, warn: true },
  { action: 'delete', label: 'Delete', icon: DeleteIcon, warn: true },
]

export function ClipMenu({
  flipDown = false,
  onAction,
}: {
  flipDown?: boolean
  onAction: (action: ClipMenuAction) => void
}) {
  // Small mount-in transition so the menu pops in rather than snapping into place.
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      data-clip-interactive="true"
      className={`pointer-events-auto absolute left-1/2 z-40 flex -translate-x-1/2 gap-1 ${
        flipDown ? 'top-full mt-2' : 'bottom-full mb-2'
      }`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {ITEMS.map(({ action, label, icon: Icon, warn }, i) => (
        <button
          key={action}
          type="button"
          onClick={() => onAction(action)}
          className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10px] font-medium transition-all duration-150 ease-out"
          style={{
            backgroundColor: warn ? '#E76F51' : '#4A2530',
            color: '#FFFFFF',
            transitionDelay: `${i * 20}ms`,
            transform: shown ? 'scale(1)' : 'scale(0.85)',
            opacity: shown ? 1 : 0,
          }}
        >
          <Icon />
          {label}
        </button>
      ))}
    </div>
  )
}
