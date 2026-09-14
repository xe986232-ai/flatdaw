import type { Clip, TrackKind } from '../tracks'

const fillByKind: Record<TrackKind, string> = {
  marker: 'bg-track-marker',
  melodic: 'bg-track-melodic',
  lead: 'bg-track-lead',
  drum: 'bg-track-drum',
  perc: 'bg-track-perc',
  accent: 'bg-track-accent',
}

const inkByKind: Record<TrackKind, string> = {
  marker: 'text-track-marker-ink',
  melodic: 'text-track-melodic-ink',
  lead: 'text-track-drum-block',
  drum: 'text-track-drum-block',
  perc: 'text-track-perc-step',
  accent: 'text-white',
}

function Pattern({ pattern }: { pattern: Clip['pattern'] }) {
  if (pattern === 'wave') {
    return (
      <svg viewBox="0 0 200 24" preserveAspectRatio="none" className="h-4 w-full opacity-70">
        <path
          d="M0 12 Q10 2 20 12 T40 12 T60 12 T80 12 T100 12 T120 12 T140 12 T160 12 T180 12 T200 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    )
  }
  if (pattern === 'steps') {
    return (
      <div className="flex h-4 w-full items-end gap-[3px]">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="w-[3px] flex-1 rounded-[1px]"
            style={{
              height: i % 4 === 0 ? '100%' : '55%',
              backgroundColor: 'currentColor',
              opacity: i % 4 === 0 ? 0.95 : 0.55,
            }}
          />
        ))}
      </div>
    )
  }
  if (pattern === 'dense') {
    return (
      <div className="flex h-4 w-full items-end gap-[2px] overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="flex-1 rounded-[1px]"
            style={{
              height: `${30 + ((i * 37) % 70)}%`,
              backgroundColor: 'currentColor',
              opacity: 0.85,
            }}
          />
        ))}
      </div>
    )
  }
  if (pattern === 'scribble') {
    return (
      <div className="flex h-4 w-full flex-col justify-center gap-[3px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[3px] w-full rounded-full" style={{ backgroundColor: 'currentColor' }} />
        ))}
      </div>
    )
  }
  return null
}

export function ClipBlock({ clip, kind, barWidth }: { clip: Clip; kind: TrackKind; barWidth: number }) {
  const left = (clip.startBar - 205) * barWidth
  const width = clip.lengthBars * barWidth

  return (
    <div
      className={`absolute top-1 bottom-1 rounded-sm px-2 py-1 ${fillByKind[kind]} ${inkByKind[kind]} shadow-sm`}
      style={{ left, width }}
    >
      {clip.label && (
        <span className="block truncate text-[11px] font-medium leading-none mb-1">{clip.label}</span>
      )}
      <Pattern pattern={clip.pattern} />
    </div>
  )
}
