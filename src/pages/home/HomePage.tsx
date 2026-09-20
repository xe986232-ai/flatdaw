import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { tokens, SECTION_PALETTE } from '../../designTokens'
import SiteNav from './SiteNav'

// Halaman utama (route "/"). Gaya & palet ngikut style-guide referensi yang
// udah dipakai di halaman template hub (Rubik + Noto Sans, blok warna
// full-bleed, eyebrow "(HURUF BESAR)"), tapi ini halaman terpisah: hub
// template tetep di /template/daw-mockup, halaman ini cuma nyambung ke situ.
//
// Isi konten: Rizz. = alat buat bikin visual musik. Template dikelompokin
// per KATEGORI -- sekarang baru "DAW Mock-up" (Classic DAW & FL Playlist),
// "iOS Music Playlist" masih coming soon. Nambah kategori/template baru
// cukup edit CATEGORIES di bawah.

const [CORAL, , ORANGE, TAN] = SECTION_PALETTE

const GITHUB_URL = 'https://github.com/xe986232-ai/flatdaw'
const LIVE_URL = 'https://flatdaw.vercel.app'

type Category = {
  id: string
  eyebrow: string
  name: string
  tag: string
  text: string
  note: string
  features: string[]
  status: 'available' | 'soon'
  color: { bg: string; fg: string }
  // Cuma dipakai kategori yang udah available.
  href?: string
  templates?: Array<{ id: string; name: string }>
}

const CATEGORIES: Category[] = [
  {
    id: 'daw-mockup',
    eyebrow: '(CATEGORY 01)',
    name: 'DAW MOCK-UP',
    tag: 'Flat DAW',
    text: 'Visuals that look like a DAW playlist. Import a project from FL Studio Mobile and Rizz. draws your real tracks and clips in the template you pick.',
    note: 'Export is available in Classic DAW.',
    features: ['Import .flm & .zip', '2 templates', 'PNG & MP4 export'],
    status: 'available',
    color: CORAL,
    href: '/template/daw-mockup',
    templates: [
      { id: 'theme1', name: 'Classic DAW' },
      { id: 'theme2', name: 'FL Playlist' },
    ],
  },
  {
    id: 'ios-music-playlist',
    eyebrow: '(CATEGORY 02)',
    name: 'iOS MUSIC PLAYLIST',
    tag: 'Coming soon',
    text: 'Playlist visuals styled after the iOS Music app, for showing a track list the way people are used to seeing it on their phone.',
    note: 'This category is still being built. Follow the Newsroom for updates.',
    features: [],
    status: 'soon',
    color: { bg: '#161616', fg: '#ffffff' },
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Pick a category',
    text: 'Choose the kind of visual you want. Right now that is a DAW mock-up, with iOS Music Playlist coming next.',
  },
  {
    n: '02',
    title: 'Add your project',
    text: 'For DAW mock-ups, drop in a .flm or .zip project from FL Studio Mobile. Tracks and clips are read straight from the file.',
  },
  {
    n: '03',
    title: 'Choose a template and export',
    text: 'Pick the look you like, then save it as a PNG or MP4 in 16:9 or 9:16 (currently in Classic DAW).',
  },
]

const UPDATES = [
  { date: 'Sep 2026', title: 'New home page and the Rizz. name' },
  { date: 'Sep 2026', title: 'Every page now has its own URL' },
  { date: 'Sep 2026', title: 'FL Playlist: the playlist can now be scrolled' },
  { date: 'Sep 2026', title: 'FL Playlist: audio clips show real waveforms' },
]

// Clip dekoratif buat "mini playlist" di hero: [kiri %, lebar %, warna track].
const HERO_ROWS: Array<Array<[number, number, string]>> = [
  [[2, 30, 'bg-track-melodic'], [38, 22, 'bg-track-melodic'], [66, 30, 'bg-track-melodic']],
  [[2, 14, 'bg-track-marker'], [20, 14, 'bg-track-marker'], [38, 14, 'bg-track-marker'], [56, 14, 'bg-track-marker'], [74, 22, 'bg-track-marker']],
  [[10, 40, 'bg-track-lead'], [56, 40, 'bg-track-lead']],
  [[2, 18, 'bg-track-perc'], [24, 18, 'bg-track-perc'], [46, 18, 'bg-track-perc'], [68, 28, 'bg-track-perc']],
  [[2, 46, 'bg-track-accent'], [52, 44, 'bg-track-accent']],
]

