import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Image as ImageIcon,
  Search,
  Sparkles,
  ArrowRight,
  AudioWaveform,
  SlidersHorizontal,
  LayoutGrid,
  FolderClock,
  Trash2,
  Loader2,
  FilePlus2,
  Download,
  Upload,
} from "lucide-react";
import { tokens } from "../../designTokens";
import { TEMPLATES } from "../data/templates";
import type { Template } from "../types";
import { subscribeTemplateUsage } from "../lib/exportLog";
import { subscribeTemplateEnabled } from "../lib/templateFlags";
import TemplateThumbnail, { ThumbnailSkeleton } from "./TemplateThumbnail";
import { renderTemplateThumbnail } from "../lib/thumbnail";
import {
  listDrafts,
  deleteDraft,
  MAX_DRAFTS,
  type DraftSummary,
} from "../lib/drafts";
import {
  exportDraftToFile,
  readTemplateExportFile,
  importTemplateExportFile,
} from "../lib/templateExport";

// Id template yang dapet perlakuan khusus: thumbnail kolase 2 foto yang
// dibelah miring, biar sekilas kelihatan template ini punya 2 gaya
// progress (bar polos & waveform) — bukan cuma 1 render statis kayak
// kartu template lain. Kalau nanti ada template lain yang mau dikasih
// gaya sama, tinggal tambahin id-nya di sini.
const COLLAGE_TEMPLATE_IDS = new Set(["iphone-music-player"]);

// Cache di level modul buat 2 potongan kolase (bar & waveform) — sama
// pola-nya kayak thumbnailCache di TemplateThumbnail.tsx, biar nggak
// render ulang canvas tiap kartu ini muncul lagi.
const collageCache = new Map<string, { bar: string; waveform: string }>();

/** Thumbnail kolase — 2 potongan gambar dibelah pakai clip-path miring
 *  ("keren", bukan potongan lurus doang), disambung sama pita aksen ungu
 *  — SAMA PERSIS warna editor-accent yang dipakai di halaman Editor
 *  (rgba(124,108,255,…)), bukan warna ungu custom terpisah, biar kartu
 *  galeri & editor kerasa satu identitas visual. Potongan atas & bawahnya
 *  jepretan CANVAS SUNGGUHAN (hasil renderTemplateThumbnail, sama mesinnya
 *  kayak TemplateThumbnail), jadi kelihatan background, card player, foto
 *  sampul (random dari Firebase/Unsplash), teks, DAN progress-nya
 *  sekalian — potongan atas gaya "Progress Bar" klasik, potongan bawah
 *  gaya "Waveform" iconik. */
