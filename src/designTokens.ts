// Design tokens diambil dari style-guide referensi (Believe.com) —
// dipakai khusus di halaman TemplatePage biar landing page-nya konsisten
// sama palet/tipografi referensi tanpa nyentuh tema editor yang lain.

export const tokens = {
  colors: {
    accent: '#ffacff',
    // Aksen coral khusus halaman template iOS Music Player (galeri, preview,
    // editor) + curtain transisi. Diambil dari referensi Believe.com.
    // TIDAK mengubah `accent` (pink) yang dipakai homepage.
    templateAccent: '#fd6363',
    background: '#000000',
    text: '#ffffff',
    border: '#374151',
    // Warna hero/page background sesuai referensi terbaru (periwinkle),
    // dipakai bareng di TemplatePage (bagian atas) dan EditorTheme1
    // supaya kedua halaman terasa satu kesatuan.
    pageBackground: '#8b93f0',
  },
  fonts: {
    heading: '"Rubik", Arial, Helvetica, sans-serif',
    display: '"Noto Sans", Arial, Helvetica, sans-serif',
    body: '"Noto Sans", Arial, Helvetica, sans-serif',
  },
  spacing: {
    xs: '8px',
    sm: '16px',
    md: '32px',
    lg: '48px',
    xl: '108px',
  },
} as const

// Palet warna blok section, gantian tiap kartu template — biar tiap
// "penjelasan template" punya identitas warna sendiri kayak di referensi
// (coral, periwinkle, orange, tan/khaki), tetep kontras sama teks hitam.
export const SECTION_PALETTE = [
  { bg: '#ff6b6b', fg: '#000000' }, // coral
  { bg: '#8ea6f4', fg: '#000000' }, // periwinkle
  { bg: '#ffac4d', fg: '#000000' }, // orange
  { bg: '#d8b878', fg: '#000000' }, // tan/khaki
] as const
