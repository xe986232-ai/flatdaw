import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, type Location } from 'react-router-dom'
import { useCurtain } from './Curtain'

/** Render-prop: kasih `location` yang lagi DITAMPILKAN (bukan yang baru
 *  di-navigate) ke <Routes location={...}>. Pindah halaman = curtain nutup,
 *  halaman diganti pas layar tertutup, curtain kebuka. Pindah hash/query di
 *  halaman yang sama diganti langsung tanpa curtain. */
export default function AnimatedRoutes({
  children,
}: {
  children: (displayLocation: Location) => ReactNode
}) {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const { run, curtain } = useCurtain()
  const latest = useRef(location)
  const pending = useRef(false)

  useEffect(() => {
    latest.current = location
    if (pending.current) return // swap yang lagi jalan otomatis baca `latest`
    if (location.pathname === displayLocation.pathname) {
      setDisplayLocation(location)
      return
    }
    pending.current = true
    run(() => {
      pending.current = false
      setDisplayLocation(latest.current)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  return (
    <>
      {children(displayLocation)}
      {curtain}
    </>
  )
}
