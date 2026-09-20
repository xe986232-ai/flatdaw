import { useEffect, useState } from 'react'
import TemplateGallery from './components/TemplateGallery'
import Editor from './components/Editor'
import type { Template } from './types'
import { ensureCoverImagesSeeded, ensureGlassCoverImagesMigrated } from './lib/coverImages'

// Wrapper buat halaman /template/ios-music-player di flatdaw. Logic-nya
// (toggle Gallery <-> Editor pakai state lokal) di-porting langsung dari
// App.tsx di project spneditz -- itu emang app asal template iOS Music
// Player ini, jadi flow-nya dipertahanin sama persis. Satu-satunya beda:
// gak ada AdminDashboard/route /sawadikap (di luar scope permintaan Jj).
export default function IosMusicPlayerApp() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [resumeDraftId, setResumeDraftId] = useState<string | null>(null)

  useEffect(() => {
    ensureCoverImagesSeeded()
    ensureGlassCoverImagesMigrated()
  }, [])

  if (!selectedTemplate) {
    return (
      <TemplateGallery
        onSelect={(template, draftId) => {
          setResumeDraftId(draftId ?? null)
          setSelectedTemplate(template)
        }}
      />
    )
  }

  return (
    <Editor
      template={selectedTemplate}
      onBack={() => {
        setSelectedTemplate(null)
        setResumeDraftId(null)
      }}
      resumeDraftId={resumeDraftId}
    />
  )
}
