import { useRef, useState } from 'react'
import { RulerBar } from './components/RulerBar'
import { TrackRow } from './components/TrackRow'
import { AutomationLane } from './components/AutomationLane'
import { Playhead } from './components/Playhead'
import { tracks, TIMELINE_START, TIMELINE_END } from './tracks'

const BAR_WIDTH = 96
const LABEL_WIDTH = 72
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
    <div className="force-landscape flex min-h-dvh items-center justify-center bg-[#1a1a1d] p-4">
      {/* Landscape canvas — fixed 16:9, holds the whole playlist/arrangement view */}
      <div className="flex aspect-video w-full max-w-[1280px] flex-col overflow-hidden rounded-lg border border-black/40 bg-surface-base text-track-melodic-ink">
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

            <AutomationLane label="Level" totalBars={TOTAL_BARS} barWidth={BAR_WIDTH} labelWidth={LABEL_WIDTH} />
            <AutomationLane
              label="Frequency : FX Filter"
              totalBars={TOTAL_BARS}
              barWidth={BAR_WIDTH}
              labelWidth={LABEL_WIDTH}
              teeth={70}
            />

            <div className="pointer-events-none absolute inset-0" style={{ left: LABEL_WIDTH }}>
              <Playhead x={playheadX} onDrag={handleDrag} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
