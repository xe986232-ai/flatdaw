import type { ReactNode } from 'react'

type IconProps = { size?: number; className?: string }

function Svg({ size = 16, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/* ---------- Tool di toolbar ---------- */

export const IconDraw = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 13.5l.8-3.2 7.6-7.6a1.4 1.4 0 0 1 2 0l.4.4a1.4 1.4 0 0 1 0 2l-7.6 7.6z" />
    <path d="M9.6 3.9l2.5 2.5" />
  </Svg>
)

export const IconPaint = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="2.5" width="9" height="4" rx="1" />
    <path d="M11.5 4.5h1.5v3.5H8v2" />
    <rect x="6.6" y="10" width="2.8" height="4" rx="0.8" />
  </Svg>
)

export const IconDelete = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M4.1 11.9l7.8-7.8" />
  </Svg>
)

export const IconMute = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 6.2h2.4L8 3.5v9L4.9 9.8H2.5z" />
    <path d="M10.5 6l3 4M13.5 6l-3 4" />
  </Svg>
)

export const IconSlip = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 8h12M4.6 5.4L2 8l2.6 2.6M11.4 5.4L14 8l-2.6 2.6" />
  </Svg>
)

export const IconSlice = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 2.5l4 4-7.8 7.8-3.2-.8-.8-3.2z" />
    <path d="M7 5l4 4" />
  </Svg>
)

export const IconSelect = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.5" y="3.5" width="11" height="9" rx="1" strokeDasharray="2.2 2" />
  </Svg>
)

export const IconZoom = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7" cy="7" r="4.3" />
    <path d="M10.2 10.2L13.8 13.8" />
  </Svg>
)

export const IconSpeaker = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 6.2h2.4L8 3.5v9L4.9 9.8H2.5z" />
    <path d="M10.4 5.8a3.2 3.2 0 0 1 0 4.4M12.2 4a5.6 5.6 0 0 1 0 8" />
  </Svg>
)

export const IconMagnet = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 13V7.5a5 5 0 0 1 10 0V13" />
    <path d="M3 10.5h3V13M10 10.5h3V13" />
  </Svg>
)

/* ---------- Transport ---------- */

export const IconPlay = ({ size = 14, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" className={className} aria-hidden="true">
    <path d="M3 1.8v10.4L12 7z" fill="currentColor" />
  </svg>
)

export const IconStop = ({ size = 14, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" className={className} aria-hidden="true">
    <rect x="2.5" y="2.5" width="9" height="9" rx="1" fill="currentColor" />
  </svg>
)

export const IconRecord = ({ size = 14, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" className={className} aria-hidden="true">
    <circle cx="7" cy="7" r="4.6" fill="currentColor" />
  </svg>
)

/* ---------- Ikon di label clip (kecil, solid) ---------- */

// Audio: panah ke garis, sama kayak penanda sample di FL.
export const ClipAudioIcon = ({ size = 11, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" className={className} aria-hidden="true">
    <path d="M1 3.2L5.2 6 1 8.8z" fill="currentColor" />
    <rect x="6" y="2.6" width="1.6" height="6.8" fill="currentColor" />
    <path d="M8.6 6h2.6" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

// Pattern: tiga batang bertumpuk.
export const ClipPatternIcon = ({ size = 11, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" className={className} aria-hidden="true">
    <rect x="1" y="1.5" width="10" height="2" rx="0.5" fill="currentColor" />
    <rect x="1" y="5" width="6.5" height="2" rx="0.5" fill="currentColor" />
    <rect x="1" y="8.5" width="8.5" height="2" rx="0.5" fill="currentColor" />
  </svg>
)

// Automation: kurva dengan satu titik.
export const ClipAutomationIcon = ({ size = 11, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" className={className} aria-hidden="true">
    <path d="M1.5 9.5C4 9.5 4 3 6.5 3S9 8 10.8 8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="6.5" cy="3" r="1.5" fill="currentColor" />
  </svg>
)

/* ---------- Header track ---------- */

export const TrackKeysIcon = ({ size = 13, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" className={className} aria-hidden="true">
    <rect x="1" y="2" width="12" height="10" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.3 2v10M7 2v10M9.7 2v10" stroke="currentColor" strokeWidth="1.2" />
    <rect x="3.3" y="2" width="2" height="5.6" fill="currentColor" />
    <rect x="6" y="2" width="2" height="5.6" fill="currentColor" />
    <rect x="8.7" y="2" width="2" height="5.6" fill="currentColor" />
  </svg>
)

export const TrackWaveIcon = ({ size = 13, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" className={className} aria-hidden="true">
    <path
      d="M1.5 7h1.2M4 4.5v5M5.8 2.5v9M7.6 5v4M9.4 3.5v7M11.2 5.5v3M12.5 7h.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

/* ---------- Tab panel kiri ---------- */

export const TabPatternIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 4h11M2.5 8h7M2.5 12h9" strokeWidth={2} />
  </Svg>
)

export const TabAudioIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 8h1M4.5 5v6M7 3v10M9.5 5.5v5M12 6.5v3M14 8h.5" />
  </Svg>
)

export const TabAutomationIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12c3 0 3.5-8 6-8s2.8 6 6 6" />
    <circle cx="8" cy="4" r="1.3" fill="currentColor" />
  </Svg>
)

/* ---------- Tombol jendela ---------- */

export const WinMinIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M1.5 7.5h7" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)

export const WinMaxIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <rect x="1.8" y="1.8" width="6.4" height="6.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)

export const WinCloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)
