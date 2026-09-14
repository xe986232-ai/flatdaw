export function AutomationLane({
  label,
  totalBars,
  barWidth,
  labelWidth,
  height = 44,
  teeth = 40,
}: {
  label: string
  totalBars: number
  barWidth: number
  labelWidth: number
  height?: number
  teeth?: number
}) {
  const width = totalBars * barWidth
  const step = width / teeth

  const points = Array.from({ length: teeth + 1 }, (_, i) => {
    const x = i * step
    const y = i % 2 === 0 ? height * 0.85 : height * 0.15
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="box-border flex">
      <div
        className="sticky left-0 z-10 box-border flex shrink-0 items-center bg-surface-base px-3"
        style={{ width: labelWidth, height }}
      >
        <span className="truncate text-[11px] font-medium text-track-accent">{label}</span>
      </div>
      <div className="relative box-border bg-track-accent/10" style={{ width, height }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full text-track-accent" preserveAspectRatio="none">
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.75" />
        </svg>
      </div>
    </div>
  )
}
