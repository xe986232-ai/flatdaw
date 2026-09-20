import type { ReactNode } from 'react'
import { BAR_W, type MockClip, type PatternStyle, type WaveStyle } from './mockData'
import { fitLabel, makeRng, mix, rgba } from './utils'
import { ClipAudioIcon, ClipAutomationIcon, ClipPatternIcon } from './icons'
import type { WaveformPeaksData } from '../tracks'
import { sampleWaveformColumns, type MultiResPeaks } from '../waveformPeaksMultiRes'

const LABEL_H = 14
const INK = '#161d22'
const BEAT_W = BAR_W / 4
const STEP_W = BAR_W / 16

/* ---------- Waveform ASLI (dari data peak audio beneran) ---------- */

// Sampel-sampel (per lane/channel) jadi satu path SVG solid tertutup, niru
// gaya gambar drawLane() di WaveformCanvas.tsx (Template 01) tapi keluarannya
// path SVG, bukan langsung fill ke <canvas> -- biar konsisten sama komponen
// SVG lain di ClipMock. n kolom = n titik horizontal, 1 kolom pas w kecil
// (clip pendek) sampe w piksel pas gede, sampleWaveformColumns yang milih
// resolusi mipmap paling pas otomatis.
function laneSvgPath(maxs: ArrayLike<number>, mins: ArrayLike<number>, w: number, midY: number, amp: number): string {
  const n = maxs.length
  if (n === 0) return ''
  const slotW = w / n
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = i * slotW
    const y = midY - maxs[i] * amp
    d += i === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : ` L${x.toFixed(1)} ${y.toFixed(1)}`
  }
  for (let i = n - 1; i >= 0; i--) {
    const x = i * slotW
    const y = midY + Math.abs(mins[i]) * amp
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d + ' Z'
}

function RealWaveSvg({
  w,
  h,
  color,
  multiRes,
  peaks,
}: {
  w: number
  h: number
  color: string
  multiRes?: MultiResPeaks
  peaks?: WaveformPeaksData
}) {
  const isStereo = !!multiRes && multiRes.stages.length > 0 && multiRes.numChannels >= 2

  if (isStereo && multiRes) {
    const laneH = h / 2
    const laneAmp = (laneH / 2) * 0.92
    const left = sampleWaveformColumns(multiRes, 0, { x0: 0, x1: w, u0: 0, u1: multiRes.numFrames })
    const right = sampleWaveformColumns(multiRes, 1, { x0: 0, x1: w, u0: 0, u1: multiRes.numFrames })
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden="true">
        <path d={laneSvgPath(left.maxs, left.mins, w, laneH / 2, laneAmp)} fill={color} fillOpacity="0.95" />
        <path d={laneSvgPath(right.maxs, right.mins, w, laneH + laneH / 2, laneAmp)} fill={color} fillOpacity="0.95" />
      </svg>
    )
  }

  const midY = h / 2
  const amp = midY * 0.92

  if (multiRes && multiRes.stages.length > 0) {
    const sampled = sampleWaveformColumns(multiRes, 0, { x0: 0, x1: w, u0: 0, u1: multiRes.numFrames })
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden="true">
        <path d={laneSvgPath(sampled.maxs, sampled.mins, w, midY, amp)} fill={color} fillOpacity="0.95" />
      </svg>
    )
  }

  // Fallback terakhir: bucket tetap dari peaks (belum ada multiRes).
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden="true">
      <path d={laneSvgPath(peaks!.max, peaks!.min, w, midY, amp)} fill={color} fillOpacity="0.95" />
    </svg>
  )
}

function hasRealWaveform(clip: MockClip): boolean {
  return !!(clip.waveformMultiRes && clip.waveformMultiRes.stages.length > 0) || !!clip.waveformPeaks
}

/* ---------- Waveform MOCK (fallback, dipakai kalau data asli belum ada) ---------- */

