import type { Track } from '../tracks'
import { isAudioTrack } from '../tracks'

// Ikon track instrument (VST/synth) — bentuk tuts piano, niru swatch yang
// di-share user: kotak persegi dengan 3 tuts hitam menonjol dari atas.
function KeysIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <rect x="7.2" y="3" width="3" height="10.5" fill="currentColor" />
      <rect x="13.8" y="3" width="3" height="10.5" fill="currentColor" />
    </svg>
  )
}

// Ikon track audio (clip rekaman/sample) — batang-batang waveform simetris,
// niru swatch yang di-share user.
function WaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <rect x="0.5" y="10.5" width="1.8" height="3" rx="0.9" fill="currentColor" />
      <rect x="3.5" y="8.5" width="1.8" height="7" rx="0.9" fill="currentColor" />
      <rect x="6.5" y="6" width="1.8" height="12" rx="0.9" fill="currentColor" />
      <rect x="9.5" y="3.5" width="1.8" height="17" rx="0.9" fill="currentColor" />
      <rect x="12.7" y="0.5" width="1.8" height="23" rx="0.9" fill="currentColor" />
      <rect x="15.7" y="3.5" width="1.8" height="17" rx="0.9" fill="currentColor" />
      <rect x="18.7" y="6" width="1.8" height="12" rx="0.9" fill="currentColor" />
      <rect x="21.7" y="8.5" width="1.8" height="7" rx="0.9" fill="currentColor" />
    </svg>
  )
}

export function TrackIcon({ track }: { track: Track }) {
  return isAudioTrack(track) ? <WaveIcon /> : <KeysIcon />
}
