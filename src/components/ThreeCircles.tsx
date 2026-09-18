type ThreeCirclesProps = {
  color?: string
  size?: number
  className?: string
}

// Motif dekoratif "tiga lingkaran bertumpuk" yang muncul berulang di
// referensi (believe.com) — satu lingkaran di atas, dua berdempetan di
// bawah. Dipakai sebagai aksen visual di landing page template.
export function ThreeCircles({ color = '#ffffff', size = 96, className = '' }: ThreeCirclesProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size * 1.7, height: size * 1.9 }}>
      <div
        className="absolute rounded-full"
        style={{ width: size, height: size, left: size * 0.35, top: 0, backgroundColor: color }}
      />
      <div
        className="absolute rounded-full"
        style={{ width: size, height: size, left: 0, top: size * 0.9, backgroundColor: color }}
      />
      <div
        className="absolute rounded-full"
        style={{ width: size, height: size, left: size * 0.7, top: size * 0.9, backgroundColor: color }}
      />
    </div>
  )
}
