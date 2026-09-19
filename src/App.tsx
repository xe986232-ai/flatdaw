import { useState } from 'react'
import TemplatePage from './pages/TemplatePage'
import EditorTheme1 from './pages/EditorTheme1'
import EditorTheme2 from './pages/EditorTheme2'
import { useFlmProject } from './useFlmProject'

type Page = { name: 'template' } | { name: 'editor'; theme: string }

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'template' })

  // Satu-satunya state project + logic import .flm/.zip, hidup di sini biar
  // dipakai bareng sama Template 01 dan Template 02 — pindah template gak
  // ngilangin/nge-reset project yang lagi kebuka, dan import-nya cuma satu
  // implementasi (lihat useFlmProject.ts), bukan digandain per-template.
  const flmProject = useFlmProject()

  if (page.name === 'template') {
    return <TemplatePage onSelectTheme={(themeId) => setPage({ name: 'editor', theme: themeId })} />
  }

  // Tiap template beda TAMPILAN doang — data & logic project-nya (trackList,
  // trackColors, projectBpm, import .flm) sama-sama ditarik dari flmProject.
  if (page.theme === 'theme2') {
    return <EditorTheme2 onBackToTemplates={() => setPage({ name: 'template' })} {...flmProject} />
  }
  return <EditorTheme1 onBackToTemplates={() => setPage({ name: 'template' })} {...flmProject} />
}
