import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { tokens } from '../../designTokens'
import { getLenis } from '../../lenisInstance'
import { usePresence } from '../../motion/hooks'

// Nav halaman utama. Struktur & label menunya diikutin dari markup nav
// referensi (Believe.com) yang ditempel user -- cuma nama brand diganti jadi
// "Rizz." dan link-nya diarahin ke section di halaman ini / route internal,
// bukan ke believe.com. Id/aria dari markup aslinya (#logo, #menu-burger,
// #nav, aria-controls, role="navigation") dipertahanin.

type NavLeaf = { label: string; href?: string; to?: string }

// Dropdown "Templates": isinya kategori template (bukan audiens ala referensi).
const TEMPLATES_MENU: NavLeaf[] = [
  { label: 'iOS Music Player', href: '#brands' },
  { label: 'DAW Mock-up (soon)', href: '#brands' },
]

const MAIN_MENU: NavLeaf[] = [
  { label: 'What We Do', href: '#what' },
  { label: 'Who We Are', href: '#about' },
  { label: 'Our Brands', href: '#brands' },
  { label: 'Where to Find Us', href: '#find' },
  { label: 'Newsroom', href: '#newsroom' },
  { label: 'Our 20th anniversary', href: '#about' },
]

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`}
    >
      <path d="M2 4.5 6 8.5 10 4.5" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3.5 3.5" />
    </svg>
  )
}

const subLinkClass =
  'block rounded py-2 pl-4 text-[15px] font-medium text-black transition-[padding,background-color,color] duration-200 hover:pl-6 xl:px-3 xl:pl-3 xl:text-white xl:hover:bg-white/10 xl:hover:pl-4 xl:hover:text-[#ffacff]'

const linkClass =
  'fx-link inline-flex items-center gap-2 whitespace-nowrap py-2 text-[15px] font-medium text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'

export default function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false) // panel mobile
  const [subOpen, setSubOpen] = useState(false) // dropdown "Templates"
  const [langOpen, setLangOpen] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  // Presence: elemen tetap ter-mount selama animasi keluarnya jalan.
  const menuP = usePresence(menuOpen, 220)
  const subP = usePresence(subOpen, 160)
  const langP = usePresence(langOpen, 160)

  const closeAll = () => {
    // Nyalain Lenis lagi SEKARANG (bukan nunggu effect), karena handler anchor
    // Lenis jalan setelah onClick ini dan nolak scroll kalau masih stopped.
    getLenis()?.start()
    setMenuOpen(false)
    setSubOpen(false)
    setLangOpen(false)
  }

  // Tutup dropdown kalau klik di luar nav, atau tekan Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setSubOpen(false)
        setLangOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setSubOpen(false)
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // Panel menu di mobile nutupin layar -- kunci scroll halaman selama kebuka.
  // JANGAN pake body { overflow: hidden }: pas <html> lagi overflow:clip (class
  // lenis-stopped dari Lenis), overflow body jadi gak ikut ke viewport dan
  // header sticky ikut kelempar keluar layar -> tombol burger hilang & menu
  // gak bisa ditutup. Cukup stop Lenis; kalau Lenis gak aktif, kunci lewat <html>.
  useEffect(() => {
    if (!menuOpen) return
    const lenis = getLenis()
    const html = document.documentElement
    const prev = html.style.overflow
    if (lenis) lenis.stop()
    else html.style.overflow = 'hidden'
    return () => {
      if (lenis) lenis.start()
      else html.style.overflow = prev
    }
  }, [menuOpen])

  return (
    <header
      ref={rootRef}
      className="fx-drop sticky top-0 z-50 border-b border-black/10"
      style={{ backgroundColor: tokens.colors.pageBackground, fontFamily: tokens.fonts.body }}
    >
      <div className="wrap mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 sm:px-10">
        <div id="logo">
          <Link
            to="/"
            rel="home"
            aria-label="Rizz. — home"
            onClick={closeAll}
            className="inline-block text-[28px] font-bold leading-none text-black transition-transform duration-300 ease-out hover:-rotate-3 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
            style={{ fontFamily: tokens.fonts.heading, letterSpacing: '-1px' }}
          >
            Rizz.
          </Link>
        </div>

        <button
          id="menu-burger"
          type="button"
          aria-controls="nav"
          aria-expanded={menuOpen}
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
          data-ripple
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#ffacff] transition-transform duration-200 active:scale-90 xl:hidden"
        >
          <span
            className={`bar bar-1 absolute h-0.5 w-[18px] bg-black transition-transform duration-300 ease-out ${
              menuOpen ? 'rotate-45' : '-translate-y-[6px]'
            }`}
          />
          <span
            className={`bar bar-2 absolute h-0.5 w-[18px] bg-black transition-[opacity,scale] duration-200 ${
              menuOpen ? 'scale-x-0 opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`bar bar-3 absolute h-0.5 w-[18px] bg-black transition-transform duration-300 ease-out ${
              menuOpen ? '-rotate-45' : 'translate-y-[6px]'
            }`}
          />
        </button>

        <nav
          id="nav"
          role="navigation"
          data-lenis-prevent
          className={`fixed inset-x-0 bottom-0 top-16 overflow-y-auto px-6 pb-10 pt-4 xl:static xl:ml-10 xl:flex xl:flex-1 xl:overflow-visible xl:p-0 ${
            menuP.mounted ? 'block' : 'hidden'
          } ${menuOpen ? 'fx-menu-in' : menuP.closing ? 'fx-menu-out' : ''}`}
          style={{ backgroundColor: tokens.colors.pageBackground }}
        >
          <div className="scroll-container flex w-full flex-col gap-6 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
            <ul id="menu-menu-principal-en" className="menu flex flex-col gap-1 xl:flex-row xl:items-center xl:gap-6">
              <li className="menu-item menu-item-has-children fx-menu-item relative" style={{ ['--i' as string]: 0 }}>
                <button
                  type="button"
                  aria-expanded={subOpen}
                  onClick={() => setSubOpen((v) => !v)}
                  className={linkClass}
                >
                  Templates <Chevron open={subOpen} />
                </button>
                <ul
                  className={`sub-menu flex-col xl:absolute xl:left-0 xl:top-full xl:mt-2 xl:min-w-[240px] xl:rounded-lg xl:bg-black xl:p-2 xl:shadow-lg ${
                    subP.mounted ? 'flex' : 'hidden'
                  } ${subOpen ? 'fx-dd-in' : subP.closing ? 'fx-dd-out' : ''}`}
                >
                  {TEMPLATES_MENU.map((item) => (
                    <li key={item.label} className="menu-item">
                      {item.to ? (
                        <Link to={item.to} onClick={closeAll} className={subLinkClass}>
                          {item.label}
                        </Link>
                      ) : (
                        <a href={item.href} onClick={closeAll} className={subLinkClass}>
                          {item.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </li>

              {MAIN_MENU.map((item, i) => (
                <li
                  key={item.label}
                  className="menu-item fx-menu-item"
                  style={{ ['--i' as string]: i + 1 }}
                >
                  <a href={item.href} onClick={closeAll} className={linkClass}>
                    {item.label}
                  </a>
                </li>
              ))}

              {/* Di mobile, Contact ada di dalam menu; di desktop dia pindah ke right-part. */}
              <li className="contact menu-item fx-menu-item xl:hidden" style={{ ['--i' as string]: MAIN_MENU.length + 1 }}>
                <a
                  href="#find"
                  onClick={closeAll}
                  data-ripple
                  className="mt-2 inline-flex items-center rounded-full bg-black px-5 py-2.5 text-[15px] font-medium text-white transition-transform duration-200 active:scale-95"
                >
                  Contact
                </a>
              </li>
            </ul>

            <div className="right-part fx-menu-item flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-5" style={{ ['--i' as string]: MAIN_MENU.length + 2 }}>
              <ul className="menu-secondary flex flex-col gap-1 xl:flex-row xl:items-center xl:gap-5">
                <li className="search">
                  {/* Belum ada halaman pencarian -- sementara ngarah ke daftar kategori template. */}
                  <a href="#brands" aria-label="Search" onClick={closeAll} className={linkClass}>
                    <SearchIcon /> Search
                  </a>
                </li>
                <li className="contact hidden xl:block">
                  <a
                    href="#find"
                    onClick={closeAll}
                    data-ripple
                    className="inline-flex items-center rounded-full bg-black px-5 py-2 text-[15px] font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#ffacff] hover:text-black active:translate-y-0 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    Contact
                  </a>
                </li>
              </ul>

              <div className="language-switcher relative">
                <button
                  type="button"
                  className={`current ${linkClass}`}
                  aria-label="Change language"
                  aria-expanded={langOpen}
                  onClick={() => setLangOpen((v) => !v)}
                >
                  en <Chevron open={langOpen} />
                </button>
                <ul
                  className={`flex-col xl:absolute xl:right-0 xl:top-full xl:mt-2 xl:min-w-[72px] xl:rounded-lg xl:bg-black xl:p-2 xl:shadow-lg ${
                    langP.mounted ? 'flex' : 'hidden'
                  } ${langOpen ? 'fx-dd-in' : langP.closing ? 'fx-dd-out' : ''}`}
                >
                  <li>
                    {/* Placeholder: versi bahasa lain belum ada. */}
                    <button
                      type="button"
                      lang="fr"
                      data-language="fr"
                      onClick={closeAll}
                      className="block w-full rounded py-2 pl-4 text-left text-[15px] font-medium text-black transition-[padding,background-color,color] duration-200 hover:pl-6 xl:px-3 xl:pl-3 xl:text-white xl:hover:bg-white/10 xl:hover:pl-4 xl:hover:text-[#ffacff]"
                    >
                      fr
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
