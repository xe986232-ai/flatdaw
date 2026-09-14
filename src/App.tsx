import { useRef, useState } from 'react'
import { RulerBar } from './components/RulerBar'
import { TrackRow } from './components/TrackRow'
import { Playhead } from './components/Playhead'
import { tracks, TIMELINE_START, TIMELINE_END } from './tracks'

const BAR_WIDTH = 96
const LABEL_WIDTH = 128
const TOTAL_BARS = TIMELINE_END - TIMELINE_START

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [playheadBar, setPlayheadBar] = useState(207)

  const playheadX = (playheadBar - TIMELINE_START) * BAR_WIDTH

  const handleDrag = (clientX: number) => {
    const container = scrollRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const localX = clientX - rect.left + container.scrollLeft - LABEL_WIDTH
    const bar = TIMELINE_START + localX / BAR_WIDTH
    const clamped = Math.min(TIMELINE_END, Math.max(TIMELINE_START, bar))
    setPlayheadBar(Math.round(clamped * 4) / 4)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1a1d] p-4">
      {/* Landscape canvas — fixed 16:9, holds the whole playlist/arrangement view */}
      <div className="flex aspect-video w-full max-w-[1280px] flex-col overflow-hidden rounded-lg border border-black/40 bg-surface-base text-track-melodic-ink shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-surface-grid/50 bg-surface-base px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight">Arrangement</span>
            <span className="rounded-full bg-black/5 px-2.5 py-0.5 font-mono-daw text-[11px] text-track-melodic-ink/60">
              mockup · non-functional
            </span>
          </div>
          <div className="font-mono-daw text-[12px] text-track-melodic-ink/50">bar {playheadBar.toFixed(2)}</div>
        </header>

        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
          <RulerBar startBar={TIMELINE_START} endBar={TIMELINE_END} barWidth={BAR_WIDTH} labelWidth={LABEL_WIDTH} />

          <div className="relative">
            {tracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                barWidth={BAR_WIDTH}
                labelWidth={LABEL_WIDTH}
                totalBars={TOTAL_BARS}
              />
            ))}

            <div className="pointer-events-none absolute inset-0" style={{ left: LABEL_WIDTH }}>
              <Playhead x={playheadX} onDrag={handleDrag} />
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-surface-grid/50 bg-surface-base px-5 py-2 font-mono-daw text-[11px] text-track-melodic-ink/40">
          drag the playhead to scrub · clip content is static placeholder data
        </footer>
      </div>
    </div>
  )
}
