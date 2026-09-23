import { TileWaveformIcon } from './icons'

// Di-port dari rizwoow (src/components/marketing/product-card.tsx) sebagai
// bagian dari migrasi bertahap. Nama file & import disesuaikan ke konvensi
// rizzsemlehoy (PascalCase, tanpa alias "@/").

interface ProductCardProps {
  name: string
  type: string
  price: string
  image: string
}

export function ProductCard({ name, type, price, image }: ProductCardProps) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-[32px] border-[3px] border-accent bg-surface">
      <div className="relative h-40 w-full overflow-hidden">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur">
          <TileWaveformIcon width={14} height={14} />
        </div>
      </div>
      <div className="flex flex-col gap-1 p-md">
        <span className="text-sm uppercase tracking-wide text-muted">
          {type}
        </span>
        <h4 className="text-lg font-medium">{name}</h4>
        <span className="mt-2 text-base text-foreground">{price}</span>
      </div>
    </div>
  )
}
