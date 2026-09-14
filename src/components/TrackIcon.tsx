import type { TrackKind } from '../tracks'
import type { JSX } from 'react'

function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <rect x="3" y="10" width="3" height="10" rx="1" fill="currentColor" />
      <rect x="9" y="5" width="3" height="15" rx="1" fill="currentColor" />
      <rect x="15" y="12" width="3" height="8" rx="1" fill="currentColor" />
      <rect x="21" y="7" width="0" height="0" fill="none" />
    </svg>
  )
}

function KeysIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <rect x="2" y="5" width="3.4" height="16" rx="0.5" fill="currentColor" />
      <rect x="6.4" y="5" width="3.4" height="16" rx="0.5" fill="currentColor" />
      <rect x="10.8" y="5" width="3.4" height="16" rx="0.5" fill="currentColor" />
      <rect x="15.2" y="5" width="3.4" height="16" rx="0.5" fill="currentColor" />
      <rect x="19.6" y="5" width="2.4" height="16" rx="0.5" fill="currentColor" />
    </svg>
  )
}

function WaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M1 12 L4 12 L6 6 L9 18 L12 3 L15 21 L18 8 L20 16 L23 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StepsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <circle cx="4" cy="18" r="2" fill="currentColor" />
      <circle cx="10" cy="18" r="2" fill="currentColor" />
      <circle cx="16" cy="18" r="2" fill="currentColor" />
      <circle cx="22" cy="18" r="0" fill="currentColor" />
      <circle cx="4" cy="8" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="10" cy="8" r="2" fill="currentColor" />
      <circle cx="16" cy="8" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

function ScribbleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M2 8 Q7 4 12 8 T22 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M2 16 Q7 12 12 16 T22 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}

const iconByKind: Record<TrackKind, () => JSX.Element> = {
  marker: ScribbleIcon,
  melodic: KeysIcon,
  lead: BarsIcon,
  drum: BarsIcon,
  perc: StepsIcon,
  accent: WaveIcon,
}

export function TrackIcon({ kind }: { kind: TrackKind }) {
  const Icon = iconByKind[kind]
  return <Icon />
}
