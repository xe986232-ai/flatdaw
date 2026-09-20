// Dialog kustom (pengganti window.alert / window.confirm) yang dipanggil
// dari mana aja tanpa hook: `await confirmDialog({...})` -> boolean,
// `await alertDialog({...})` -> void. Tampilannya dirender oleh
// <DialogHost /> (components/DialogHost.tsx) yang dipasang sekali di root.
// Kalau ada beberapa dialog barengan, ditampilkan satu per satu (antrean).

export type DialogTone = "danger" | "warning" | "success" | "error" | "info";

export type DialogRequest = {
  id: number;
  kind: "confirm" | "alert";
  title: string;
  message: string;
  tone: DialogTone;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (value: boolean) => void;
};

type ConfirmOptions = {
  title: string;
  message: string;
  tone?: DialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
};

type AlertOptions = {
  title: string;
  message: string;
  tone?: DialogTone;
  okLabel?: string;
};

let nextId = 1;
let queue: DialogRequest[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeDialog(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Dialog yang lagi tampil (paling depan di antrean) — referensinya stabil
 *  selama dialog yang sama, jadi aman buat useSyncExternalStore. */
export function getCurrentDialog(): DialogRequest | null {
  return queue[0] ?? null;
}

export function resolveCurrentDialog(value: boolean) {
  const current = queue[0];
  if (!current) return;
  queue = queue.slice(1);
  current.resolve(value);
  emit();
}

function push(req: Omit<DialogRequest, "id" | "resolve">): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    queue = [...queue, { ...req, id: nextId++, resolve }];
    emit();
  });
}

export function confirmDialog(o: ConfirmOptions): Promise<boolean> {
  return push({
    kind: "confirm",
    title: o.title,
    message: o.message,
    tone: o.tone ?? "warning",
    confirmLabel: o.confirmLabel ?? "Ya",
    cancelLabel: o.cancelLabel ?? "Batal",
  });
}

export async function alertDialog(o: AlertOptions): Promise<void> {
  await push({
    kind: "alert",
    title: o.title,
    message: o.message,
    tone: o.tone ?? "info",
    confirmLabel: o.okLabel ?? "OK",
    cancelLabel: "",
  });
}
