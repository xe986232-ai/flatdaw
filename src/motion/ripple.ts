// Ripple klik flat: elemen apa pun yang punya atribut `data-ripple` dapat
// lingkaran yang membesar dari titik sentuh lalu memudar (warna = currentColor,
// tanpa blur/glow). Dipasang SEKALI di root lewat listener delegasi.
export function installRipple(): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  const onDown = (e: PointerEvent) => {
    if (reduced.matches) return
    const target = (e.target as Element | null)?.closest<HTMLElement>('[data-ripple]')
    if (!target) return
    if (target instanceof HTMLButtonElement && target.disabled) return

    const rect = target.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2.2
    const dot = document.createElement('span')
    dot.className = 'fx-ripple'
    dot.style.width = dot.style.height = `${size}px`
    dot.style.left = `${e.clientX - rect.left - size / 2}px`
    dot.style.top = `${e.clientY - rect.top - size / 2}px`
    target.appendChild(dot)
    dot.addEventListener('animationend', () => dot.remove(), { once: true })
  }

  document.addEventListener('pointerdown', onDown, { passive: true })
  return () => document.removeEventListener('pointerdown', onDown)
}
