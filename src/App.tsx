import { useState } from 'react'
import TemplatePage from './pages/TemplatePage'
import EditorTheme1 from './pages/EditorTheme1'
import EditorTheme2 from './pages/EditorTheme2'

type Page = { name: 'template' } | { name: 'editor'; theme: string }

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'template' })

  if (page.name === 'template') {
    return <TemplatePage onSelectTheme={(themeId) => setPage({ name: 'editor', theme: themeId })} />
  }

  // Tiap template berdiri sendiri (komponen & datanya terpisah). Template baru
  // tinggal ditambahin sebagai percabangan lagi di sini.
  if (page.theme === 'theme2') {
    return <EditorTheme2 onBackToTemplates={() => setPage({ name: 'template' })} />
  }
  return <EditorTheme1 onBackToTemplates={() => setPage({ name: 'template' })} />
}
