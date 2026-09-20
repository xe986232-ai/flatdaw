import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { getLenis, setLenis } from './lenisInstance'

// Smooth scroll (Lenis) buat semua halaman KECUALI halaman editor template.
// Editor punya scroll container & gesture sendiri (playlist, zoom, dsb.),
// jadi Lenis sengaja gak dipasang di sana biar gak ganggu. Tambah prefix
// lain ke daftar ini kalau ada halaman lain yang juga harus dikecualikan.
const EXCLUDED_PREFIXES = ['/editor']

// Link anchor (#brands, #what, ...) di-handle Lenis (anchors: true). Jarak dari
// nav sticky diatur lewat `scroll-mt-16` di tiap section, yang ikut dihitung Lenis.

export default function SmoothScroll() {
  const { pathname } = useLocation()
  const enabled = !EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  useEffect(() => {
    if (!enabled) return
    const lenis = new Lenis({ autoRaf: true, anchors: true })
    setLenis(lenis)
    return () => {
      setLenis(null)
      lenis.destroy()
    }
  }, [enabled])

  // Pindah halaman (bukan pindah hash) -> mulai lagi dari atas.
  useEffect(() => {
    getLenis()?.scrollTo(0, { immediate: true, force: true })
  }, [pathname])

  return null
}