function WaveSvg({ w, h, style, seed, color }: { w: number; h: number; style: WaveStyle; seed: number; color: string }) {
  const rng = makeRng(seed)
  const stepPx = 2
  const n = Math.max(2, Math.floor(w / stepPx))
  const mid = h / 2
  const half = Math.max(2, h / 2 - 2)
  const amps: number[] = []

  for (let i = 0; i <= n; i++) {
    const x = i * stepPx
    let amp: number
    if (style === 'hits') {
      const phase = (x % BEAT_W) / BEAT_W
      amp = (0.12 + 0.88 * Math.exp(-phase * 6)) * (0.65 + 0.35 * rng())
    } else if (style === 'texture') {
      const period = BAR_W / 8
      const phase = (x % period) / period
      amp = (0.2 + 0.8 * Math.exp(-phase * 5)) * (0.6 + 0.4 * rng())
    } else if (style === 'swell') {
      amp = 0.3 + 0.25 * Math.sin(x / 38 + seed) + 0.15 * Math.sin(x / 11 + seed) + 0.1 * rng()
    } else {
      const gate = 0.5 + 0.5 * Math.sin(x / 17 + seed) * Math.sin(x / 53 + seed * 0.3)
      amp = Math.max(0.06, gate) * (0.5 + 0.5 * rng())
    }
    amps.push(Math.min(1, Math.max(0.04, amp)))
  }

  let d = `M0 ${mid}`
  amps.forEach((a, i) => {
    d += ` L${i * stepPx} ${(mid - a * half).toFixed(1)}`
  })
  for (let i = amps.length - 1; i >= 0; i--) {
    d += ` L${i * stepPx} ${(mid + amps[i] * half).toFixed(1)}`
  }
  d += ' Z'

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden="true">
      <line x1="0" x2={w} y1={mid} y2={mid} stroke={color} strokeOpacity="0.5" strokeWidth="1" />
      <path d={d} fill={color} fillOpacity="0.95" />
    </svg>
  )
}

/* ---------- Pattern (titik step / note mini) ---------- */

function PatternSvg({ w, h, style, seed, color }: { w: number; h: number; style: PatternStyle; seed: number; color: string }) {
  const rng = makeRng(seed)
  const els: ReactNode[] = []
  const totalSteps = Math.floor(w / STEP_W)

  if (style === 'steps') {
    // Dua lane titik: lane atas (kick-ish, jarang), lane bawah (lebih rapat).
    const laneA = h * 0.38
    const laneB = h * 0.72
    for (let s = 0; s < totalSteps; s++) {
      const x = s * STEP_W + STEP_W / 2
      const beat = s % 4 === 0
      const onA = s % 16 === 0 || (s % 16 === 10 && seed % 2 === 0)
      const onB = beat || (s % 4 === 2 && rng() > 0.4)
      els.push(<rect key={`a${s}`} x={x - (onA ? 1.6 : 0.7)} y={laneA - (onA ? 1.8 : 0.7)} width={onA ? 3.2 : 1.4} height={onA ? 3.6 : 1.4} fill={color} fillOpacity={onA ? 1 : 0.3} />)
      els.push(<rect key={`b${s}`} x={x - (onB ? 1.3 : 0.7)} y={laneB - (onB ? 1.3 : 0.7)} width={onB ? 2.6 : 1.4} height={onB ? 2.6 : 1.4} fill={color} fillOpacity={onB ? 0.9 : 0.28} />)
    }
  } else {
    const rows = style === 'notes' ? 7 : 3
    const rowH = (h - 6) / rows
    let row = Math.floor(rows / 2)
    let s = 0
    while (s < totalSteps) {
      const skip = rng() < (style === 'notes' ? 0.25 : 0.55)
      const len = 1 + Math.floor(rng() * (style === 'notes' ? 4 : 3))
      if (!skip) {
        const move = Math.floor(rng() * 3) - 1
        row = Math.min(rows - 1, Math.max(0, row + move * (rng() < 0.4 ? 2 : 1)))
        els.push(
          <rect
            key={`n${s}`}
            x={s * STEP_W}
            y={3 + row * rowH}
            width={Math.max(2, len * STEP_W - 1)}
            height={Math.max(1.6, Math.min(3, rowH - 0.8))}
            rx="0.6"
            fill={color}
            fillOpacity="0.95"
          />,
        )
      }
      s += len + (skip ? 1 : 0) + Math.floor(rng() * 2)
    }
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden="true">
      {els}
    </svg>
  )
}

