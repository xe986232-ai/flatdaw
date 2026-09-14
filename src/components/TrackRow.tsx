import type { Track } from '../tracks'
import type { FlatColor } from '../colors'
import { hexToRgba } from '../colors'
import { ClipBlock } from './ClipBlock'
import { TrackIcon } from './TrackIcon'
import type { ClipMenuAction } from './ClipMenu'

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
  timelineStart,
  timelineEnd,
  height = 56,
  color,
  showDivider = true,
  showHighlight = true,
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
  showDivider?: boolean
  showHighlight?: boolean
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
    <div className={`box-border flex border-b-2 ${showDivider ? 'border-row-divider' : 'border-transparent'}`}>
      <div
        className="sticky left-0 z-10 box-border flex shrink-0 items-center justify-center border-r border-surface-grid/40 bg-surface-base"
        style={{ width: labelWidth, height }}
      >
        <span className={color ? '' : iconInkByKind[track.kind]} style={{ color: color?.fill }}>
          <TrackIcon kind={track.kind} />
        </span>
      </div>
      <div
        className={`relative box-border ${showHighlight && !color ? railByKind[track.kind] : ''}`}
        style={{
          width: totalBars * barWidth,
          height,
          backgroundColor: showHighlight && color ? hexToRgba(color.fill, 0.2) : undefined,
        }}
        onClick={(e) => {
          if (!onBackgroundClick) return
          const rect = e.currentTarget.getBoundingClientRect()
          const localX = e.clientX - rect.left
          onBackgroundClick(timelineStart + localX / barWidth)
        }}
      >
        {/* bar grid lines */}
        {Array.from({ length: totalBars + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-surface-grid/40"
            style={{ left: i * barWidth }}
          />
        ))}
        {/* beat subdivisions — denser grid inside each bar */}
        {Array.from({ length: totalBars }).map((_, i) =>
          [0.25, 0.5, 0.75].map((frac) => (
            <div
              key={`${i}-${frac}`}
              className="absolute top-0 bottom-0 border-l border-surface-grid/15"
              style={{ left: i * barWidth + barWidth * frac }}
            />
          )),
        )}
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
