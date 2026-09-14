import type { Track } from '../tracks'
import { ClipBlock } from './ClipBlock'

const railByKind: Record<Track['kind'], string> = {
  marker: 'bg-track-marker/20',
  melodic: 'bg-track-melodic/20',
  lead: 'bg-track-lead/25',
  drum: 'bg-track-drum/25',
  perc: 'bg-track-perc/20',
  accent: 'bg-track-accent/20',
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
    <div className="flex border-b border-surface-grid/30">
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center border-r border-surface-grid/40 bg-surface-base px-3"
        style={{ width: labelWidth, height }}
      >
        <span className="truncate text-[12px] font-medium text-track-melodic-ink/80">{track.name}</span>
      </div>
      <div
        className={`relative ${railByKind[track.kind]}`}
        style={{ width: totalBars * barWidth, height }}
      >
        {/* bar grid lines */}
        {Array.from({ length: totalBars + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-surface-grid/25"
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
