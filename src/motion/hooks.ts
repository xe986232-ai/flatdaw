import {
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from 'react'

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/** true kalau user minta "kurangi gerakan" di perangkatnya. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  )
}

/** Style helper: set delay animasi (`--d`) tanpa nulis cast berulang. */
export function fxDelay(ms: number, extra?: CSSProperties): CSSProperties {
  return { ['--d' as string]: `${ms}ms`, ...extra } as CSSProperties
}

/** Kasih tahu kapan elemen masuk viewport (sekali aja secara default). */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { threshold = 0.15, rootMargin = '0px 0px -8% 0px', once = true } = {},
): boolean {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            if (once) io.disconnect()
          } else if (!once) {
            setInView(false)
          }
        }
      },
      { threshold, rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, threshold, rootMargin, once])
  return inView
}

/** Tahan elemen tetap ter-mount selama animasi KELUAR jalan.
 *  `mounted` = render elemennya; `closing` = pakai kelas animasi keluar. */
export function usePresence(open: boolean, exitMs = 220) {
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const t = window.setTimeout(() => setMounted(false), exitMs)
    return () => window.clearTimeout(t)
  }, [open, exitMs])
  return { mounted: open || mounted, closing: !open && mounted }
}

/** Sama kayak usePresence, tapi buat data: nilai terakhir yang non-null
 *  tetap dikembalikan selama animasi keluar (mis. template yang lagi di-preview). */
export function usePresenceValue<T>(value: T | null, exitMs = 220) {
  const [last, setLast] = useState<T | null>(value)
  useEffect(() => {
    if (value !== null) setLast(value)
  }, [value])
  const { mounted, closing } = usePresence(value !== null, exitMs)
  return { item: value ?? (mounted ? last : null), closing }
}
