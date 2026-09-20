import { useCallback, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Check, X, ZoomIn, ZoomOut } from "lucide-react";
import { fxDelay } from "../../motion/hooks";

interface ImageCropModalProps {
  /** Object URL dari file mentah yang baru dipilih user (belum di-crop). */
  imageUrl: string;
  /** Ukuran target area slot di canvas template (dalam px skala canvas
   *  asli, misal 1080x1920) — dipakai buat nentuin rasio frame crop DAN
   *  resolusi output, biar hasil crop pas nempel di slot itu. */
  targetWidth: number;
  targetHeight: number;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  /** true = animasi tutup lagi jalan (overlay memudar, gak bisa disentuh). */
  closing?: boolean;
}

// Lantai resolusi output, biar hasil crop nggak pecah kalau slotnya kecil.
const MIN_OUTPUT_DIM = 480;

function loadImage(src: string, cors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.src = src;
  });
}

function isCrossOriginUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return false; // blob:, data:, path lokal
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return false;
  }
}

/** Muat gambar buat di-crop. Foto sample remote (Firebase/Unsplash/Picsum)
 *  sebelumnya dimuat ulang pakai <img crossOrigin="anonymous"> — dan itu
 *  sering gagal walau host-nya sebenarnya ngasih CORS, karena browser
 *  make ulang respons foto yang SUDAH ke-cache dari tampilan biasa
 *  (tanpa header CORS). Sekarang: ambil lewat fetch CORS + cache: "no-store"
 *  jadi Blob lokal (same-origin, gak bikin canvas "tainted"), baru
 *  dipakai. Kalau fetch gagal, fallback ke <img crossOrigin> dengan
 *  cache-buster. `release` wajib dipanggil setelah selesai (revoke blob). */
async function createImage(
  url: string,
): Promise<{ img: HTMLImageElement; release: () => void }> {
  if (!isCrossOriginUrl(url)) {
    return { img: await loadImage(url, false), release: () => {} };
  }
  try {
    const res = await fetch(url, { mode: "cors", cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blobUrl = URL.createObjectURL(await res.blob());
    try {
      const img = await loadImage(blobUrl, false);
      return { img, release: () => URL.revokeObjectURL(blobUrl) };
    } catch (e) {
      URL.revokeObjectURL(blobUrl);
      throw e;
    }
  } catch {
    const busted = `${url}${url.includes("?") ? "&" : "?"}_cors=${Date.now()}`;
    return { img: await loadImage(busted, true), release: () => {} };
  }
}

/** Crop pixelCrop (dari react-easy-crop) jadi Blob JPEG, resolusi output
 *  disamain sama ukuran slot di canvas template (dengan lantai minimum). */
async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  targetWidth: number,
  targetHeight: number,
): Promise<Blob | null> {
  const { img: image, release } = await createImage(imageSrc);
  try {
    const outScale = Math.max(1, MIN_OUTPUT_DIM / Math.min(targetWidth, targetHeight));
    const outW = Math.max(1, Math.round(targetWidth * outScale));
    const outH = Math.max(1, Math.round(targetHeight * outScale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outW,
      outH,
    );

    return await new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92),
    );
  } finally {
    release();
  }
}

/** Overlay full-screen buat crop foto sampul sebelum dipakai — muncul
 *  begitu user pilih file baru buat slot bertipe "image". Pake
 *  react-easy-crop (drag & pinch-zoom udah teruji lintas browser/HP,
 *  gak perlu reinvent pointer-handling manual) — area crop rasionya
 *  disamain ke ukuran slot di template biar hasilnya pas ditempel balik
 *  ke canvas (drawImageCover di lib/render.ts). */
export default function ImageCropModal({
  imageUrl,
  targetWidth,
  targetHeight,
  onConfirm,
  onCancel,
  closing = false,
}: ImageCropModalProps) {
  const aspect = targetWidth > 0 && targetHeight > 0 ? targetWidth / targetHeight : 1;

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixelCrop, setPixelCrop] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // BUGFIX (tombol centang "kadang" nggak nyimpen): sebelumnya kalau
  // createImage()/getCroppedBlob() gagal (paling sering gara-gara foto
  // sample remote yang host-nya nolak CORS anonymous — lihat createImage
  // di bawah), errornya nggak ketangkep sama sekali. isProcessing balik
  // false lewat finally, tapi onConfirm TIDAK PERNAH dipanggil — dari sisi
  // user kelihatannya kayak tombol centang "gak ngefek", padahal diem-diam
  // gagal di background tanpa kasih tau apa-apa. Sekarang errornya
  // ditangkep & ditampilin biar user tau apa yang terjadi & bisa coba
  // solusi lain (mis. upload foto sendiri dari galeri).
  const [cropError, setCropError] = useState<string | null>(null);

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setPixelCrop(croppedAreaPixels);
  }, []);

  async function handleConfirm() {
    if (!pixelCrop || isProcessing) return;
    setIsProcessing(true);
    setCropError(null);
    try {
      const blob = await getCroppedBlob(imageUrl, pixelCrop, targetWidth, targetHeight);
      if (blob) {
        onConfirm(blob);
      } else {
        setCropError(
          "Gagal memproses foto ini. Coba upload foto lain dari galeri kamu.",
        );
      }
    } catch {
      // Paling sering kejadian di sini: foto sample remote yang host-nya
      // nolak dimuat lewat crossOrigin="anonymous" (perlu buat canvas
      // nggak "tainted"), jadi createImage() reject. Kasih pesan yang
      // actionable, bukan diem aja.
      setCropError(
        "Foto sample ini gagal diproses (server fotonya nolak diakses). Coba upload foto lain dari galeri kamu.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col bg-black/95 ${
        closing ? "fx-backdrop-out pointer-events-none" : "fx-backdrop-in"
      }`}
    >
      <div className="fx-drop flex shrink-0 items-center justify-between px-4 py-3" style={fxDelay(80)}>
        <button
          onClick={onCancel}
          data-ripple
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-paper transition active:scale-90"
          title="Batal"
        >
          <X size={18} />
        </button>
        <span className="text-sm font-medium text-paper">Atur foto sampul</span>
        <button
          onClick={handleConfirm}
          disabled={!pixelCrop || isProcessing}
          data-ripple
          className="flex h-9 w-9 items-center justify-center rounded-full bg-editor-accent text-paper transition active:scale-90 disabled:opacity-40"
          title="Pakai crop ini"
        >
          <Check size={18} />
        </button>
      </div>

      {/* Area cropper — relative + flex-1 biar ngisi sisa layar, react-easy-crop
          butuh parent dengan tinggi pasti (position relative, overflow hidden
          sudah di-handle library-nya sendiri lewat container internalnya). */}
      <div className="fx-scale-in relative flex-1" style={fxDelay(120)}>
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          objectFit="contain"
          restrictPosition={true}
        />
      </div>

      <div className="fx-rise flex shrink-0 flex-col gap-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4" style={fxDelay(200)}>
        <div className="mx-auto flex w-full max-w-xs items-center gap-3">
          <ZoomOut size={16} className="shrink-0 text-mute" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-editor-accent"
          />
          <ZoomIn size={16} className="shrink-0 text-mute" />
        </div>
        <p className="text-center text-[11px] text-mute">
          Geser foto buat atur posisi, slider buat zoom. Bingkai udah
          disamain sama area foto sampul di template.
        </p>
        {cropError && (
          <p className="text-center text-[11px] font-medium text-red-400">
            {cropError}
          </p>
        )}
      </div>
    </div>
  );
}
