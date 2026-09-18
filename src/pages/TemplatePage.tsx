import { tokens, SECTION_PALETTE } from '../designTokens'

type TemplatePageProps = {
  onSelectTheme: (themeId: string) => void
}

type ThemeDef = {
  id: string
  eyebrow: string
  name: string
  tagline: string
  description: string
  features: string[]
  available: boolean
}

const THEMES: ThemeDef[] = [
  {
    id: 'theme1',
    eyebrow: '(TEMPLATE 01)',
    name: 'CLASSIC DAW',
    tagline: 'Buat kamu yang mau tampilan editor lengkap & rapi',
    description:
      'Playlist horizontal ala DAW asli, lengkap dengan piano roll, automation lane, waveform, dan export ke gambar atau video langsung dari browser.',
    features: ['Playlist & piano roll', 'Automation lane', 'Export PNG & MP4', 'Rasio 16:9 & 9:16'],
    available: true,
  },
  {
    id: 'theme2',
    eyebrow: '(TEMPLATE 02)',
    name: 'SEGERA HADIR',
    tagline: 'Template berikutnya lagi disiapin',
    description: 'Slot template baru bisa ditambahin di sini kapan aja — tinggal susulin desain & editornya.',
    features: [],
    available: false,
  },
]

export default function TemplatePage({ onSelectTheme }: TemplatePageProps) {
  return (
    <div style={{ fontFamily: tokens.fonts.body, backgroundColor: tokens.colors.background, color: tokens.colors.text }}>
      {/* HERO */}
      <section
        className="relative overflow-hidden px-6 pb-16 pt-14 sm:px-10"
        style={{ backgroundColor: tokens.colors.pageBackground }}
      >
        <p
          className="text-xs font-bold uppercase tracking-widest sm:text-sm"
          style={{ color: '#000000', fontFamily: tokens.fonts.body }}
        >
          (PILIH TEMPLATE)
        </p>
        <h1
          className="mt-3 text-[42px] font-bold leading-[1.05] sm:text-[72px]"
          style={{ fontFamily: tokens.fonts.heading, letterSpacing: '-1.5px', color: '#000000' }}
        >
          FLATDAW
          <br />
          TEMPLATE HUB
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-black/70 sm:text-base">
          Pilih tampilan editor yang paling cocok buat project kamu. Tiap template punya gaya
          dan fitur sendiri — tinggal klik, langsung masuk ke editornya.
        </p>
      </section>

      {/* SECTION PER TEMPLATE */}
      {THEMES.map((theme, i) => {
        const palette = SECTION_PALETTE[i % SECTION_PALETTE.length]
        return (
          <section
            key={theme.id}
            className="relative overflow-hidden px-6 py-14 sm:px-10 sm:py-20"
            style={{ backgroundColor: theme.available ? palette.bg : '#111111' }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest sm:text-sm"
              style={{ color: theme.available ? palette.fg : '#ffffff80' }}
            >
              {theme.eyebrow}
            </p>
            <h2
              className="mt-3 text-[34px] font-bold leading-[1.05] sm:text-[52px]"
              style={{
                fontFamily: tokens.fonts.heading,
                letterSpacing: '-1px',
                color: theme.available ? palette.fg : '#ffffff90',
              }}
            >
              {theme.name}
            </h2>
            <p
              className="mt-2 text-sm font-semibold sm:text-base"
              style={{ color: theme.available ? palette.fg : '#ffffff70' }}
            >
              {theme.tagline}
            </p>
            <p
              className="mt-5 max-w-lg text-sm leading-relaxed sm:text-base"
              style={{ color: theme.available ? `${palette.fg}cc` : '#ffffff60' }}
            >
              {theme.description}
            </p>

            {theme.features.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {theme.features.map((f) => (
                  <li
                    key={f}
                    className="rounded-full border px-3 py-1 text-xs font-medium sm:text-sm"
                    style={{ borderColor: palette.fg, color: palette.fg }}
                  >
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8">
              {theme.available ? (
                <button
                  type="button"
                  onClick={() => onSelectTheme(theme.id)}
                  className="inline-flex min-h-[40px] min-w-[120px] items-center justify-center rounded"
                  style={{
                    backgroundColor: tokens.colors.background,
                    color: tokens.colors.text,
                    fontFamily: tokens.fonts.body,
                    padding: '8px 20px',
                    fontWeight: 400,
                    border: '1px solid transparent',
                  }}
                >
                  Pilih Template →
                </button>
              ) : (
                <span
                  className="inline-flex min-h-[40px] min-w-[120px] cursor-not-allowed items-center justify-center rounded border"
                  style={{ borderColor: '#ffffff40', color: '#ffffff50', padding: '8px 20px' }}
                >
                  Segera Hadir
                </span>
              )}
            </div>
          </section>
        )
      })}

      {/* FOOTER */}
      <footer
        className="border-t px-6 py-8 text-center text-xs sm:text-sm"
        style={{ borderColor: tokens.colors.border, color: '#ffffff50' }}
      >
        flatdaw — dibikin buat proyek pribadi
      </footer>
    </div>
  )
}
