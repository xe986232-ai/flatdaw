import { useEffect, useRef, useSyncExternalStore, type ComponentType } from "react";
import { Check, Info, Trash2, TriangleAlert, X } from "lucide-react";
import {
  getCurrentDialog,
  resolveCurrentDialog,
  subscribeDialog,
  type DialogTone,
} from "../lib/dialog";
import { usePresenceValue } from "../../motion/hooks";

// Overlay dialog kustom — gayanya sama kayak overlay ekspor: latar gelap
// transparan, kartu dark-panel membulat, tombol pill, aksen pink / merah.
// Dipasang SEKALI di root (IosMusicPlayerApp), dipanggil lewat lib/dialog.ts.

const TONES: Record<
  DialogTone,
  { icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>; box: string; iconClass: string }
> = {
  danger: { icon: Trash2, box: "bg-rec/15", iconClass: "text-rec" },
  error: { icon: X, box: "bg-rec/15", iconClass: "text-rec" },
  warning: { icon: TriangleAlert, box: "bg-editor-accent/15", iconClass: "text-editor-accent" },
  info: { icon: Info, box: "bg-editor-accent/15", iconClass: "text-editor-accent" },
  success: { icon: Check, box: "bg-editor-accent", iconClass: "text-paper" },
};

export default function DialogHost() {
  const current = useSyncExternalStore(subscribeDialog, getCurrentDialog, getCurrentDialog);
  // Simpan dialog terakhir selama animasi keluar biar kartu gak langsung hilang.
  const p = usePresenceValue(current, 220);
  const dialog = p.item;
  const primaryRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const isConfirm = dialog?.kind === "confirm";
  const dismiss = () => resolveCurrentDialog(false); // Esc / klik latar
  const accept = () => resolveCurrentDialog(true);

  // Fokus: aksi berbahaya -> fokus di "Batal" (biar Enter gak gak sengaja
  // menghapus); selain itu fokus di tombol utama.
  useEffect(() => {
    if (!current) return;
    const target = current.kind === "confirm" && current.tone === "danger" ? cancelRef : primaryRef;
    target.current?.focus();
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (current.kind === "confirm") dismiss();
        else accept();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  if (!dialog) return null;
  const tone = TONES[dialog.tone];
  const Icon = tone.icon;
  const destructive = dialog.tone === "danger";

  return (
    <div
      role={isConfirm ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-labelledby="app-dialog-title"
      aria-describedby="app-dialog-desc"
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6 ${
        p.closing ? "fx-backdrop-out pointer-events-none" : "fx-backdrop-in"
      }`}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        if (isConfirm) dismiss();
      }}
    >
      <div className="fx-pop-in relative w-full max-w-xs overflow-hidden rounded-3xl border border-white/10 bg-dark-panel p-5 text-center">
        <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${tone.box}`}>
          <Icon size={20} strokeWidth={dialog.tone === "success" ? 2.6 : 2} className={tone.iconClass} />
        </div>
        <h2 id="app-dialog-title" className="text-sm font-semibold text-dark-text">
          {dialog.title}
        </h2>
        <p id="app-dialog-desc" className="mt-1.5 break-words text-xs leading-relaxed text-dark-muted">
          {dialog.message}
        </p>

        <div className={`mt-5 flex gap-2 ${isConfirm ? "" : "flex-col"}`}>
          {isConfirm && (
            <button
              ref={cancelRef}
              type="button"
              onClick={dismiss}
              className="flex-1 rounded-full border border-white/10 bg-dark-track px-4 py-2.5 text-xs font-medium text-dark-text transition hover:bg-white/10 active:scale-[0.98]"
            >
              {dialog.cancelLabel}
            </button>
          )}
          <button
            ref={primaryRef}
            type="button"
            onClick={accept}
            data-ripple
            className={`flex-1 rounded-full px-4 py-2.5 text-xs font-semibold transition hover:brightness-110 active:scale-[0.98] ${
              destructive ? "bg-rec text-dark-text" : "bg-editor-accent text-paper"
            }`}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
