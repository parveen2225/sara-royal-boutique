type Listener = () => void;

let pendingCount = 0;
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
    return pendingCount > 0;
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
};

export const withLoading = async <T,>(promise: Promise<T>): Promise<T> => {
  loadingStore.start();
  try {
    return await promise;
  } finally {
    loadingStore.stop();
  }
};

