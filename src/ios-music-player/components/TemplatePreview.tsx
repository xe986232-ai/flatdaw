import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, Clock, Users } from "lucide-react";
import { tokens } from "../../designTokens";
import type { Template } from "../types";
import { subscribeTemplateUsage } from "../lib/exportLog";
import { fxDelay } from "../../motion/hooks";

/** Titik (px, koordinat layar) tempat overlay preview membuka/menutup —
 *  biasanya pusat kartu yang barusan di-tap. */
export type PreviewOrigin = { x: number; y: number };

/** Halaman preview template — muncul pas user tap kartu di galeri
 *  (TemplateGallery). Preview template-nya FULL SATU HALAMAN (edge to
 *  edge), dan semua elemen lain (tombol kembali, judul, nama template,
 *  info, tombol "Gunakan template") jadi OVERLAY yang nempel di atasnya.
 *  Flat: blok warna solid dari palet (pink/hitam/periwinkle) + outline
 *  hitam tipis, tanpa shadow/blur/gradient. Isi preview-nya (`preview`)
 *  dikirim dari galeri biar komponen ini nggak perlu tahu soal thumbnail
 *  kolase. */
export default function TemplatePreview({
  template,
  preview,
  badge,
  origin,
  closing = false,
  onBack,
  onUse,
}: {
  origin: PreviewOrigin;
  /** true = animasi tutup lagi jalan (overlay menyusut ke titik asal). */
  closing?: boolean;
  template: Template;
  /** Node preview — harus `absolute inset-0` (dia ngisi seluruh halaman). */
  preview: ReactNode;
  /** Label tambahan di baris info (mis. "2 Gaya Progress"). */
  badge?: string;
  onBack: () => void;
  onUse: () => void;
}) {
  // Jumlah "X kali digunakan" — real-time dari Firebase, sama kayak kartu
  // di galeri.
  const [usageCount, setUsageCount] = useState<number | null>(null);
  useEffect(() => {
    const unsubscribe = subscribeTemplateUsage(template.id, setUsageCount);
    return unsubscribe;
  }, [template.id]);

  const infoChip =
    "flex items-center gap-1 rounded-full bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white";

  return (
    <div
      className={`absolute inset-0 z-40 overflow-hidden ${
        closing ? "fx-preview-out pointer-events-none" : "fx-preview-in"
      }`}
      style={{
        backgroundColor: tokens.colors.pageBackground,
        fontFamily: tokens.fonts.body,
        ["--ox" as string]: `${origin.x}px`,
        ["--oy" as string]: `${origin.y}px`,
      }}
    >
      {/* Preview full halaman — "mengendap" dari zoom-in pelan pas dibuka */}
      <div className="fx-settle absolute inset-0">{preview}</div>

      {/* Overlay atas — tombol kembali + pill judul halaman */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={onBack}
          aria-label="Kembali ke daftar template"
          data-ripple
          className="fx-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black text-black transition duration-200 hover:-translate-x-0.5 active:scale-90"
          style={fxDelay(300, { backgroundColor: tokens.colors.pageBackground })}
        >
          <ChevronLeft size={18} />
        </button>
        <div
          className="fx-drop flex h-9 min-w-0 flex-1 items-center rounded-full border border-black px-3.5"
          style={fxDelay(360, { backgroundColor: tokens.colors.pageBackground })}
        >
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-black">
            (PREVIEW TEMPLATE)
          </p>
        </div>
      </div>

      {/* Overlay bawah — nama template + info + tombol */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-2 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        <h2
          className="fx-wipe-x max-w-full truncate rounded-lg border border-black px-2.5 py-1 text-sm font-bold leading-tight text-black"
          style={fxDelay(420, {
            backgroundColor: tokens.colors.accent,
            fontFamily: tokens.fonts.heading,
            letterSpacing: "-0.25px",
          })}
        >
          {template.name}
        </h2>

        <div
          className="fx-stagger flex flex-wrap items-center gap-2"
          style={{ ["--base" as string]: "500ms" }}
        >
          <span className={infoChip}>
            <Clock size={10} strokeWidth={2.5} />
            {template.duration}
          </span>
          {usageCount !== null && (
            <span className={`${infoChip} tabular-nums`}>
              <Users size={10} strokeWidth={2.5} />
              {usageCount.toLocaleString("id-ID")} kali digunakan
            </span>
          )}
          {badge && (
            <span
              className="rounded-full bg-black px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ color: tokens.colors.accent }}
            >
              {badge}
            </span>
          )}
        </div>

        <button
          onClick={onUse}
          data-ripple
          className="fx-rise mt-1 flex h-11 w-full items-center justify-center rounded-xl border border-black text-sm font-bold text-black transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          style={fxDelay(620, {
            backgroundColor: tokens.colors.accent,
            fontFamily: tokens.fonts.heading,
          })}
        >
          Gunakan template
        </button>
      </div>
    </div>
  );
}