function Eyebrow({ children, color }: { children: ReactNode; color: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest sm:text-sm" style={{ color }}>
      {children}
    </p>
  )
}

function SectionHeading({ children, color }: { children: ReactNode; color: string }) {
  return (
    <h2
      className="mt-3 max-w-3xl text-[34px] font-bold leading-[1.05] sm:text-[52px]"
      style={{ fontFamily: tokens.fonts.heading, letterSpacing: '-1px', color }}
    >
      {children}
    </h2>
  )
}

const containerClass = 'mx-auto max-w-[1400px] px-6 sm:px-10'
const sectionClass = 'scroll-mt-16 py-14 sm:py-20'
const pillButton =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black'

function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-xl p-4 shadow-[8px_8px_0_#000]"
      style={{ backgroundColor: '#1C1C1F' }}
    >
      <div className="flex flex-col gap-2">
        {HERO_ROWS.map((clips, row) => (
          <div key={row} className="relative h-9 rounded-sm" style={{ backgroundColor: '#202024' }}>
            {clips.map(([left, width, color], i) => (
              <span
                key={i}
                className={`absolute top-1 bottom-1 rounded-[3px] ${color}`}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Playhead */}
      <span
        className="absolute bottom-3 top-3 w-0.5"
        style={{ left: '44%', backgroundColor: tokens.colors.accent }}
      />
    </div>
  )
}

function CategoryCard({ c }: { c: Category }) {
  const soon = c.status === 'soon'
  return (
    <article
      className="flex flex-col rounded-lg p-6 sm:p-8"
      style={{
        backgroundColor: c.color.bg,
        color: c.color.fg,
        border: soon ? `1px dashed ${tokens.colors.border}` : undefined,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest sm:text-sm" style={{ opacity: soon ? 0.6 : 1 }}>
          {c.eyebrow}
        </p>
        <span
          className="rounded-full border px-3 py-1 text-xs font-medium"
          style={{ borderColor: soon ? tokens.colors.accent : c.color.fg, color: soon ? tokens.colors.accent : c.color.fg }}
        >
          {c.tag}
        </span>
      </div>
      <h3
        className="mt-4 text-[34px] font-bold leading-[1.05] sm:text-[44px]"
        style={{ fontFamily: tokens.fonts.heading, letterSpacing: '-1px' }}
      >
        {c.name}
      </h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: `${c.color.fg}${soon ? 'b3' : 'cc'}` }}>
        {c.text}
      </p>
      <p className="mt-3 max-w-md text-xs leading-relaxed sm:text-sm" style={{ color: `${c.color.fg}${soon ? '80' : 'b3'}` }}>
        {c.note}
      </p>

      {c.features.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {c.features.map((f) => (
            <li key={f} className="rounded-full border px-3 py-1 text-xs font-medium sm:text-sm" style={{ borderColor: c.color.fg }}>
              {f}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-8">
        {c.templates && (
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-widest">Templates in this category</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {c.templates.map((t) => (
                <Link
                  key={t.id}
                  to={`/editor/${t.id}`}
                  className="inline-flex min-h-[40px] items-center rounded-full border border-black px-5 text-sm font-medium text-black transition-colors hover:bg-black hover:text-white"
                >
                  {t.name} →
                </Link>
              ))}
            </div>
          </div>
        )}
        {c.href && (
          <Link to={c.href} className={pillButton}>
            See all DAW templates →
          </Link>
        )}
      </div>
    </article>
  )
}

export default function HomePage() {
  return (
    <div style={{ fontFamily: tokens.fonts.body, backgroundColor: tokens.colors.background, color: tokens.colors.text }}>
      <SiteNav />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-16" style={{ backgroundColor: tokens.colors.pageBackground }}>
          <div className={`${containerClass} grid items-center gap-12 md:grid-cols-2`}>
            <div>
              <Eyebrow color="#000000">(VISUAL TEMPLATES FOR MUSIC)</Eyebrow>
              <h1
                className="mt-3 text-[42px] font-bold leading-[1.05] text-black sm:text-[72px]"
                style={{ fontFamily: tokens.fonts.heading, letterSpacing: '-1.5px' }}
              >
                MAKE VISUALS
                <br />
                FOR YOUR
                <br />
                MUSIC.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-black/70 sm:text-base">
                Rizz. is a set of templates that turn your music into visuals, right in the browser. Start with a DAW
                mock-up built from your own FL Studio Mobile project. An iOS-style music playlist is on the way.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/template/daw-mockup" className={pillButton}>
                  Browse templates →
                </Link>
                <a
                  href="#what"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-black px-6 text-sm font-medium text-black transition-colors hover:bg-black hover:text-white"
                >
                  How it works
                </a>
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        {/* TEMPLATE CATEGORIES (nav: Our Brands) */}
        <section id="brands" className={sectionClass} style={{ backgroundColor: '#000000' }}>
          <div className={containerClass}>
            <Eyebrow color={tokens.colors.accent}>(TEMPLATE CATEGORIES)</Eyebrow>
            <SectionHeading color="#ffffff">PICK A CATEGORY, THEN A TEMPLATE.</SectionHeading>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Every template belongs to a category, and each category is a different kind of visual. Choose the one that
              fits how you want to show your music.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {CATEGORIES.map((c) => (
                <CategoryCard key={c.id} c={c} />
              ))}
            </div>
          </div>
        </section>

        {/* WHAT WE DO */}
        <section id="what" className={sectionClass} style={{ backgroundColor: tokens.colors.accent }}>
          <div className={containerClass}>
            <Eyebrow color="#000000">(WHAT WE DO)</Eyebrow>
            <SectionHeading color="#000000">FROM YOUR MUSIC TO A SHAREABLE VISUAL</SectionHeading>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="border-t-2 border-black pt-4">
                  <span
                    className="text-5xl font-bold text-black sm:text-6xl"
                    style={{ fontFamily: tokens.fonts.heading, letterSpacing: '-1px' }}
                  >
                    {s.n}
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-black" style={{ fontFamily: tokens.fonts.heading }}>
                    {s.title}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-black/75 sm:text-base">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* WHO WE ARE */}
        <section id="about" className={sectionClass} style={{ backgroundColor: TAN.bg }}>
          <div className={containerClass}>
            <Eyebrow color="#000000">(WHO WE ARE)</Eyebrow>
            <SectionHeading color="#000000">A PERSONAL PROJECT, BUILT IN THE OPEN.</SectionHeading>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-black/75 sm:text-base">
              Rizz. is a personal project for making music visuals in the browser. It began as a mock-up of a DAW playlist
              and now works with real FL Studio Mobile projects. The next category is an iOS-style music playlist, with more
              template types to follow. It is made by one person, the code is public, and it keeps changing.
            </p>
          </div>
        </section>

        {/* NEWSROOM */}
        <section id="newsroom" className={sectionClass} style={{ backgroundColor: '#111111' }}>
          <div className={containerClass}>
            <Eyebrow color={tokens.colors.accent}>(NEWSROOM)</Eyebrow>
            <SectionHeading color="#ffffff">LATEST UPDATES</SectionHeading>
            <ul className="mt-10 max-w-2xl">
              {UPDATES.map((u) => (
                <li
                  key={u.title}
                  className="flex flex-col gap-1 border-t py-4 sm:flex-row sm:items-baseline sm:gap-6"
                  style={{ borderColor: tokens.colors.border }}
                >
                  <span className="w-24 shrink-0 text-xs font-bold uppercase tracking-widest text-white/50">{u.date}</span>
                  <span className="text-base font-medium">{u.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* WHERE TO FIND US / CONTACT */}
        <section id="find" className={sectionClass} style={{ backgroundColor: ORANGE.bg }}>
          <div className={containerClass}>
            <Eyebrow color="#000000">(WHERE TO FIND US)</Eyebrow>
            <SectionHeading color="#000000">FIND RIZZ. ONLINE</SectionHeading>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-black/75 sm:text-base">
              Try Rizz. in the browser, or follow along and get in touch through the repository.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={LIVE_URL} className={pillButton}>
                Open the live site
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-black px-6 text-sm font-medium text-black transition-colors hover:bg-black hover:text-white"
              >
                View on GitHub ↗
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8" style={{ borderColor: tokens.colors.border }}>
        <div className={`${containerClass} flex flex-col gap-2 text-xs text-white/50 sm:flex-row sm:justify-between sm:text-sm`}>
          <span style={{ fontFamily: tokens.fonts.heading }} className="font-bold text-white">
            Rizz.
          </span>
          <span>A personal project. © 2026</span>
        </div>
      </footer>
    </div>
  )
}