/* ---------- Automation (kurva envelope) ---------- */

function AutoSvg({ w, h, seed, color }: { w: number; h: number; seed: number; color: string }) {
  const rng = makeRng(seed)
  const nodeCount = Math.max(3, Math.round(w / (BAR_W * 1.4)) + 1)
  const pts: [number, number][] = []
  let v = 0.25 + rng() * 0.3
  for (let i = 0; i < nodeCount; i++) {
    const x = (i / (nodeCount - 1)) * w
    v = Math.min(0.9, Math.max(0.12, v + (rng() - 0.45) * 0.55))
    pts.push([x, 3 + (1 - v) * (h - 6)])
  }
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w} ${h} L0 ${h} Z`

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden="true">
      <path d={area} fill={color} fillOpacity="0.16" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.2" fill={INK} stroke={color} strokeWidth="1.3" />
      ))}
    </svg>
  )
}

/* ---------- Clip ---------- */

export function ClipMock({ clip, color, trackHeight, collapsed, viewStartBar }: { clip: MockClip; color: string; trackHeight: number; collapsed?: boolean; viewStartBar: number }) {
  const left = (clip.startBar - viewStartBar) * BAR_W + 1
  const width = clip.lengthBars * BAR_W - 2
  const height = trackHeight - 4
  const light = mix(color, '#ffffff', 0.5)

  if (collapsed) {
    return (
      <div
        className="absolute overflow-hidden"
        style={{
          left,
          top: 2,
          width,
          height,
          background: rgba(color, 0.55),
          borderRadius: 2,
          boxShadow: `inset 0 0 0 1px ${rgba(color, 0.8)}`,
        }}
      >
        {width > 34 && (
          <span className="block truncate px-1 text-[9.5px] font-semibold leading-[16px]" style={{ color: INK }}>
            {clip.label}
          </span>
        )}
      </div>
    )
  }

  const Icon = clip.kind === 'audio' ? ClipAudioIcon : clip.kind === 'pattern' ? ClipPatternIcon : ClipAutomationIcon
  const maxChars = Math.floor((width - 24) / 5.8)
  const bodyH = height - LABEL_H

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left,
        top: 2,
        width,
        height,
        background: rgba(color, 0.2),
        borderRadius: 2,
        boxShadow: `inset 0 0 0 1px ${rgba(color, 0.6)}`,
      }}
    >
      <div
        className="flex items-center gap-[3px] whitespace-nowrap px-[4px] text-[10.5px] font-semibold"
        style={{ height: LABEL_H, background: color, color: INK }}
      >
        <Icon />
        <span>{fitLabel(clip.label, maxChars)}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0" style={{ top: LABEL_H }}>
        {clip.kind === 'audio' &&
          (hasRealWaveform(clip) ? (
            <RealWaveSvg w={width} h={bodyH} color={light} multiRes={clip.waveformMultiRes} peaks={clip.waveformPeaks} />
          ) : (
            <WaveSvg w={width} h={bodyH} style={clip.wave ?? 'swell'} seed={clip.seed} color={light} />
          ))}
        {clip.kind === 'pattern' && <PatternSvg w={width} h={bodyH} style={clip.pattern ?? 'steps'} seed={clip.seed} color={light} />}
        {clip.kind === 'automation' && <AutoSvg w={width} h={bodyH} seed={clip.seed} color={light} />}
      </div>
    </div>
  )
}
