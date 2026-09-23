import type { SVGProps } from 'react'

/**
 * Icon set khusus komponen "marketing" (di-port dari repo rizwoow).
 * Cuma taruh icon yang dipakai komponen marketing di sini — jangan
 * copy seluruh icons.tsx rizwoow, tambahin satu-satu sesuai komponen
 * yang dimigrasi.
 */

/** Tile Waveform — mini waveform preview, dipakai di ProductCard. */
export function TileWaveformIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M2.66669 9.77865L2.66669 6.22309M5.33335 12.4453L5.33335 3.55642M8.00002 10.4453L8.00002 5.55642M10.6667 11.112L10.6667 4.88976M13.3334 9.11198L13.3334 6.88976"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
