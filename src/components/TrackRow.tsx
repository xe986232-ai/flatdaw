import { useMemo } from 'react'
import type { Track } from '../tracks'
import type { FlatColor } from '../colors'
import { ClipBlock } from './ClipBlock'
import { TrackIcon } from './TrackIcon'
import type { ClipMenuAction } from './ClipMenu'
import { buildArrangementGrid } from '../grid'

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
  isSelected = false,
  onClipClick,
  onMenuAction,
  onRenameCommit,
  onBackgroundClick,
  onTrackClick,
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
  isSelected?: boolean
  onClipClick?: (clipId: string) => void
  onMenuAction?: (clipId: string, action: ClipMenuAction) => void
  onRenameCommit?: (clipId: string, label: string) => void
  onBackgroundClick?: (bar: number) => void
  onTrackClick?: () => void
}) {
  const gridStyle = useMemo(() => buildArrangementGrid(barWidth), [barWidth])

  return (
    <div className="box-border flex border-b border-row-divider">
      <div
        data-track-interactive="true"
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        onClick={onTrackClick}
        className={`sticky left-0 z-10 box-border flex shrink-0 cursor-pointer items-center justify-center border-r border-surface-grid/60 bg-surface-panel ${
          isSelected ? 'ring-2 ring-inset ring-white' : ''
        }`}
        style={{ width: labelWidth, height }}
      >
        <span className={color ? '' : iconInkByKind[track.kind]} style={{ color: color?.fill }}>
          <TrackIcon kind={track.kind} />
        </span>
      </div>
      <div
        className="relative box-border shrink-0 bg-surface-base"
        style={{ width: totalBars * barWidth, height, ...gridStyle }}
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
            trackName={track.name}
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
