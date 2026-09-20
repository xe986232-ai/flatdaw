import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import HomePage from './pages/home/HomePage'
import DawMockupPage from './pages/template/DawMockupPage'
import EditorPage from './pages/editor/EditorPage'
import IosMusicPlayerApp from './ios-music-player/IosMusicPlayerApp'
import SmoothScroll from './SmoothScroll'
import { useFlmProject } from './useFlmProject'

export default function App() {
  const navigate = useNavigate()

  // Satu-satunya state project + logic import .flm/.zip, hidup di sini (di
  // atas <Routes>, jadi gak ikut unmount pas pindah URL) biar dipakai bareng
  // semua template -- pindah dari /template ke /editor/... (atau antar
  // themeId) gak ngilangin/nge-reset project yang lagi kebuka, dan
  // import-nya cuma satu implementasi (lihat useFlmProject.ts), bukan
  // digandain per-template.
  const flmProject = useFlmProject()

  return (
    <>
      {/* Lenis nyala di semua halaman kecuali /editor/* (lihat SmoothScroll.tsx). */}
      <SmoothScroll />
      <Routes>
      {/* Halaman utama (Rizz.). Hub template tetep di /template/daw-mockup. */}
      <Route path="/" element={<HomePage />} />

      <Route
        path="/template/daw-mockup"
        element={<DawMockupPage onSelectTheme={(themeId) => navigate(`/editor/${themeId}`)} />}
      />

      <Route path="/editor/:themeId" element={<EditorPage {...flmProject} />} />

      {/* Template iOS Music Player -- di-porting dari project spneditz
          (5 varian: lockscreen, glass, black, v4, v5). App-nya sendiri
          (gallery <-> editor) mandiri, gak nyentuh state flmProject. */}
      <Route path="/template/ios-music-player" element={<IosMusicPlayerApp />} />

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
