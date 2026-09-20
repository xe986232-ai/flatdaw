import { createElement, useRef, type CSSProperties, type ReactNode } from 'react'
import { fxDelay, useInView } from './hooks'

type Variant = 'up' | 'fade' | 'scale' | 'left' | 'right'

/** Bungkus elemen supaya "muncul" (fade + geser/scale) begitu masuk layar
 *  waktu di-scroll. Anak yang ditandai `.fx-child` / `.fx-clip` / `.fx-line`
 *  di dalamnya ikut beranimasi berurutan (lihat motion.css). */
export default function Reveal({
  as = 'div',
  variant = 'up',
  delay = 0,
  className = '',
  style,
  children,
}: {
  as?: 'div' | 'p' | 'li' | 'h2' | 'h3' | 'span' | 'section' | 'ul' | 'ol' | 'article'
  variant?: Variant
  delay?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref)
  return createElement(
    as,
    {
      ref,
      className: `fx-reveal ${variant === 'up' ? '' : `fx-reveal-${variant}`} ${inView ? 'is-in' : ''} ${className}`,
      style: fxDelay(delay, style),
    },
    children,
  )
}
