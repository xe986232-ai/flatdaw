import { useCallback, useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './hooks'

type Phase = 'idle' | 'cover' | 'reveal'

// Harus sinkron sama durasi di motion.css (.fx-curtain-*): cover 340ms +
// stagger 120ms, reveal 360ms + stagger 120ms.
const COVER_MS = 500
const REVEAL_MS = 500

/** Panel flat 3 warna (hitam -> periwinkle -> pink) yang menyapu layar dari
 *  bawah, nutupin pergantian halaman, lalu terangkat ke atas. */
export function Curtain({ phase }: { phase: Phase }) {
  if (phase === 'idle') return null
  return (
    <div className="fx-curtain" data-phase={phase} aria-hidden="true">
      <div className="fx-curtain-panel fx-curtain-a" />
      <div className="fx-curtain-panel fx-curtain-b" />
      <div className="fx-curtain-panel fx-curtain-c">
        <span className="fx-curtain-logo">Rizz.</span>
      </div>
    </div>
  )
}

/** `run(swap)` -> curtain nutup, `swap()` dipanggil pas layar tertutup penuh
 *  (ganti halaman/state di sini), lalu curtain kebuka. Kalau user pakai
 *  "kurangi gerakan", `swap()` langsung dijalanin tanpa curtain. */
export function useCurtain() {
  const [phase, setPhase] = useState<Phase>('idle')
  const reduced = usePrefersReducedMotion()
  const busy = useRef(false)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  const run = useCallback(
    (swap: () => void) => {
      if (reduced || busy.current) {
        swap()
        return
      }
      busy.current = true
      setPhase('cover')
      timers.current.push(
        window.setTimeout(() => {
          swap()
          setPhase('reveal')
          timers.current.push(
            window.setTimeout(() => {
              setPhase('idle')
              busy.current = false
            }, REVEAL_MS),
          )
        }, COVER_MS),
      )
    },
    [reduced],
  )

  return { run, curtain: <Curtain phase={phase} />, busy: phase !== 'idle' }
}
