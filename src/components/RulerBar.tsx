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
  const bars = Array.from({ length: endBar - startBar + 1 }, (_, i) => startBar + i)

  return (
    <div className="sticky top-0 z-20 flex h-12 items-center border-b border-surface-grid/50 bg-surface-base">
      <div className="flex h-full shrink-0 items-center justify-center border-r border-surface-grid/40" style={{ width: labelWidth }}>
        <button
          type="button"
          aria-label="Play"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-track-melodic-ink text-surface-base shadow-sm"
        >
          <PlayIcon />
        </button>
      </div>

      <div className="relative flex h-full" style={{ width: bars.length * barWidth }}>
        {bars.map((bar, i) => {
          const isBadge = i % badgeEvery === 0
          return (
            <div key={bar} className="relative shrink-0 border-l border-surface-grid/30" style={{ width: barWidth }}>
              {isBadge ? (
                <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-track-melodic-ink font-mono-daw text-[10px] font-medium text-surface-base">
                  {bar}
                </span>
              ) : (
                <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-surface-grid/60" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
