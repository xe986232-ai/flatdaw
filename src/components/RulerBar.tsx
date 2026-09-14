export function RulerBar({ startBar, endBar, barWidth, labelWidth }: { startBar: number; endBar: number; barWidth: number; labelWidth: number }) {
  const bars = Array.from({ length: endBar - startBar + 1 }, (_, i) => startBar + i)

  return (
    <div className="sticky top-0 z-20 flex border-b border-surface-grid/50 bg-surface-base">
      <div className="shrink-0 border-r border-surface-grid/40" style={{ width: labelWidth }} />
      <div className="relative flex" style={{ width: bars.length * barWidth }}>
        {bars.map((bar) => (
          <div
            key={bar}
            className="relative shrink-0 border-l border-surface-grid/40 py-2 pl-1.5 font-mono-daw text-[11px] text-track-melodic-ink/50"
            style={{ width: barWidth }}
          >
            {bar}
          </div>
        ))}
      </div>
    </div>
  )
}
