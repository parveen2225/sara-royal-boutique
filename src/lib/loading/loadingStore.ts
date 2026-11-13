type Listener = () => void;

let pendingCount = 0;
// The app is considered "not ready" until the initial page load (markup,
// assets, fonts) finishes, so the loader stays up for that whole stretch
// regardless of any individual API call.
let appReady = false;
const listeners = new Set<Listener>();

const emit = () => {
  for (const l of listeners) l();
};

export const loadingStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return pendingCount > 0 || !appReady;
  },
  // Always "loading" on the server and on first hydration, so the loader is
  // present in the very first HTML the browser paints — never after it.
  getServerSnapshot() {
    return true;
  },
  start() {
    pendingCount += 1;
    emit();
  },
  stop() {
    pendingCount = Math.max(0, pendingCount - 1);
    emit();
  },
  reset() {
    pendingCount = 0;
    emit();
  },
  markAppReady() {
    if (!appReady) {
      appReady = true;
      emit();
    }
  },
};

export const withLoading = async <T,>(promise: Promise<T>): Promise<T> => {
  loadingStore.start();
  try {
    return await promise;
  } finally {
    loadingStore.stop();
  }
};

