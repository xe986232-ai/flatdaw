import { useState } from 'react'
import TemplatePage from './pages/TemplatePage'
import EditorTheme1 from './pages/EditorTheme1'

type Page = { name: 'template' } | { name: 'editor'; theme: string }

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'template' })

  if (page.name === 'template') {
    return <TemplatePage onSelectTheme={(themeId) => setPage({ name: 'editor', theme: themeId })} />
  }

  // Untuk sekarang cuma ada theme1 — begitu ada theme baru, tinggal
  // tambahin percabangan berdasarkan page.theme di sini.
  return <EditorTheme1 onBackToTemplates={() => setPage({ name: 'template' })} />
}
