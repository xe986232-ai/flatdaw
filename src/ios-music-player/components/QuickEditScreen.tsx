import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  Check,
  ChevronLeft,
  Crop,
  Download,
  Film,
  AudioWaveform,
  Image as ImageIcon,
  Layers,
  Loader2,
  Music2,
  Pause,
  Play,
  RectangleHorizontal,
  RectangleVertical,
  Repeat,
  SlidersHorizontal,
  Type,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { Template, TemplateSlot } from "../types";
import type { SlotMediaState, TextValueState } from "../lib/render";

// Layar edit RINGKAS ala mode template CapCut: muncul begitu user pencet
// "Gunakan template", tanpa timeline. Preview + tombol putar, deretan klip
// media, tab Media/Audio di bawah, dan begitu satu klip diketuk muncul
// menu aksi (Ganti, Pangkas, Latar, Teks).
//
// Dirender SEBAGAI LAPISAN di atas <Editor> yang tetap hidup di bawahnya —
// jadi semua mesin (render canvas, audio, ekspor, crop, file picker) dipakai
// ulang, bukan ditulis ulang. Preview di sini cuma "cermin" canvas Editor.

type Tab = "media" | "audio";
type Sheet = "bg" | "text" | "advanced" | null;
type ProgressStyle = "bar" | "waveform";
type CanvasRatio = "9:16" | "16:9" | "4:5";

type Props = {
  template: Template;
  /** Canvas render milik Editor — di-mirror ke preview di layar ini. */
  sourceCanvasRef: RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentSec: number;
  duration: number;
  onSeek: (sec: number) => void;
  slotMedia: SlotMediaState;
  /** Nama file audio yang lagi dipakai (null = belum ada audio). */
  audioName: string | null;
  textValues: TextValueState;
  onTextChange: (layerId: string, value: string) => void;
  /** Ada foto yang dipakai sebagai background (opacity/blur berlaku). */
  hasBackgroundPhoto: boolean;
  backgroundOpacity: number;
  backgroundBlur: number;
  maxBackgroundBlur: number;
  onBackgroundOpacity: (v: number) => void;
  onBackgroundBlur: (v: number) => void;
  isExporting: boolean;
  onBack: () => void;
  onExportVideo: () => void;
  onExportImage: () => void;
  onReplace: (slot: TemplateSlot) => void;
  onCrop: (slot: TemplateSlot) => void;
  /** Template punya progress bar lagu (opsi jenis waveform berlaku). */
  hasProgressLayer: boolean;
  progressStyle: ProgressStyle;
  onProgressStyle: (v: ProgressStyle) => void;
  canvasRatio: CanvasRatio;
  onCanvasRatio: (v: CanvasRatio) => void;
  /** Buka Editor penuh (timeline, lirik, preset, dll) — cuma lewat link
   *  kecil di dalam sheet Lanjutan, bukan tombol Lanjutan itu sendiri. */
  onOpenFullEditor: () => void;
};

function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Cermin canvas Editor: digambar ulang tiap frame ke canvas kecil yang
 *  ukurannya pas ruang yang tersedia (rasio ikut canvas sumber). */
