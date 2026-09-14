import type { Track } from '../tracks'
import type { FlatColor } from '../colors'
import { ClipBlock } from './ClipBlock'
import { TrackIcon } from './TrackIcon'
import type { ClipMenuAction } from './ClipMenu'

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
  timelineStart,
  timelineEnd,
  height = 56,
  color,
  onClipMove,
  openMenuClipId = null,
  editingClipId = null,
  flipMenuDown = false,
  onClipClick,
  onMenuAction,
  onRenameCommit,
  onBackgroundClick,
}: {
  track: Track
  barWidth: number
  labelWidth: number
  totalBars: number
  timelineStart: number
  timelineEnd: number
  height?: number
  color?: FlatColor
  onClipMove?: (clipId: string, newStartBar: number) => void
  openMenuClipId?: string | null
  editingClipId?: string | null
  flipMenuDown?: boolean
  onClipClick?: (clipId: string) => void
  onMenuAction?: (clipId: string, action: ClipMenuAction) => void
  onRenameCommit?: (clipId: string, label: string) => void
  onBackgroundClick?: (bar: number) => void
}) {
  return (
    <div className="box-border flex">
      <div
        className="sticky left-0 z-10 box-border flex shrink-0 items-center justify-center bg-surface-base"
        style={{ width: labelWidth, height }}
      >
        <span className={color ? '' : iconInkByKind[track.kind]} style={{ color: color?.fill }}>
          <TrackIcon kind={track.kind} />
        </span>
      </div>
      <div
        className="relative box-border"
        style={{ width: totalBars * barWidth, height }}
        onClick={(e) => {
          if (!onBackgroundClick) return
          const rect = e.currentTarget.getBoundingClientRect()
          const localX = e.clientX - rect.left
          onBackgroundClick(timelineStart + localX / barWidth)
        }}
      >
        {track.clips.map((clip) => (
          <ClipBlock
            key={clip.id}
            clip={clip}
            kind={track.kind}
            barWidth={barWidth}
            timelineStart={timelineStart}
            timelineEnd={timelineEnd}
            color={color}
            onStartBarChange={onClipMove}
            isMenuOpen={openMenuClipId === clip.id}
            isEditing={editingClipId === clip.id}
            flipMenuDown={flipMenuDown}
            onClipClick={onClipClick}
            onMenuAction={onMenuAction}
            onRenameCommit={onRenameCommit}
          />
        ))}
      </div>
    </div>
  )
}
