/** Cek cepat: apakah foto remote boleh DIBACA lewat CORS (perlu buat
 *  crop & export — canvas "tainted" kalau server fotonya nolak). Cuma
 *  nunggu header respons (isi foto gak didownload penuh). URL lokal /
 *  blob: / data: selalu dianggap aman. */
export async function isCorsReadable(url: string, timeoutMs = 8000): Promise<boolean> {
  if (!/^https?:\/\//i.test(url)) return true;
  try {
    if (new URL(url).origin === window.location.origin) return true;
  } catch {
    return false;
  }
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { mode: "cors", cache: "no-store", signal: ctrl.signal });
    ctrl.abort(); // header udah nyampe -> gak perlu download isinya
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}
