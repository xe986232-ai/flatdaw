import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { tokens } from '../../designTokens'
import SiteNav from './SiteNav'
import Reveal from '../../motion/Reveal'
import { fxDelay } from '../../motion/hooks'
import iosMusicMockup from '../../assets/ios-music-mockup.webp'

// Halaman utama (route "/"). Gaya & palet ngikut style-guide referensi yang
// udah dipakai di halaman template hub (Rubik + Noto Sans, blok warna
// full-bleed, eyebrow "(HURUF BESAR)"). Hub template (/template/daw-mockup)
// masih ada, tapi sementara gak di-link dari sini karena kategori DAW
// Mock-up lagi ditandai "coming soon".
//
// Palet sengaja dibatasin: dasarnya HITAM & PUTIH (section gantian hitam/putih),
// warna cuma dipake di hero (periwinkle) + aksen kecil (pink: eyebrow, hover,
// tombol burger). Jangan kasih tiap section/kartu warna beda-beda lagi.
//
// Isi konten: Rizz. = alat buat bikin visual musik. Template dikelompokin
// per KATEGORI -- sekarang "iOS Music Player" yang available (status
// 'available'), "DAW Mock-up" (Classic DAW & FL Playlist) coming soon.
// Buka/tutup kategori & nambah yang baru cukup edit CATEGORIES di bawah;
// isi `href`/`templates` kalau kategorinya udah punya halaman.


