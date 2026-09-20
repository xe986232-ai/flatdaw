import { useEffect } from "react";

/** Tahan layar tetap menyala selama `active` true (mis. pas ekspor video),
 *  pakai Screen Wake Lock API (Chrome/Edge Android, Safari 16.4+).
 *  Browser otomatis melepas lock kalau tab disembunyikan, jadi di-request
 *  ulang begitu tab kelihatan lagi. Kalau browser gak mendukung: no-op. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void s.release();
          return;
        }
        sentinel = s;
        s.addEventListener("release", () => {
          if (sentinel === s) sentinel = null;
        });
      } catch {
        // ditolak (mis. baterai hemat / tab gak aktif) — abaikan, ekspor tetap jalan
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && !sentinel) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
      sentinel = null;
    };
  }, [active]);
}