function CollageThumbnail({
  template,
  className,
}: {
  template: Template;
  className?: string;
}) {
  const cached = collageCache.get(template.id);
  const [shots, setShots] = useState<{ bar: string; waveform: string } | null>(
    cached ?? null,
  );
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    if (collageCache.has(template.id)) {
      setShots(collageCache.get(template.id)!);
      return () => {
        cancelledRef.current = true;
      };
    }

    Promise.all([
      // Crop 6%–75% tinggi canvas: lompatin margin atas kosong, langsung
      // mulai dari foto sampul, ikutin teks judul/artist, sampai progress
      // bar/waveform + label durasi — biar elemen progress-nya SAMA-SAMA
      // kepotong di dalam frame kolase (baik potongan atas "bar" maupun
      // potongan bawah "waveform").
      renderTemplateThumbnail(template, undefined, "bar", [0.06, 0.75]),
      renderTemplateThumbnail(template, undefined, "waveform", [0.06, 0.75]),
    ])
      .then(([bar, waveform]) => {
        if (cancelledRef.current) return;
        const result = { bar, waveform };
        collageCache.set(template.id, result);
        setShots(result);
      })
      .catch(() => {
        // Render canvas gagal (mis. aset gagal load) — biarin kosong,
        // ThumbnailSkeleton di TemplateCard tetap kepasang lewat fallback
        // gradient background kartu, jadi kartu nggak kelihatan rusak.
      });
    return () => {
      cancelledRef.current = true;
    };
  }, [template]);

  // Garis potong miring: dari (0%, 58%) ke (100%, 44%) — dipakai bareng
  // buat 2 foto DAN pita pemisahnya, biar semuanya nyambung presisi
  // walau ukuran kartu beda-beda (persen, bukan px, jadi selalu pas).
  const topClip = "polygon(0% 0%, 100% 0%, 100% 44%, 0% 58%)";
  const bottomClip = "polygon(0% 58%, 100% 44%, 100% 100%, 0% 100%)";
  const bandClip = "polygon(0% 55.5%, 100% 41.5%, 100% 47%, 0% 61%)";

  if (!shots) {
    return <ThumbnailSkeleton className={className} />;
  }

  return (
    <div className={`absolute inset-0 ${className ?? ""}`}>
      <img
        src={shots.bar}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: topClip }}
      />
      <img
        src={shots.waveform}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: bottomClip }}
      />

      {/* pita pemisah miring, warna aksen pink homepage — flat, tanpa
          glow/blur */}
      <div
        className="absolute inset-0"
        style={{ clipPath: bandClip, backgroundColor: tokens.colors.accent }}
      />

      {/* badge bulat pas di tengah sambungan — flat, putih polos */}
      <div className="absolute left-1/2 top-[49.5%] z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white">
        <Sparkles size={12} className="text-black" />
      </div>

      {/* chip mini "Progress Bar" di potongan atas — pill hitam flat, gak
          ada blur */}
      <div className="absolute left-2.5 top-[15%] flex items-center gap-1.5 rounded-full bg-black px-2 py-1">
        <SlidersHorizontal size={9} className="shrink-0 text-white/80" />
        <div className="h-1 w-9 overflow-hidden rounded-full bg-white/25">
          <div className="h-full w-[62%] rounded-full bg-white" />
        </div>
      </div>

      {/* chip mini "Waveform" di potongan bawah */}
      <div className="absolute bottom-[14%] left-2.5 flex items-center gap-1.5 rounded-full bg-black px-2 py-1">
        <AudioWaveform size={9} className="shrink-0 text-white/80" />
        <div className="flex items-end gap-[1.5px]">
          {[3, 7, 4, 9, 5, 8, 3].map((h, i) => (
            <span key={i} className="w-[2px] rounded-full bg-white" style={{ height: `${h}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// "5 menit lalu", "2 jam lalu", dst — dipakai buat label kapan draft
// terakhir di-auto-save.
function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari lalu`;
}

function DraftCard({
  draft,
  onResume,
  onDelete,
  onExport,
  busy,
  exporting,
}: {
  draft: DraftSummary;
  onResume: (draft: DraftSummary) => void;
  onDelete: (draft: DraftSummary) => void;
  onExport: (draft: DraftSummary) => void;
  busy: boolean;
  exporting: boolean;
}) {
  return (
    <div
      className="group relative flex w-full flex-col overflow-hidden rounded-3xl border border-black text-left"
      style={{ backgroundColor: tokens.colors.accent }}
    >
      <button
        onClick={() => onResume(draft)}
        disabled={busy}
        className="relative flex h-full flex-col overflow-hidden text-left transition active:scale-[0.97] disabled:opacity-60"
      >
        <div className="relative aspect-[9/16] w-full overflow-hidden bg-black/5">
          {draft.thumbnail ? (
            <img
              src={draft.thumbnail}
              alt={`Draft ${draft.templateName}`}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-active:scale-105"
            />
          ) : (
            <ThumbnailSkeleton />
          )}
          <span
            className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-black"
            style={{ backgroundColor: tokens.colors.accent }}
          >
            <FolderClock size={9} strokeWidth={2.5} />
            Draft
          </span>
        </div>

        <div className="flex flex-col gap-1 border-t border-black px-3 py-2.5">
          <p
            className="truncate text-[13px] font-semibold leading-tight tracking-tight text-black"
            style={{ fontFamily: tokens.fonts.heading }}
          >
            {draft.templateName}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[9.5px] text-black/70">
              {formatRelativeTime(draft.updatedAt)}
            </span>
            <span className="flex h-6 shrink-0 items-center justify-center rounded-full bg-black px-2.5 text-[10px] font-semibold tracking-wide text-white transition-transform duration-300 group-active:translate-x-0.5">
              Edit
            </span>
          </div>
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onExport(draft);
        }}
        disabled={busy || exporting}
        title="Export template (simpan sebagai file)"
        aria-label="Export template"
        className="absolute right-2.5 top-11 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-black/70 transition hover:text-black active:scale-90 disabled:opacity-60"
      >
        {exporting ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Download size={12} />
        )}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(draft);
        }}
        disabled={busy || exporting}
        title="Hapus draft"
        aria-label="Hapus draft"
        className="absolute right-2.5 top-2.5 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-black/70 transition hover:text-black active:scale-90 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Trash2 size={12} />
        )}
      </button>
    </div>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: (t: Template) => void;
}) {
  // Jumlah "X kali digunakan" — dengerin real-time dari Firebase Realtime
  // Database, di-update otomatis tiap ada export baru (nggak perlu refresh).
  const [usageCount, setUsageCount] = useState<number | null>(null);
  useEffect(() => {
    const unsubscribe = subscribeTemplateUsage(template.id, setUsageCount);
    return unsubscribe;
  }, [template.id]);

  function handleClick() {
    onSelect(template);
  }

  // Template dengan gaya kolase khusus — potongan atas & bawahnya dua
  // jepretan canvas SUNGGUHAN dari template ini sendiri (gaya "bar" &
  // "waveform").
  const isCollageStyle = COLLAGE_TEMPLATE_IDS.has(template.id);

  return (
    <button
      onClick={handleClick}
      className="group relative flex w-full flex-col overflow-hidden rounded-3xl border border-black text-left transition-transform duration-300 active:scale-[0.97]"
      style={{ backgroundColor: tokens.colors.accent }}
    >
      <div className="relative flex h-full flex-col overflow-hidden">
        {/* kartu preview */}
        <div className="relative aspect-[9/16] w-full overflow-hidden bg-black/5">
          {isCollageStyle ? (
            <CollageThumbnail
              template={template}
              className="transition duration-500 group-active:scale-105"
            />
          ) : (
            <TemplateThumbnail
              template={template}
              alt={`Preview ${template.name}`}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-active:scale-105"
            />
          )}

          {/* badge "2 Gaya Progress" — cuma di kartu bergaya kolase */}
          {isCollageStyle && (
            <span
              className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-black"
              style={{ backgroundColor: tokens.colors.accent }}
            >
              <Sparkles size={9} strokeWidth={2.5} />
              2 Gaya Progress
            </span>
          )}

          <span className="absolute right-2.5 top-2.5 rounded-full bg-black px-2 py-0.5 text-[9px] font-semibold tabular-nums tracking-wide text-white">
            {template.duration}
          </span>
        </div>

        {/* footer — nama template + CTA "Gunakan", flat, ngikutin pola
            pill/tombol di halaman utama (bg-black, teks putih) */}
        <div className="flex flex-col gap-1.5 border-t border-black px-3 py-2.5">
          <p
            className="truncate text-[13px] font-semibold leading-tight tracking-tight text-black"
            style={{ fontFamily: tokens.fonts.heading }}
          >
            {template.name}
          </p>

          <div className="flex items-center justify-between gap-2">
            {isCollageStyle ? (
              <p className="truncate text-[9.5px] text-black/75">
                Bar klasik & waveform, tinggal pilih
              </p>
            ) : usageCount !== null ? (
              <div className="flex items-center gap-1 text-[9.5px] text-black/70">
                <ImageIcon size={10} strokeWidth={2} />
                <span className="tabular-nums">
                  {usageCount.toLocaleString("id-ID")} kali digunakan
                </span>
              </div>
            ) : (
              <span />
            )}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-white transition-transform duration-300 group-active:translate-x-0.5">
              <ArrowRight size={12} strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function TemplateGallery({
  onSelect,
}: {
  /** draftId diisi kalau user melanjutkan draft lama dari tab "Draft" —
   *  Editor bakal hydrate semua state project-nya dari draft itu. Kosong
   *  (undefined) = project baru dari template polos seperti biasa. */
  onSelect: (template: Template, draftId?: string) => void;
}) {
  // Set berisi id template yang lagi DINONAKTIFIN dari dashboard admin
  // (config/templates/{id}/enabled === false). Template yang ada di sini
  // langsung di-hide total dari galeri, bukan cuma digrayscale kayak
  // sebelumnya — dengerin real-time per template biar begitu admin
  // matiin/nyalain lewat dashboard, daftar di sini ikut update otomatis
  // tanpa perlu refresh.
  const [disabledTemplateIds, setDisabledTemplateIds] = useState<Set<string>>(
    () => new Set(),
  );
  useEffect(() => {
    const unsubscribes = TEMPLATES.map((template) =>
      subscribeTemplateEnabled(template.id, (enabled) => {
        setDisabledTemplateIds((prev) => {
          const alreadyDisabled = prev.has(template.id);
          if (enabled === !alreadyDisabled) return prev; // no change, skip re-render
          const next = new Set(prev);
          if (enabled) next.delete(template.id);
          else next.add(template.id);
          return next;
        });
      }),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, []);
  const visibleTemplates = useMemo(
    () => TEMPLATES.filter((t) => !disabledTemplateIds.has(t.id)),
    [disabledTemplateIds],
  );

  // Tab bawah: "draft" (default — daftar project yang lagi dikerjain,
  // auto-tersimpan, lihat lib/drafts.ts) atau "template" (galeri).
  // Default-nya "draft" biar tiap buka web / keluar dari Editor, user
  // langsung diarahin ke project lama dulu, bukan galeri template.
  const [activeTab, setActiveTab] = useState<"draft" | "template">(
    "draft",
  );
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftBusyId, setDraftBusyId] = useState<string | null>(null);
  const [draftExportBusyId, setDraftExportBusyId] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  function refreshDrafts() {
    setDraftsLoading(true);
    listDrafts()
      .then(setDrafts)
      .catch(() => setDrafts([]))
      .finally(() => setDraftsLoading(false));
  }

  // Muat daftar draft begitu tab-nya dibuka (bukan langsung pas app mount,
  // biar gak nunggu IndexedDB kalau usernya emang mau pilih Template aja).
  useEffect(() => {
    if (activeTab !== "draft") return;
    refreshDrafts();
  }, [activeTab]);

  function handleResumeDraft(draft: DraftSummary) {
    const template = TEMPLATES.find((t) => t.id === draft.templateId);
    if (!template || disabledTemplateIds.has(template.id)) {
      // Template sumber draft ini udah gak ada lagi di daftar (mis. sudah
      // dihapus dari katalog) ATAU lagi dinonaktifin admin — daripada
      // nyangkut, draft-nya dianggap tidak bisa dilanjutkan.
      window.alert(
        !template
          ? "Template untuk draft ini sudah tidak tersedia lagi. Draft akan dihapus."
          : "Template untuk draft ini lagi dinonaktifkan sementara. Draft akan dihapus.",
      );
      void deleteDraft(draft.id).then(refreshDrafts);
      return;
    }
    onSelect(template, draft.id);
  }

  async function handleDeleteDraft(draft: DraftSummary) {
    if (draftBusyId) return;
    if (!window.confirm(`Hapus draft "${draft.templateName}"? Tidak bisa dibatalkan.`)) {
      return;
    }
    setDraftBusyId(draft.id);
    try {
      await deleteDraft(draft.id);
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    } finally {
      setDraftBusyId(null);
    }
  }

  // Export 1 draft (semua isinya: opacity, warna teks, animasi lirik, gaya
  // progress, foto/video/audio yang dipakai, dst) jadi 1 file ".spnedit"
  // yang bisa disimpan/dibagikan lalu di-import lagi (lihat
  // lib/templateExport.ts).
  async function handleExportDraft(draft: DraftSummary) {
    if (draftExportBusyId) return;
    setDraftExportBusyId(draft.id);
    try {
      await exportDraftToFile(draft.id);
    } catch (e) {
      window.alert(
        e instanceof Error
          ? `Gagal export template: ${e.message}`
          : "Gagal export template.",
      );
    } finally {
      setDraftExportBusyId(null);
    }
  }

  function handleImportButtonClick() {
    if (importBusy) return;
    importInputRef.current?.click();
  }

  async function handleImportFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset value-nya duluan biar kalau user pilih file YANG SAMA lagi
    // lain waktu, event onChange tetap kepicu (browser nggak nge-fire
    // change kalau value input-nya nggak berubah).
    e.target.value = "";
    if (!file) return;

    setImportBusy(true);
    try {
      const data = await readTemplateExportFile(file);
      const template = TEMPLATES.find((t) => t.id === data.templateId);
      if (!template) {
        window.alert(
          `Template sumber file ini ("${data.templateName}") sudah tidak tersedia di aplikasi, jadi tidak bisa di-import.`,
        );
        return;
      }
      await importTemplateExportFile(data);
      window.alert(`Template "${data.templateName}" berhasil di-import sebagai draft baru.`);
      if (activeTab === "draft") {
        refreshDrafts();
      } else {
        setActiveTab("draft");
      }
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Gagal import file template.",
      );
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div
      className="relative flex h-[100dvh] w-screen flex-col overflow-hidden"
      style={{
        fontFamily: tokens.fonts.body,
        backgroundColor: tokens.colors.pageBackground,
      }}
    >
      {/* Header — flat, satu warna sama hero homepage (periwinkle), garis
          tipis hitam di bawah, tanpa blur/glow */}
      <div className="relative flex shrink-0 flex-col gap-3 border-b border-black px-4 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-black">
              {activeTab === "draft" ? "(DRAFT PROJECT)" : "(KOLEKSI TEMPLATE)"}
            </p>
            <h1
              className="mt-2 text-[34px] font-bold leading-[1.02] text-black"
              style={{ fontFamily: tokens.fonts.heading, letterSpacing: "-1px" }}
            >
              {activeTab === "draft" ? (
                <>
                  LANJUTIN
                  <br />
                  <span
                    className="inline-block px-2 text-black"
                    style={{ backgroundColor: tokens.colors.accent }}
                  >
                    KARYAMU.
                  </span>
                </>
              ) : (
                <>
                  PILIH
                  <br />
                  <span
                    className="inline-block bg-black px-2"
                    style={{ color: tokens.colors.accent }}
                  >
                    TEMPLATE.
                  </span>
                </>
              )}
            </h1>
            <p className="mt-2.5 text-xs text-black/70">
              {activeTab === "draft"
                ? "Auto-tersimpan, tinggal lanjutin kapan aja."
                : "Tinggal isi foto & audio, sisanya udah beres."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start">
            {activeTab === "draft" && (
              <button
                onClick={handleImportButtonClick}
                disabled={importBusy}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black text-black transition hover:bg-black hover:text-white active:scale-90 disabled:opacity-60"
                title="Import file template (.spnedit)"
                aria-label="Import template"
              >
                {importBusy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
              </button>
            )}
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black text-black transition hover:bg-black hover:text-white active:scale-90"
              title="Cari template"
            >
              <Search size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* Input file tersembunyi buat import ".spnedit" — dipicu tombol
          Upload di header (dan link di empty-state draft di bawah). */}
      <input
        ref={importInputRef}
        type="file"
        accept=".spnedit,application/json"
        className="hidden"
        onChange={handleImportFileSelected}
      />

      {activeTab === "template" ? (
        /* Grid template — dua berbanjar (2 kolom). Cuma template yang
           masih AKTIF (bukan config/templates/{id}/enabled === false)
           yang dirender di sini. */
        <div className="relative grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-4 pb-2">
          {visibleTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        /* Daftar Draft Project — maksimal MAX_DRAFTS item, auto-save dari
           Editor (lihat lib/drafts.ts), diurutkan terbaru diubah duluan. */
        <div className="relative flex-1 overflow-y-auto p-4 pb-2">
          {draftsLoading ? (
            <div className="flex h-full items-center justify-center text-black">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-black bg-white">
                <FilePlus2 size={20} className="text-black" />
              </div>
              <p
                className="text-sm font-semibold text-black"
                style={{ fontFamily: tokens.fonts.heading }}
              >
                Belum ada draft
              </p>
              <p className="text-xs leading-relaxed text-black/70">
                Mulai project dari tab Template — perubahannya bakal
                ke-auto-save di sini, sampai maksimal {MAX_DRAFTS} project
                sekaligus.
              </p>
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("template")}
                  className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-white hover:text-black active:scale-[0.98]"
                >
                  Pilih Template
                </button>
                <button
                  onClick={handleImportButtonClick}
                  disabled={importBusy}
                  className="flex items-center gap-1.5 rounded-full border border-black px-4 py-2 text-xs font-semibold text-black transition hover:bg-black hover:text-white active:scale-[0.98] disabled:opacity-60"
                >
                  {importBusy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Upload size={13} />
                  )}
                  Import File
                </button>
              </div>
            </div>
          ) : (
            <div className="grid auto-rows-min grid-cols-2 gap-3">
              {drafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onResume={handleResumeDraft}
                  onDelete={handleDeleteDraft}
                  onExport={handleExportDraft}
                  busy={draftBusyId === draft.id}
                  exporting={draftExportBusyId === draft.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab bar bawah — Draft (kiri) & Template (kanan), nempel di bawah
          layar, satu warna sama header (periwinkle), garis tipis hitam,
          tanpa blur. Tab aktif pakai aksen pink homepage. */}
      <div
        className="relative z-30 flex shrink-0 items-center gap-2 border-t border-black p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        style={{ backgroundColor: tokens.colors.pageBackground }}
      >
        <button
          onClick={() => setActiveTab("draft")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2.5 text-xs font-semibold tracking-wide transition active:scale-[0.97] ${
            activeTab === "draft" ? "border-black text-black" : "border-black text-black hover:bg-black hover:text-white"
          }`}
          style={activeTab === "draft" ? { backgroundColor: tokens.colors.accent } : undefined}
        >
          <FolderClock size={15} />
          Draft Project
        </button>
        <button
          onClick={() => setActiveTab("template")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2.5 text-xs font-semibold tracking-wide transition active:scale-[0.97] ${
            activeTab === "template" ? "border-black text-black" : "border-black text-black hover:bg-black hover:text-white"
          }`}
          style={activeTab === "template" ? { backgroundColor: tokens.colors.accent } : undefined}
        >
          <LayoutGrid size={15} />
          Template
        </button>
      </div>

      {/* Modal alert "Template belum bisa dipakai" udah dibuang — sekarang
          template yang lagi off langsung di-hide total dari grid di atas,
          jadi user gak akan pernah bisa nge-tap template yang nonaktif. */}
    </div>
  );
}
