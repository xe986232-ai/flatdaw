import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, Clock, Users } from "lucide-react";
import { tokens } from "../../designTokens";
import type { Template } from "../types";
import { subscribeTemplateUsage } from "../lib/exportLog";

/** Halaman preview template — muncul pas user tap kartu di galeri
 *  (TemplateGallery). Isinya: preview besar template, nama + info singkat,
 *  dan tombol "Gunakan template" yang baru masuk ke Editor. Flat, satu
 *  warna sama hero homepage (periwinkle), garis tipis hitam, tanpa
 *  shadow/blur. Isi preview-nya (`preview`) dikirim dari galeri biar
 *  komponen ini nggak perlu tahu soal thumbnail kolase. */
export default function TemplatePreview({
  template,
  preview,
  badge,
  onBack,
  onUse,
}: {
  template: Template;
  /** Node preview — harus `absolute inset-0` (dia ngisi frame 9:16). */
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

  const chipClass =
    "flex items-center gap-1 rounded-full border border-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black";

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col"
      style={{
        backgroundColor: tokens.colors.pageBackground,
        fontFamily: tokens.fonts.body,
      }}
    >
      {/* Bar atas — tombol kembali + pill judul halaman */}
      <div className="flex shrink-0 items-center gap-3 border-b border-black px-4 pb-3 pt-5">
        <button
          onClick={onBack}
          aria-label="Kembali ke daftar template"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black text-black transition hover:bg-black hover:text-white active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex h-10 min-w-0 flex-1 items-center rounded-full border border-black px-4">
          <p className="truncate text-[11px] font-bold uppercase tracking-widest text-black">
            (PREVIEW TEMPLATE)
          </p>
        </div>
      </div>

      {/* Preview besar 9:16 */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4">
        <div
          className="relative h-full max-w-full overflow-hidden rounded-3xl border border-black bg-black/5"
          style={{ aspectRatio: "9 / 16" }}
        >
          {preview}
        </div>
      </div>

      {/* Info + CTA */}
      <div className="shrink-0 border-t border-black px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <h2
          className="truncate text-2xl font-bold leading-tight text-black"
          style={{ fontFamily: tokens.fonts.heading, letterSpacing: "-0.5px" }}
        >
          {template.name}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={chipClass}>
            <Clock size={11} strokeWidth={2.5} />
            {template.duration}
          </span>
          {usageCount !== null && (
            <span className={`${chipClass} tabular-nums`}>
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
          className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl border border-black text-base font-bold text-black transition active:scale-[0.98]"
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
