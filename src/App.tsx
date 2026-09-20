import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import DawMockupPage from './pages/template/DawMockupPage'
import EditorPage from './pages/editor/EditorPage'
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
    <Routes>
      {/* Belum ada halaman utama beneran -- sementara diarahin ke hub
          template. Begini bikin gampang: pas halaman utama udah ada, tinggal
          ganti elemen di path "/" ini, route lain gak kesenggol. */}
      <Route path="/" element={<Navigate to="/template/daw-mockup" replace />} />

      <Route
        path="/template/daw-mockup"
        element={<DawMockupPage onSelectTheme={(themeId) => navigate(`/editor/${themeId}`)} />}
      />

      <Route path="/editor/:themeId" element={<EditorPage {...flmProject} />} />

      <Route path="*" element={<Navigate to="/template/daw-mockup" replace />} />
    </Routes>
  )
}
