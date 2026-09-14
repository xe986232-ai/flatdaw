import type { Track } from '../tracks'
import { ClipBlock } from './ClipBlock'

const railByKind: Record<Track['kind'], string> = {
  marker: 'bg-track-marker/15',
  melodic: 'bg-track-melodic/15',
  lead: 'bg-track-lead/15',
  drum: 'bg-track-drum/15',
  perc: 'bg-track-perc/15',
  accent: 'bg-track-accent/15',
}

export function TrackRow({
  track,
  barWidth,
  labelWidth,
  totalBars,
  height = 56,
}: {
  track: Track
  barWidth: number
  labelWidth: number
  totalBars: number
  height?: number
}) {
  return (
    <div className="flex border-b border-white/5">
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center border-r border-white/5 bg-[#151318] px-3"
        style={{ width: labelWidth, height }}
      >
        <span className="truncate text-[12px] font-medium text-white/70">{track.name}</span>
      </div>
      <div
        className={`relative ${railByKind[track.kind]}`}
        style={{ width: totalBars * barWidth, height }}
      >
        {/* bar grid lines */}
        {Array.from({ length: totalBars + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-white/[0.06]"
            style={{ left: i * barWidth }}
          />
        ))}
        {track.clips.map((clip) => (
          <ClipBlock key={clip.id} clip={clip} kind={track.kind} barWidth={barWidth} />
        ))}
      </div>
    </div>
  )
}
