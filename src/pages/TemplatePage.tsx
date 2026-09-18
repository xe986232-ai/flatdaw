type TemplatePageProps = {
  onSelectTheme: (themeId: string) => void
}

const THEMES = [
  {
    id: 'theme1',
    name: 'Theme 1',
    description: 'Tampilan DAW klasik — playlist horizontal, piano roll, dan export video/gambar.',
    available: true,
  },
  // Slot untuk theme berikutnya — tinggal tambahin object baru di sini,
  // set available: false selama halaman editornya belum dibikin.
]

export default function TemplatePage({ onSelectTheme }: TemplatePageProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-6 bg-[#1a1a1d] p-6 text-white">
      <div className="mt-4 flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold">Pilih Template</h1>
        <p className="text-sm text-white/60">Pilih tampilan editor yang mau dipakai</p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            disabled={!theme.available}
            onClick={() => theme.available && onSelectTheme(theme.id)}
            className={`flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition ${
              theme.available
                ? 'border-surface-grid bg-surface-base hover:border-white/40 cursor-pointer'
                : 'border-surface-grid/50 bg-surface-base/50 cursor-not-allowed opacity-50'
            }`}
          >
            <div
              className="flex h-32 w-full items-center justify-center rounded-md border border-surface-grid bg-[#101012] text-xs text-white/40"
              style={{ aspectRatio: '16 / 9' }}
            >
              Preview
            </div>
            <div className="flex w-full items-center justify-between">
              <span className="font-medium">{theme.name}</span>
              {!theme.available && (
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
                  Segera
                </span>
              )}
            </div>
            <p className="text-xs text-white/60">{theme.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