// Kontak WhatsApp (format internasional buat wa.me: 0831... -> 62831...).
const WA_NUMBER = '6283129555763'
const WA_DISPLAY = '+62 831-2955-5763'
const WA_GREEN = '#25D366' // warna resmi brand WhatsApp
const waLink = (text: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`
const WA_TOPICS = [
  { label: 'Report a bug', text: "Hi! I found a bug on Rizz.: " },
  { label: 'Request a template', text: "Hi! I'd like to request a template for Rizz.: " },
  { label: 'Ask a question', text: 'Hi! I have a question about Rizz.: ' },
]

// Logo resmi WhatsApp (path dari Simple Icons, viewBox 24x24).
function WhatsAppIcon({ size = 20, color = WA_GREEN }: { size?: number; color?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

type Category = {
  id: string
  eyebrow: string
  name: string
  tag: string
  text: string
  note?: string
  features: string[]
  status: 'available' | 'soon'
  // Gambar mock-up di kolom kanan: 'daw' = playlist mock (CSS), 'ios' = foto HP.
  visual: 'daw' | 'ios'
  color: { bg: string; fg: string }
  // Link ke template -- cuma diisi kalau kategorinya udah buka & punya halaman.
  href?: string
  hrefLabel?: string
  templates?: Array<{ id: string; name: string }>
}

const CATEGORIES: Category[] = [
  {
    id: 'ios-music-player',
    eyebrow: '(CATEGORY 01)',
    name: 'iOS MUSIC PLAYER',
    tag: 'Available',
    text: 'Music player visuals styled after the iOS Music app, for showing a song the way people are used to seeing it on their phone.',
    features: ['5 template variants', 'Custom cover, title & artist', 'PNG & MP4 export'],
    status: 'available',
    visual: 'ios',
    color: { bg: tokens.colors.accent, fg: '#000000' },
    href: '/template/ios-music-player',
    hrefLabel: 'Use template',
  },
  {
    id: 'daw-mockup',
    eyebrow: '(CATEGORY 02)',
    name: 'DAW MOCK-UP',
    tag: 'Coming soon',
    text: 'Visuals that look like a DAW playlist. Import a project from FL Studio Mobile and Rizz. draws your real tracks and clips in the template you pick.',
    note: 'Still being built. The mock-up shown is a preview of the look. Follow the Newsroom for updates.',
    features: ['Import .flm & .zip', '2 templates', 'PNG & MP4 export'],
    status: 'soon',
    visual: 'daw',
    color: { bg: tokens.colors.accent, fg: '#000000' },
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Pick a category',
    text: 'Choose the kind of visual you want. Right now that is the iOS Music Player, with DAW Mock-up coming next.',
  },
  {
    n: '02',
    title: 'Add your music',
    text: 'Bring what the template needs. DAW mock-ups will read tracks and clips straight from a .flm or .zip project from FL Studio Mobile.',
  },
  {
    n: '03',
    title: 'Choose a template and export',
    text: 'Pick the look you like and export it. DAW mock-ups will export as PNG or MP4, in 16:9 or 9:16.',
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
    <Reveal as="p" className="text-xs font-bold uppercase tracking-widest sm:text-sm" style={{ color }}>
      {children}
    </Reveal>
  )
}

function SectionHeading({ children, color }: { children: ReactNode; color: string }) {
  return (
    <Reveal
      as="h2"
      delay={90}
      className="mt-3 max-w-3xl text-[34px] font-bold leading-[1.05] sm:text-[52px]"
      style={{ fontFamily: tokens.fonts.heading, letterSpacing: '-1px', color }}
    >
      {children}
    </Reveal>
  )
}

const containerClass = 'mx-auto max-w-[1400px] px-6 sm:px-10'
const sectionClass = 'scroll-mt-16 py-14 sm:py-20'
const pillButton =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#ffacff] hover:text-black active:translate-y-0 active:scale-95'
// Versi buat latar gelap.
const pillLight =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-black transition duration-200 hover:-translate-y-0.5 hover:bg-[#ffacff] active:translate-y-0 active:scale-95'

function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden rounded-lg border border-white/10 p-2 shadow-[4px_4px_0_#000] sm:rounded-xl sm:p-4 sm:shadow-[8px_8px_0_#000]"
      style={{ backgroundColor: '#1C1C1F' }}
    >
      <div className="flex flex-col gap-1 sm:gap-2">
        {HERO_ROWS.map((clips, row) => (
          <div key={row} className="relative h-4 rounded-sm sm:h-9" style={{ backgroundColor: '#202024' }}>
            {clips.map(([left, width, color], i) => (
              <span
                key={i}
                className={`fx-clip absolute top-0.5 bottom-0.5 rounded-[2px] sm:top-1 sm:bottom-1 sm:rounded-[3px] ${color}`}
                style={fxDelay(200 + row * 110 + i * 70, { left: `${left}%`, width: `${width}%` })}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Playhead */}
      <div className="pointer-events-none absolute inset-0" style={{ containerType: 'inline-size' }}>
        <span
          className="fx-playhead absolute bottom-3 top-3 left-0 w-0.5"
          style={{ backgroundColor: tokens.colors.accent }}
        />
      </div>
    </div>
  )
}

// Layout kartu kategori:
//  - Desktop (md+): 2 kolom — penjelasan di kiri (head, body, cta ditumpuk),
//    gambar di kanan. Sama persis seperti sebelumnya.
//  - Mobile (<md): tetap 2 kolom di bagian tengah — judul & badge full-width
//    di atas, lalu penjelasan singkat BERDAMPINGAN dengan gambar, lalu fitur
//    + tombol full-width di bawah. Jadi gambar gak lagi nendang ke bawah layar.
function CategoryRow({ c }: { c: Category }) {
  const dark = c.color.fg === '#ffffff'
  return (
    <Reveal
      as="article"
      className="grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-lg md:grid-cols-2 md:grid-rows-[auto_auto_1fr]"
      style={{
        backgroundColor: c.color.bg,
        color: c.color.fg,
        border: dark ? `1px solid ${tokens.colors.border}` : undefined,
      }}
    >
      {/* HEAD: eyebrow + badge + judul */}
      <div className="col-span-2 px-5 pt-5 sm:px-10 sm:pt-10 md:col-span-1 md:col-start-1 md:row-start-1">
        <div className="fx-child flex items-center justify-between gap-3" style={fxDelay(180)}>
          <p className="text-[11px] font-bold uppercase tracking-widest sm:text-sm">{c.eyebrow}</p>
          <span className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: c.color.fg }}>
            {c.tag}
          </span>
        </div>
        <h3
          className="fx-child mt-3 text-[28px] font-bold leading-[1.05] sm:mt-4 sm:text-[44px]"
          style={fxDelay(260, { fontFamily: tokens.fonts.heading, letterSpacing: '-1px' })}
        >
          {c.name}
        </h3>
      </div>

      {/* BODY: penjelasan (di mobile berdampingan sama gambar) */}
      <div className="min-w-0 pl-5 pr-3 pt-3 sm:pl-10 sm:pr-6 md:col-start-1 md:row-start-2 md:pr-10">
        <p className="fx-child max-w-md text-[13px] leading-relaxed sm:mt-0 sm:text-base" style={fxDelay(340, { color: `${c.color.fg}cc` })}>
          {c.text}
        </p>
        {c.note && (
          <p className="fx-child mt-3 max-w-md text-[11px] leading-relaxed sm:text-sm" style={fxDelay(400, { color: `${c.color.fg}b3` })}>
            {c.note}
          </p>
        )}
      </div>

      {/* VISUAL: gambar mock-up (mobile: kolom kanan sebelah BODY) */}
      <div className="flex items-center justify-center pl-1 pr-4 pt-3 sm:pr-10 md:col-start-2 md:row-span-3 md:row-start-1 md:p-10 md:py-12">
        {c.visual === 'daw' ? (
          <div
            className="fx-child fx-child-pop w-[140px] min-[400px]:w-[170px] sm:w-[260px] md:w-full md:max-w-[520px]"
            style={fxDelay(300)}
          >
            <HeroVisual />
          </div>
        ) : (
          <div className="fx-child fx-child-slide" style={fxDelay(300)}>
            <img
              src={iosMusicMockup}
              alt="Phone showing an iOS-style music player, a preview of the iOS Music Player template"
              width={761}
              height={1200}
              loading="lazy"
              className="fx-float h-[220px] w-auto drop-shadow-[0_12px_20px_rgba(0,0,0,0.3)] min-[400px]:h-[260px] min-[520px]:h-[320px] md:h-[500px] md:drop-shadow-[0_18px_30px_rgba(0,0,0,0.3)]"
            />
          </div>
        )}
      </div>

      {/* CTA: fitur, daftar template, tombol (full-width di mobile) */}
      <div className="col-span-2 flex flex-col px-5 pb-5 sm:px-10 sm:pb-10 md:col-span-1 md:col-start-1 md:row-start-3">
        {c.features.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2 sm:mt-5">
            {c.features.map((f, i) => (
              <li key={f} className="fx-child fx-child-pop rounded-full border px-3 py-1 text-xs font-medium sm:text-sm" style={fxDelay(460 + i * 90, { borderColor: c.color.fg })}>
                {f}
              </li>
            ))}
          </ul>
        )}

        {c.templates && (
          <div className="fx-child mt-6 sm:mt-8" style={fxDelay(540)}>
            <p className="text-xs font-bold uppercase tracking-widest">Templates in this category</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {c.templates.map((t) => (
                <Link
                  key={t.id}
                  to={`/editor/${t.id}`}
                  data-ripple
                  className="inline-flex min-h-[40px] items-center rounded-full border px-5 text-sm font-medium transition duration-200 hover:-translate-y-0.5 hover:opacity-70 active:scale-95"
                  style={{ borderColor: c.color.fg }}
                >
                  {t.name} →
                </Link>
              ))}
            </div>
          </div>
        )}
        {c.href && (
          <div className="fx-child mt-5" style={fxDelay(620)}>
            <Link
              to={c.href}
              data-ripple
              className={`${dark ? pillLight : pillButton} w-full whitespace-nowrap text-center md:w-auto`}
            >
              {c.hrefLabel ?? 'Use template'}
            </Link>
          </div>
        )}
      </div>
    </Reveal>
  )
}

export default function HomePage() {
  return (
    <div style={{ fontFamily: tokens.fonts.body, backgroundColor: tokens.colors.background, color: tokens.colors.text }}>
      <SiteNav />

      <main>
        {/* HERO -- setinggi layar (dikurangi tinggi nav 4rem) biar section di bawahnya
            gak nongol. svh = tinggi layar "aman" di browser mobile (toolbar URL kebuka). */}
        <section
          className="relative flex min-h-[calc(100svh-4rem)] supports-[height:100dvh]:min-h-[calc(100dvh-4rem)] flex-col overflow-hidden py-10 sm:py-14"
          style={{ backgroundColor: tokens.colors.pageBackground }}
        >
          <div className={`${containerClass} flex w-full flex-1 flex-col justify-center`}>
            <p
              className="fx-rise-sm text-xs font-bold uppercase tracking-widest sm:text-sm"
              style={fxDelay(150, { color: '#000000' })}
            >
              (VISUAL TEMPLATES FOR MUSIC)
            </p>
            <h1
              className="mt-3 text-[42px] font-bold leading-[1.05] text-black sm:text-[72px] lg:text-[96px]"
              style={{ fontFamily: tokens.fonts.heading, letterSpacing: '-1.5px' }}
            >
              <span className="fx-mask">
                <span className="fx-mask-inner" style={fxDelay(260)}>MAKE VISUALS</span>
              </span>
              <span className="fx-mask">
                <span className="fx-mask-inner" style={fxDelay(380)}>FOR YOUR MUSIC.</span>
              </span>
            </h1>
            <p className="fx-rise mt-6 max-w-xl text-sm leading-relaxed text-black/70 sm:text-base" style={fxDelay(560)}>
              Rizz. is a set of templates that turn your music into visuals, right in the browser. Start with an
              iOS-style music player. DAW mock-ups built from your own FL Studio Mobile project are on the way.
            </p>
            <div className="fx-stagger mt-8 flex flex-wrap gap-3" style={{ ['--base' as string]: '680ms' }}>
              <a href="#brands" data-ripple className={pillButton}>
                Browse templates →
              </a>
              <a
                href="#what"
                data-ripple
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-black px-6 text-sm font-medium text-black transition duration-200 hover:-translate-y-0.5 hover:bg-black hover:text-white active:translate-y-0 active:scale-95"
              >
                How it works
              </a>
            </div>
          </div>
        </section>

        {/* TEMPLATE CATEGORIES (nav: Our Brands) */}
        <section id="brands" className={sectionClass} style={{ backgroundColor: '#000000' }}>
          <div className={containerClass}>
            <Eyebrow color={tokens.colors.accent}>(TEMPLATE CATEGORIES)</Eyebrow>
            <SectionHeading color="#ffffff">PICK A CATEGORY, THEN A TEMPLATE.</SectionHeading>
            <Reveal as="p" delay={180} className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Every template belongs to a category, and each category is a different kind of visual. Choose the one that
              fits how you want to show your music.
            </Reveal>
            <div className="mt-10 flex flex-col gap-4">
              {CATEGORIES.map((c) => (
                <CategoryRow key={c.id} c={c} />
              ))}
            </div>
          </div>
        </section>

        {/* WHAT WE DO */}
        <section id="what" className={sectionClass} style={{ backgroundColor: '#ffffff' }}>
          <div className={containerClass}>
            <Eyebrow color="#000000">(WHAT WE DO)</Eyebrow>
            <SectionHeading color="#000000">FROM YOUR MUSIC TO A SHAREABLE VISUAL</SectionHeading>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.n} delay={i * 140} className="relative pt-4">
                  <span aria-hidden="true" className="fx-line absolute inset-x-0 top-0 h-0.5 bg-black" style={fxDelay(i * 140)} />
                  <span
                    className="fx-child fx-child-pop inline-block text-5xl font-bold text-black sm:text-6xl"
                    style={fxDelay(i * 140 + 200, { fontFamily: tokens.fonts.heading, letterSpacing: '-1px' })}
                  >
                    {s.n}
                  </span>
                  <h3 className="fx-child mt-3 text-xl font-bold text-black" style={fxDelay(i * 140 + 300, { fontFamily: tokens.fonts.heading })}>
                    {s.title}
                  </h3>
                  <p className="fx-child mt-2 max-w-sm text-sm leading-relaxed text-black/75 sm:text-base" style={fxDelay(i * 140 + 380)}>{s.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* WHO WE ARE */}
        <section id="about" className={sectionClass} style={{ backgroundColor: '#000000' }}>
          <div className={containerClass}>
            <Eyebrow color={tokens.colors.accent}>(WHO WE ARE)</Eyebrow>
            <SectionHeading color="#ffffff">A PERSONAL PROJECT, BUILT IN THE OPEN.</SectionHeading>
            <Reveal as="p" delay={180} className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Rizz. is a personal project for making music visuals in the browser. It began as a mock-up of a DAW playlist
              and now includes an iOS-style music player. DAW mock-ups built from real FL Studio Mobile projects are coming
              to the site soon, with more template types to follow. It is made by one person, the code is public, and it
              keeps changing.
            </Reveal>
          </div>
        </section>

        {/* NEWSROOM */}
        <section id="newsroom" className={sectionClass} style={{ backgroundColor: '#ffffff' }}>
          <div className={containerClass}>
            <Eyebrow color="#000000">(NEWSROOM)</Eyebrow>
            <SectionHeading color="#000000">LATEST UPDATES</SectionHeading>
            <ul className="mt-10 max-w-2xl">
              {UPDATES.map((u, i) => (
                <Reveal
                  as="li"
                  key={u.title}
                  variant="left"
                  delay={i * 90}
                  className="relative flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <span aria-hidden="true" className="fx-line absolute inset-x-0 top-0 h-px" style={fxDelay(i * 90, { backgroundColor: 'rgba(0,0,0,0.15)' })} />
                  <span className="w-24 shrink-0 text-xs font-bold uppercase tracking-widest text-black/50">{u.date}</span>
                  <span className="text-base font-medium text-black">{u.title}</span>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* WHERE TO FIND US / CONTACT */}
        <section id="find" className={sectionClass} style={{ backgroundColor: '#000000' }}>
          <div className={containerClass}>
            <Eyebrow color={tokens.colors.accent}>(WHERE TO FIND US)</Eyebrow>
            <SectionHeading color="#ffffff">FIND RIZZ. ONLINE</SectionHeading>
            <Reveal as="p" delay={180} className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Found a bug, want a new template, or have a question? Chat with me on WhatsApp.
            </Reveal>

            {/* WhatsApp: bug, request template, pertanyaan */}
            <Reveal delay={260} className="mt-8">
              <a
                href={waLink('Hi! I have a message about Rizz.: ')}
                target="_blank"
                rel="noreferrer"
                data-ripple
                className={`${pillLight} w-full gap-2.5 whitespace-nowrap sm:w-auto`}
              >
                <WhatsAppIcon size={20} />
                Chat on WhatsApp
              </a>
              <p className="mt-3 text-sm text-white/50">{WA_DISPLAY}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {WA_TOPICS.map((t) => (
                  <li key={t.label}>
                    <a
                      href={waLink(t.text)}
                      target="_blank"
                      rel="noreferrer"
                      data-ripple
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/60 px-4 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-black active:translate-y-0 active:scale-95"
                    >
                      <WhatsAppIcon size={16} />
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t py-8" style={{ borderColor: tokens.colors.border }}>
        <Reveal variant="fade" className={`${containerClass} flex flex-col gap-2 text-xs text-white/50 sm:flex-row sm:justify-between sm:text-sm`}>
          <span style={{ fontFamily: tokens.fonts.heading }} className="font-bold text-white">
            Rizz.
          </span>
          <span>A personal project. © 2026</span>
        </Reveal>
      </footer>
    </div>
  )
}
