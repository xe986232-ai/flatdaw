import { useMemo } from 'react'
import type { Track } from '../tracks'
import type { FlatColor } from '../colors'
import { ClipBlock } from './ClipBlock'
import { TrackIcon } from './TrackIcon'
import type { ClipMenuAction } from './ClipMenu'
import { buildArrangementGrid } from '../grid'

// Fallback ink kalau track belum punya warna sendiri (color prop kosong) —
// ikon (waveform/keyboard, lihat TrackIcon) tetap kebaca sebelum ada warna
// ditetapkan.
const DEFAULT_ICON_INK = 'text-track-melodic'

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
  // Lebar total row (label + seluruh timeline) — dikasih EKSPLISIT di sini,
  // bukan dibiarin auto. Alasannya: kontainer ini `display:flex` block-level,
  // yang defaultnya cuma selebar parent (area canvas yang keliatan), BUKAN
  // selebar konten di dalamnya. Anak-anaknya (label + area clip) tetap
  // render lebar penuh & bisa discroll, tapi border-b (garis pembatas
  // horizontal antar-track) nempel di box parent yang sempit itu — makanya
  // garisnya keliatan kepotong pas discroll ke kanan, padahal seharusnya
  // ikut sepanjang seluruh timeline.
  const rowWidth = labelWidth + totalBars * barWidth

  return (
    <div className="box-border flex border-b border-row-divider" style={{ width: rowWidth }}>
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
        <span className={color ? '' : DEFAULT_ICON_INK} style={{ color: color?.fill }}>
          <TrackIcon track={track} />
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
