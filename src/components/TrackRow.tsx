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
  // Bar lines + beat subdivisions used to be ~4 absolute-positioned divs per bar
  // (x totalBars, x every track row) — hundreds of DOM nodes per row that all
  // had to be diffed/repainted on every zoom tick. A background pattern draws
  // the exact same grid with zero extra DOM.
  //
  // IMPORTANT: this is a plain (non-repeating) linear-gradient describing just
  // ONE bar's worth of pattern, tiled via backgroundSize/backgroundRepeat —
  // not `repeating-linear-gradient` stretched across the whole row. A row can
  // be tens of thousands of px wide at high zoom × 80 bars, and browsers lose
  // floating-point precision computing one giant repeating gradient over that
  // distance, which is what made lines vanish partway across. Tiling a single
  // bar-sized tile keeps every repeat identically precise.
  const gridBackground = [
    // beat subdivisions at 25/50/75% of each bar, faint
    `linear-gradient(to right,
      transparent 0, transparent ${barWidth * 0.25 - 0.5}px,
      rgba(201, 168, 188, 0.15) ${barWidth * 0.25 - 0.5}px, rgba(201, 168, 188, 0.15) ${barWidth * 0.25 + 0.5}px,
      transparent ${barWidth * 0.25 + 0.5}px, transparent ${barWidth * 0.5 - 0.5}px,
      rgba(201, 168, 188, 0.15) ${barWidth * 0.5 - 0.5}px, rgba(201, 168, 188, 0.15) ${barWidth * 0.5 + 0.5}px,
      transparent ${barWidth * 0.5 + 0.5}px, transparent ${barWidth * 0.75 - 0.5}px,
      rgba(201, 168, 188, 0.15) ${barWidth * 0.75 - 0.5}px, rgba(201, 168, 188, 0.15) ${barWidth * 0.75 + 0.5}px,
      transparent ${barWidth * 0.75 + 0.5}px, transparent ${barWidth}px)`,
    // main bar boundary line
    `linear-gradient(to right, rgba(201, 168, 188, 0.4) 0, rgba(201, 168, 188, 0.4) 1px, transparent 1px, transparent ${barWidth}px)`,
  ].join(', ')

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
          backgroundImage: gridBackground,
          backgroundSize: `${barWidth}px 100%`,
          backgroundRepeat: 'repeat',
        }}
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
