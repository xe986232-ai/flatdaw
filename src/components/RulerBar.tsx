function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-[1px]">
      <path d="M6 4 L20 12 L6 20 Z" fill="currentColor" />
    </svg>
  )
}

export function RulerBar({
  startBar,
  endBar,
  barWidth,
  labelWidth,
  badgeEvery = 4,
}: {
  startBar: number
  endBar: number
  barWidth: number
  labelWidth: number
  badgeEvery?: number
}) {
  // endBar is the timeline's end boundary, not the start of one more bar —
  // using +1 here made the ruler exactly one barWidth wider than the track
  // rows below it (which size themselves off `endBar - startBar` bars).
  const bars = Array.from({ length: endBar - startBar }, (_, i) => startBar + i)

  return (
    <div className="sticky top-0 z-20 box-border flex h-12 items-center bg-surface-base">
      <div className="flex h-full shrink-0 items-center justify-center" style={{ width: labelWidth }}>
        <button
          type="button"
          aria-label="Play"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-track-melodic-ink text-surface-base"
        >
          <PlayIcon />
        </button>
      </div>

      <div className="relative flex h-full" style={{ width: bars.length * barWidth }}>
        {bars.map((bar, i) => {
          const isBadge = i % badgeEvery === 0
          if (!isBadge) return null
          return (
            <div key={bar} className="relative shrink-0" style={{ width: barWidth }}>
              <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-track-melodic-ink font-mono-daw text-[10px] font-medium text-surface-base">
                {bar}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
