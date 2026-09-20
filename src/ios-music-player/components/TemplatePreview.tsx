import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, Clock, Users } from "lucide-react";
import { tokens } from "../../designTokens";
import type { Template } from "../types";
import { subscribeTemplateUsage } from "../lib/exportLog";

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
  onBack,
  onUse,
}: {
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
    "flex items-center gap-1 rounded-full bg-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white";

  return (
    <div
      className="absolute inset-0 z-40 overflow-hidden"
      style={{
        backgroundColor: tokens.colors.pageBackground,
        fontFamily: tokens.fonts.body,
      }}
    >
      {/* Preview full halaman */}
      <div className="absolute inset-0">{preview}</div>

      {/* Overlay atas — tombol kembali + pill judul halaman */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <button
          onClick={onBack}
          aria-label="Kembali ke daftar template"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black text-black transition active:scale-90"
          style={{ backgroundColor: tokens.colors.pageBackground }}
        >
          <ChevronLeft size={20} />
        </button>
        <div
          className="flex h-10 min-w-0 flex-1 items-center rounded-full border border-black px-4"
          style={{ backgroundColor: tokens.colors.pageBackground }}
        >
          <p className="truncate text-[11px] font-bold uppercase tracking-widest text-black">
            (PREVIEW TEMPLATE)
          </p>
        </div>
      </div>

      {/* Overlay bawah — nama template + info + tombol */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <h2
          className="max-w-full truncate rounded-xl border border-black px-3 py-1.5 text-xl font-bold leading-tight text-black"
          style={{
            backgroundColor: tokens.colors.accent,
            fontFamily: tokens.fonts.heading,
            letterSpacing: "-0.5px",
          }}
        >
          {template.name}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <span className={infoChip}>
            <Clock size={11} strokeWidth={2.5} />
            {template.duration}
          </span>
          {usageCount !== null && (
            <span className={`${infoChip} tabular-nums`}>
              <Users size={11} strokeWidth={2.5} />
              {usageCount.toLocaleString("id-ID")} kali digunakan
            </span>
          )}
          {badge && (
            <span
              className="rounded-full bg-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
              style={{ color: tokens.colors.accent }}
            >
              {badge}
            </span>
          )}
        </div>

        <button
          onClick={onUse}
          className="flex h-14 w-full items-center justify-center rounded-2xl border border-black text-base font-bold text-black transition active:scale-[0.98]"
          style={{
            backgroundColor: tokens.colors.accent,
            fontFamily: tokens.fonts.heading,
          }}
        >
          Gunakan template
        </button>
      </div>
    </div>
  );
}
