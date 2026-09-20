import { useEffect, useState } from 'react'
import TemplateGallery from './components/TemplateGallery'
import Editor from './components/Editor'
import DialogHost from './components/DialogHost'
import type { Template } from './types'
import { ensureCoverImagesSeeded, ensureGlassCoverImagesMigrated } from './lib/coverImages'
import { useCurtain } from '../motion/Curtain'

// Wrapper buat halaman /template/ios-music-player di flatdaw. Logic-nya
// (toggle Gallery <-> Editor pakai state lokal) di-porting langsung dari
// App.tsx di project spneditz -- itu emang app asal template iOS Music
// Player ini, jadi flow-nya dipertahanin sama persis. Satu-satunya beda:
// gak ada AdminDashboard/route /sawadikap (di luar scope permintaan Jj).
//
// Pindah Gallery <-> Editor dibungkus curtain (panel flat yang menyapu
// layar) supaya pergantian layarnya bukan "kedip" instan.
export default function IosMusicPlayerApp() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [resumeDraftId, setResumeDraftId] = useState<string | null>(null)
  const { run, curtain } = useCurtain()

  useEffect(() => {
    ensureCoverImagesSeeded()
    ensureGlassCoverImagesMigrated()
  }, [])

  return (
    <>
      {!selectedTemplate ? (
        <TemplateGallery
          onSelect={(template, draftId) => {
            run(() => {
              setResumeDraftId(draftId ?? null)
              setSelectedTemplate(template)
            })
          }}
        />
      ) : (
        <Editor
          template={selectedTemplate}
          onBack={() => {
            run(() => {
              setSelectedTemplate(null)
              setResumeDraftId(null)
            })
          }}
          resumeDraftId={resumeDraftId}
        />
      )}
      <DialogHost />
      {curtain}
    </>
  )
}
