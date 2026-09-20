import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { tokens, SECTION_PALETTE } from '../../designTokens'
import SiteNav from './SiteNav'

// Halaman utama (route "/"). Gaya & palet ngikut style-guide referensi yang
// udah dipakai di halaman template hub (Rubik + Noto Sans, blok warna
// full-bleed, eyebrow "(HURUF BESAR)"), tapi ini halaman terpisah: hub
// template tetep di /template/daw-mockup, halaman ini cuma nyambung ke situ.

const [CORAL, PERIWINKLE, ORANGE, TAN] = SECTION_PALETTE

const GITHUB_URL = 'https://github.com/xe986232-ai/flatdaw'
const LIVE_URL = 'https://flatdaw.vercel.app'

const AUDIENCES = [
  {
    id: 'who-artists',
    title: 'Rizz for Artists',
    text: 'Turn a beat in progress into a clip that shows the whole arrangement, ready for your feed.',
    color: CORAL,
  },
  {
    id: 'who-songwriters',
    title: 'Rizz for Songwriters',
    text: 'Sketch a song, then share a clear picture of how it is put together.',
    color: PERIWINKLE,
  },
  {
    id: 'who-labels',
    title: 'Rizz for Labels',
    text: 'Give every release the same look by using one template across all your tracks.',
    color: ORANGE,
  },
  {
    id: 'who-publishers',
    title: 'Rizz for Publishers',
    text: 'Present demos with a visual of the arrangement instead of a bare audio file.',
    color: TAN,
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Import your project',
    text: 'Drop in a .flm project or a .zip from FL Studio Mobile. Tracks and clips are read straight from the file.',
  },
  {
    n: '02',
    title: 'Pick a template',
    text: 'Choose Classic DAW for a full editor look, or FL Playlist for a playlist-style view.',
  },
  {
    n: '03',
    title: 'Export and share',
    text: 'Export as PNG or MP4, in 16:9 or 9:16 (available in Classic DAW).',
  },
]

const BRANDS = [
  {
    id: 'theme1',
    eyebrow: '(TEMPLATE 01)',
    name: 'CLASSIC DAW',
    text: 'A full editor look: horizontal playlist, piano roll, automation lanes and waveforms.',
    color: CORAL,
  },
  {
    id: 'theme2',
    eyebrow: '(TEMPLATE 02)',
    name: 'FL PLAYLIST',
    text: 'A playlist in the style of FL Studio, with coloured tracks, pattern, audio and automation clips. Visual mock-up for now.',
    color: PERIWINKLE,
  },
]

const UPDATES = [
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

export default function HomePage() {
  return (
    <div style={{ fontFamily: tokens.fonts.body, backgroundColor: tokens.colors.background, color: tokens.colors.text }}>
      <SiteNav />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-16" style={{ backgroundColor: tokens.colors.pageBackground }}>
          <div className={`${containerClass} grid items-center gap-12 md:grid-cols-2`}>
            <div>
              <Eyebrow color="#000000">(MUSIC, MADE VISIBLE)</Eyebrow>
              <h1
                className="mt-3 text-[42px] font-bold leading-[1.05] text-black sm:text-[72px]"
                style={{ fontFamily: tokens.fonts.heading, letterSpacing: '-1.5px' }}
              >
                SHOW HOW
                <br />
                YOUR MUSIC
                <br />
                IS MADE.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-black/70 sm:text-base">
                Import a FL Studio Mobile project, pick a template and turn it into a clean playlist visual you can
                export as an image or a video.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/template/daw-mockup"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
                >
                  Browse templates →
                </Link>
                <a
                  href="#what"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-black px-6 text-sm font-medium text-black transition-colors hover:bg-black hover:text-white"
                >
                  See what we do
                </a>
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        {/* WHO WE WORK WITH */}
        <section id="who" className={sectionClass} style={{ backgroundColor: '#000000' }}>
          <div className={containerClass}>
            <Eyebrow color={tokens.colors.accent}>(WHO WE WORK WITH)</Eyebrow>
            <SectionHeading color="#ffffff">BUILT FOR EVERYONE WHO MAKES MUSIC</SectionHeading>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {AUDIENCES.map((a) => (
                <article
                  key={a.id}
                  id={a.id}
                  className="flex scroll-mt-20 flex-col rounded-lg p-6"
                  style={{ backgroundColor: a.color.bg, color: a.color.fg }}
                >
                  <h3
                    className="text-2xl font-bold leading-tight"
                    style={{ fontFamily: tokens.fonts.heading, letterSpacing: '-0.5px' }}
                  >
                    {a.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed" style={{ color: `${a.color.fg}cc` }}>
                    {a.text}
                  </p>
                  <Link to="/template/daw-mockup" className="mt-6 text-sm font-semibold underline-offset-4 hover:underline">
                    Explore templates →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT WE DO */}
        <section id="what" className={sectionClass} style={{ backgroundColor: tokens.colors.accent }}>
          <div className={containerClass}>
            <Eyebrow color="#000000">(WHAT WE DO)</Eyebrow>
            <SectionHeading color="#000000">FROM PROJECT FILE TO SHAREABLE VISUAL</SectionHeading>
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

        {/* OUR BRANDS -> template */}
        <section id="brands" className={sectionClass} style={{ backgroundColor: '#000000' }}>
          <div className={containerClass}>
            <Eyebrow color={tokens.colors.accent}>(OUR BRANDS)</Eyebrow>
            <SectionHeading color="#ffffff">TWO LOOKS, ONE PROJECT</SectionHeading>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {BRANDS.map((b) => (
                <article key={b.id} className="flex flex-col rounded-lg p-6 sm:p-8" style={{ backgroundColor: b.color.bg, color: b.color.fg }}>
                  <p className="text-xs font-bold uppercase tracking-widest sm:text-sm">{b.eyebrow}</p>
                  <h3
                    className="mt-3 text-[34px] font-bold leading-[1.05] sm:text-[44px]"
                    style={{ fontFamily: tokens.fonts.heading, letterSpacing: '-1px' }}
                  >
                    {b.name}
                  </h3>
                  <p className="mt-3 max-w-md flex-1 text-sm leading-relaxed sm:text-base" style={{ color: `${b.color.fg}cc` }}>
                    {b.text}
                  </p>
                  <Link
                    to={`/editor/${b.id}`}
                    className="mt-8 inline-flex min-h-[44px] w-fit items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
                  >
                    Open template →
                  </Link>
                </article>
              ))}
            </div>
            <Link to="/template/daw-mockup" className="mt-8 inline-block text-sm font-semibold text-white underline-offset-4 hover:underline">
              See all templates →
            </Link>
          </div>
        </section>

        {/* WHO WE ARE */}
        <section id="about" className={sectionClass} style={{ backgroundColor: TAN.bg }}>
          <div className={containerClass}>
            <Eyebrow color="#000000">(WHO WE ARE)</Eyebrow>
            <SectionHeading color="#000000">A PERSONAL PROJECT, BUILT IN THE OPEN.</SectionHeading>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-black/75 sm:text-base">
              Rizz. started as a small mock-up of a DAW playlist and grew into a tool that turns real project files into
              visuals. It is made by one person, the code is public, and it keeps changing.
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
              Try it in the browser, or follow along and get in touch through the repository.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={LIVE_URL}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
              >
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
