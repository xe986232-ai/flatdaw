import type { Track } from '../tracks'
import { ClipBlock } from './ClipBlock'
import { TrackIcon } from './TrackIcon'

const railByKind: Record<Track['kind'], string> = {
  marker: 'bg-track-marker/20',
  melodic: 'bg-track-melodic/20',
  lead: 'bg-track-lead/25',
  drum: 'bg-track-drum/25',
  perc: 'bg-track-perc/20',
  accent: 'bg-track-accent/20',
}

const iconInkByKind: Record<Track['kind'], string> = {
  marker: 'text-track-marker',
  melodic: 'text-track-melodic',
  lead: 'text-track-drum',
  drum: 'text-track-drum',
  perc: 'text-track-perc',
  accent: 'text-track-accent',
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
        className="sticky left-0 z-10 flex shrink-0 items-center justify-center border-r border-surface-grid/40 bg-surface-base"
        style={{ width: labelWidth, height }}
      >
        <span className={iconInkByKind[track.kind]}>
          <TrackIcon kind={track.kind} />
        </span>
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