function PreviewMirror({ sourceRef }: { sourceRef: RefObject<HTMLCanvasElement | null> }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const lastAspect = useRef(9 / 16);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [aspect, setAspect] = useState(9 / 16);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  let cssW = box.w;
  let cssH = box.w / aspect;
  if (cssH > box.h) {
    cssH = box.h;
    cssW = box.h * aspect;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pxW = Math.max(1, Math.round(cssW * dpr));
  const pxH = Math.max(1, Math.round(cssH * dpr));

  useEffect(() => {
    const dst = cvRef.current;
    if (!dst) return;
    dst.width = pxW;
    dst.height = pxH;
  }, [pxW, pxH]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const src = sourceRef.current;
      const dst = cvRef.current;
      if (src && dst && src.width > 0 && src.height > 0) {
        const a = src.width / src.height;
        if (Math.abs(lastAspect.current - a) > 0.001) {
          lastAspect.current = a;
          setAspect(a);
        }
        dst.getContext("2d")?.drawImage(src, 0, 0, dst.width, dst.height);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sourceRef]);

  return (
    <div ref={boxRef} className="flex h-full w-full items-center justify-center">
      <canvas
        ref={cvRef}
        aria-label="Preview"
        className="rounded-xl bg-white/5"
        style={{ width: cssW, height: cssH }}
      />
    </div>
  );
}

function SeekBar({
  progress,
  onSeek,
}: {
  progress: number;
  onSeek: (ratio: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seekFrom = (e: ReactPointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    onSeek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };
  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Posisi putar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className="relative h-4 w-full cursor-pointer touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        seekFrom(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons) seekFrom(e);
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/20" />
      <div
        className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 bg-editor-accent"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  active,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-ripple
      className={`flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] transition active:scale-90 disabled:opacity-35 ${
        active ? "text-editor-accent" : "text-white"
      }`}
    >
      <Icon size={19} strokeWidth={1.8} />
      {label}
    </button>
  );
}

export default function QuickEditScreen(p: Props) {
  const [tab, setTab] = useState<Tab>("media");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const mediaSlots = p.template.slots.filter((s) => s.type !== "audio");
  const audioSlot = p.template.slots.find((s) => s.type === "audio");
  const selectedSlot = p.template.slots.find((s) => s.id === selectedId) ?? null;
  const textLayers = p.template.textLayers ?? [];
  const canExport = !!(p.template.baseAssetSrc || p.template.solidBackground);
  const progress = p.duration > 0 ? Math.min(1, p.currentSec / p.duration) : 0;

  function goTab(next: Tab) {
    setTab(next);
    setSelectedId(null);
    setSheet(null);
  }

  function clearSelection() {
    setSelectedId(null);
    setSheet(null);
  }

  return (
    <div className="fx-fade fixed inset-0 z-[45] flex flex-col bg-black text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 px-3 pb-1 pt-[max(8px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={p.onBack}
          data-ripple
          aria-label="Kembali ke daftar template"
          className="flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-90"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          type="button"
          onClick={() => goTab("audio")}
          className="flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-3 text-[13px] font-medium transition active:scale-[0.98]"
          style={{ maxWidth: 220 }}
        >
          <Music2 size={16} className="shrink-0" />
          <span className="h-3 w-px shrink-0 bg-white/30" />
          <span className="truncate">{p.audioName ?? "Tambah musik"}</span>
        </button>

        <div className="relative">
          {canExport ? (
            <>
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                disabled={p.isExporting}
                data-ripple
                className="flex h-9 items-center gap-1.5 rounded-xl bg-editor-accent px-3 text-[13px] font-semibold text-black transition active:scale-90 disabled:opacity-60"
              >
                {p.isExporting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Download size={15} strokeWidth={2.4} />
                )}
                Ekspor
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                  <div className="fx-dd-in absolute right-0 top-[calc(100%+6px)] z-20 w-48 overflow-hidden rounded-xl bg-[#1c1c1e]">
                    <button
                      type="button"
                      onClick={() => {
                        setExportOpen(false);
                        p.onExportVideo();
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] font-medium transition active:bg-white/10"
                    >
                      <Video size={16} className="text-editor-accent" />
                      <span className="flex flex-col">
                        Video
                        <span className="text-[10px] font-normal text-white/50">Render penuh + audio</span>
                      </span>
                    </button>
                    <div className="h-px bg-white/10" />
                    <button
                      type="button"
                      onClick={() => {
                        setExportOpen(false);
                        p.onExportImage();
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] font-medium transition active:bg-white/10"
                    >
                      <ImageIcon size={16} className="text-editor-accent" />
                      <span className="flex flex-col">
                        Gambar
                        <span className="text-[10px] font-normal text-white/50">Frame di preview</span>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <span className="block h-9 w-9" />
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 px-4 py-1">
        <PreviewMirror sourceRef={p.sourceCanvasRef} />
      </div>

      <div className="shrink-0">
        <SeekBar progress={progress} onSeek={(r) => p.onSeek(r * p.duration)} />
        <div className="relative flex items-center px-4 pb-0.5 pt-0 text-[12px] tabular-nums">
          <span>{fmtClock(p.currentSec)}</span>
          <span className="mx-1.5 h-3 w-px bg-white/30" />
          <span className="text-white/45">{fmtClock(p.duration)}</span>
          <button
            type="button"
            onClick={p.onTogglePlay}
            aria-label={p.isPlaying ? "Jeda" : "Putar"}
            className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition active:scale-90"
          >
            {p.isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" />
            )}
          </button>
        </div>
      </div>

      <div className="flex h-[76px] shrink-0 items-center overflow-x-auto px-4 [scrollbar-width:none]">
        {tab === "media" ? (
          <div className="flex gap-2.5">
            {mediaSlots.map((slot, i) => {
              const media = p.slotMedia[slot.id];
              const selected = selectedId === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(slot.id);
                    setSheet(null);
                  }}
                  aria-label={`${slot.label}${selected ? " (dipilih)" : ""}`}
                  className={`relative h-[56px] w-[46px] shrink-0 overflow-hidden rounded-lg border-2 bg-white/10 transition active:scale-95 ${
                    selected ? "border-white" : "border-transparent"
                  }`}
                >
                  {media ? (
                    slot.type === "video" ? (
                      <video
                        src={media.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img src={media.url} alt="" className="h-full w-full object-cover" />
                    )
                  ) : (
                    <ImageIcon size={16} className="mx-auto text-white/40" />
                  )}
                  <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[9px] font-semibold">
                    {i + 1}
                  </span>
                  <span className="absolute bottom-0.5 left-1 text-[9px] font-medium drop-shadow">
                    {p.duration.toFixed(1)}s
                  </span>
                </button>
              );
            })}
          </div>
        ) : audioSlot ? (
          <button
            type="button"
            onClick={() => {
              setSelectedId(audioSlot.id);
              setSheet(null);
            }}
            className={`flex h-[52px] w-full items-center gap-2.5 rounded-xl border-2 bg-white/10 px-4 text-left transition active:scale-[0.99] ${
              selectedId === audioSlot.id ? "border-white" : "border-transparent"
            }`}
          >
            <Music2 size={18} className="shrink-0 text-editor-accent" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-medium">
                {p.audioName ?? "Belum ada musik"}
              </span>
              <span className="text-[11px] text-white/50">{fmtClock(p.duration)}</span>
            </span>
          </button>
        ) : (
          <p className="w-full text-center text-sm text-white/50">
            Template ini tidak punya slot audio.
          </p>
        )}
      </div>

      <div className="relative shrink-0 bg-[#111] px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1">
        {sheet && (
          <div className="fx-rise-sm absolute inset-x-0 bottom-full z-10 max-h-[40dvh] overflow-y-auto rounded-t-2xl bg-[#1c1c1e] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[14px] font-semibold">
                {sheet === "bg" ? "Latar" : sheet === "text" ? "Teks" : "Lanjutan"}
              </span>
              <button
                type="button"
                onClick={() => setSheet(null)}
                aria-label="Selesai"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-editor-accent text-black transition active:scale-90"
              >
                <Check size={16} strokeWidth={2.6} />
              </button>
            </div>

            {sheet === "bg" && (
              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-3 text-[14px]">
                  <span className="w-16 shrink-0">Opacity</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={p.backgroundOpacity}
                    onChange={(e) => p.onBackgroundOpacity(Number(e.target.value))}
                    className="min-w-0 flex-1 accent-editor-accent"
                  />
                  <span className="w-10 text-right tabular-nums text-white/60">
                    {Math.round(p.backgroundOpacity)}
                  </span>
                </label>
                <label className="flex items-center gap-3 text-[14px]">
                  <span className="w-16 shrink-0">Blur</span>
                  <input
                    type="range"
                    min={0}
                    max={p.maxBackgroundBlur}
                    step={1}
                    value={p.backgroundBlur}
                    onChange={(e) => p.onBackgroundBlur(Number(e.target.value))}
                    className="min-w-0 flex-1 accent-editor-accent"
                  />
                  <span className="w-10 text-right tabular-nums text-white/60">
                    {Math.round(p.backgroundBlur)}
                  </span>
                </label>
              </div>
            )}

            {sheet === "advanced" && (
              <div className="flex flex-col gap-4">
                {p.hasProgressLayer && (
                  <div className="flex flex-col gap-2">
                    <span className="flex items-center gap-1.5 text-[12px] text-white/60">
                      <AudioWaveform size={14} /> Jenis waveform
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: "bar", label: "Standar" },
                          { id: "waveform", label: "Waveform berjalan" },
                        ] as const
                      ).map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => p.onProgressStyle(id)}
                          aria-pressed={p.progressStyle === id}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2 transition active:scale-95 ${
                            p.progressStyle === id
                              ? "border-white bg-white/10"
                              : "border-white/10 bg-white/5"
                          }`}
                        >
                          {id === "bar" ? (
                            <div className="flex h-5 w-full items-center rounded-full bg-black/50 px-1">
                              <div className="h-1 w-1/2 rounded-full bg-white" />
                            </div>
                          ) : (
                            <div className="flex h-5 w-full items-end justify-center gap-[2px] rounded-full bg-black/50 px-1.5 py-1">
                              {[4, 8, 6, 11, 7, 10, 5, 4, 7, 4, 6, 3].map((h, i) => (
                                <div
                                  key={i}
                                  className="w-[2px] rounded-full bg-white"
                                  style={{ height: h, opacity: i < 6 ? 1 : 0.32 }}
                                />
                              ))}
                            </div>
                          )}
                          <span className="text-[11px] font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-1.5 text-[12px] text-white/60">
                    <RectangleVertical size={14} /> Rasio canvas
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "9:16", icon: RectangleVertical },
                        { id: "4:5", icon: RectangleVertical },
                        { id: "16:9", icon: RectangleHorizontal },
                      ] as const
                    ).map(({ id, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => p.onCanvasRatio(id)}
                        aria-pressed={p.canvasRatio === id}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[12px] font-medium transition active:scale-95 ${
                          p.canvasRatio === id
                            ? "border-white bg-white/10"
                            : "border-white/10 bg-white/5 text-white/70"
                        }`}
                      >
                        <Icon size={15} />
                        {id}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={p.onOpenFullEditor}
                  className="self-center text-[11px] text-white/40 underline underline-offset-2 transition active:text-white/70"
                >
                  Buka editor lengkap (timeline, lirik, preset)
                </button>
              </div>
            )}

            {sheet === "text" && (
              <div className="flex flex-col gap-3">
                {textLayers.map((layer) => (
                  <label key={layer.id} className="flex flex-col gap-1.5 text-[13px] text-white/60">
                    {layer.label}
                    <input
                      type="text"
                      value={p.textValues[layer.id] ?? layer.defaultText}
                      maxLength={layer.maxLength}
                      onChange={(e) => p.onTextChange(layer.id, e.target.value)}
                      className="rounded-xl bg-white/10 px-3 py-2.5 text-[16px] text-white outline-none focus-visible:ring-2 focus-visible:ring-editor-accent"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedSlot ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Kembali ke tab"
              className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
              <ActionButton icon={Repeat} label="Ganti" onClick={() => p.onReplace(selectedSlot)} />
              {selectedSlot.type === "image" && (
                <ActionButton
                  icon={Crop}
                  label="Pangkas"
                  disabled={!p.slotMedia[selectedSlot.id]}
                  onClick={() => p.onCrop(selectedSlot)}
                />
              )}
              {selectedSlot.type === "image" && p.hasBackgroundPhoto && (
                <ActionButton
                  icon={Layers}
                  label="Latar"
                  active={sheet === "bg"}
                  onClick={() => setSheet(sheet === "bg" ? null : "bg")}
                />
              )}
              {selectedSlot.type !== "audio" && textLayers.length > 0 && (
                <ActionButton
                  icon={Type}
                  label="Teks"
                  active={sheet === "text"}
                  onClick={() => setSheet(sheet === "text" ? null : "text")}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3">
            {(
              [
                { id: "media", label: "Media", icon: Film },
                { id: "audio", label: "Audio", icon: Music2 },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => goTab(id)}
                aria-pressed={tab === id}
                className="flex flex-col items-center gap-0.5 py-1 text-[10.5px] transition active:scale-90"
              >
                <Icon size={20} strokeWidth={tab === id ? 2.2 : 1.6} className={tab === id ? "" : "text-white/60"} />
                <span className={tab === id ? "text-white" : "text-white/60"}>{label}</span>
                <span
                  className={`h-[2px] w-5 rounded-full ${tab === id ? "bg-editor-accent" : "bg-transparent"}`}
                />
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                clearSelection();
                setSheet(sheet === "advanced" ? null : "advanced");
              }}
              aria-pressed={sheet === "advanced"}
              className={`flex flex-col items-center gap-0.5 py-1 text-[10.5px] transition active:scale-90 ${
                sheet === "advanced" ? "text-white" : "text-white/60"
              }`}
            >
              <SlidersHorizontal size={20} strokeWidth={sheet === "advanced" ? 2.2 : 1.6} />
              Lanjutan
              <span
                className={`h-[2px] w-5 rounded-full ${sheet === "advanced" ? "bg-editor-accent" : "bg-transparent"}`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
