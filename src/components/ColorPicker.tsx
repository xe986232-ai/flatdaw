import { useMemo, useState, useEffect } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

// Custom color picker bikinan sendiri — GANTI <input type="color"> native.
// Alasannya: di browser Android (Chrome/WebView), <input type="color">
// nge-trigger color picker BAWAAN SISTEM (bukan UI kita), yang tampilannya
// beda-beda tiap device/OEM dan gak bisa di-style sama sekali. Komponen ini
// nge-render semuanya sendiri (kotak saturation/value + slider hue + input
// hex manual) pake pointer events, jadi konsisten di semua platform dan
// gaya visualnya nyambung sama swatch "Warna cepat" (FLAT_PALETTE) yang
// udah ada.

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  const v = max
  return { h, s, v }
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function isValidHex(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v)
}

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  // Hue disimpen di state internal (bukan cuma diturunin dari `value` tiap
  // render) — soalnya pas saturation/value jadi 0 (abu-abu/hitam/putih),
  // informasi hue-nya "ilang" dari hex, jadi handle-nya bakal lompat ke hue
  // 0 kalau ngandelin derive doang. Disinkronin ulang tiap `value` berubah
  // dari LUAR (misal ganti track lain / reset), tapi drag di komponen ini
  // sendiri gak numpuk sinkronisasi ekstra (lihat guard di useEffect).
  const derived = useMemo(() => hexToHsv(value), [value])
  const [hue, setHue] = useState(derived.h)
  const [hexInput, setHexInput] = useState(value.toUpperCase())

  useEffect(() => {
    setHexInput(value.toUpperCase())
    // Cuma nge-sync hue kalau warnanya masih ada saturation (biar drag di
    // dalam SV square sendiri — yang juga manggil onChange lalu bikin
    // `value` berubah — gak numpuk balik override hue yg lagi digeser).
    if (derived.s > 0.02) setHue(derived.h)
  }, [value, derived.h, derived.s])

  const { s, v } = derived

  const updateFromSquare = (el: HTMLDivElement, clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect()
    const ns = clamp01((clientX - rect.left) / rect.width)
    const nv = clamp01(1 - (clientY - rect.top) / rect.height)
    onChange(hsvToHex(hue, ns, nv))
  }

  const updateFromHue = (el: HTMLDivElement, clientX: number) => {
    const rect = el.getBoundingClientRect()
    const t = clamp01((clientX - rect.left) / rect.width)
    const nh = t * 360
    setHue(nh)
    onChange(hsvToHex(nh, s || 1, v || 1))
  }

  const handleSquareDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromSquare(e.currentTarget, e.clientX, e.clientY)
  }
  const handleSquareMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return
    updateFromSquare(e.currentTarget, e.clientX, e.clientY)
  }

  const handleHueDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromHue(e.currentTarget, e.clientX)
  }
  const handleHueMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return
    updateFromHue(e.currentTarget, e.clientX)
  }

  const commitHexInput = (raw: string) => {
    const withHash = raw.startsWith('#') ? raw : `#${raw}`
    if (isValidHex(withHash)) {
      onChange(withHash)
    } else {
      setHexInput(value.toUpperCase())
    }
  }

  const hueColor = `hsl(${hue}, 100%, 50%)`

  return (
    <div className="flex flex-col gap-2.5">
      <div
        onPointerDown={handleSquareDown}
        onPointerMove={handleSquareMove}
        className="relative h-[120px] w-full touch-none rounded-sm"
        style={{
          backgroundColor: hueColor,
          backgroundImage:
            'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)',
        }}
      >
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${s * 100}%`, bottom: `${v * 100}%` }}
        />
      </div>

      <div
        onPointerDown={handleHueDown}
        onPointerMove={handleHueMove}
        className="relative h-3.5 w-full touch-none rounded-full"
        style={{
          background:
            'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
        }}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${(hue / 360) * 100}%`, backgroundColor: hueColor }}
        />
      </div>

      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 shrink-0 rounded border border-black/30"
          style={{ backgroundColor: isValidHex(hexInput) ? hexInput : value }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={(e) => commitHexInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          maxLength={7}
          className="h-7 w-full rounded border border-white/15 bg-[#1a1a1d] px-2 text-[12px] text-white/85 outline-none focus:border-white/40"
        />
      </div>
    </div>
  )
}
