import { Navigate, useNavigate, useParams } from 'react-router-dom'
import EditorTheme1 from './EditorTheme1'
import EditorTheme2 from './EditorTheme2'
import type { FlmProject } from '../../useFlmProject'

// Halaman editor, ke-mount di /editor/:themeId (mis. /editor/theme1,
// /editor/theme2). Nentuin template mana yang digambar dari param URL,
// bukan dari state lokal lagi -- jadi tiap template editor punya alamat
// sendiri (bisa di-bookmark/di-share/refresh langsung ke situ), sesuai
// rencana bakal ada halaman utama + template lain nanti.
//
// flmProject (state project + logic import .flm/.zip) tetep dipegang satu
// tempat di App.tsx terus dioper turun ke sini lewat props -- BUKAN dibikin
// ulang di sini -- biar pindah dari satu themeId ke themeId lain (atau balik
// ke /template/daw-mockup) gak ngilangin/nge-reset project yang lagi kebuka.
export default function EditorPage(props: FlmProject) {
  const { themeId } = useParams<{ themeId: string }>()
  const navigate = useNavigate()
  const onBackToTemplates = () => navigate('/template/daw-mockup')

  if (themeId === 'theme2') {
    return <EditorTheme2 onBackToTemplates={onBackToTemplates} {...props} />
  }
  if (themeId === 'theme1') {
    return <EditorTheme1 onBackToTemplates={onBackToTemplates} {...props} />
  }
  // themeId gak dikenal -> balik ke halaman pilih template.
  return <Navigate to="/template/daw-mockup" replace />
}
