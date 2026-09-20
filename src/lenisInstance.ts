import type Lenis from 'lenis'

// Pegangan ke instance Lenis yang lagi aktif (null kalau lagi di halaman yang
// gak pake Lenis, mis. editor). Dipakai komponen lain yang perlu nge-stop
// scroll sementara -- contoh: panel menu mobile di SiteNav.
let instance: Lenis | null = null

export const getLenis = () => instance
export const setLenis = (lenis: Lenis | null) => {
  instance = lenis
}
