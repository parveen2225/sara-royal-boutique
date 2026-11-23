"use client";

// Remembers whether the desktop sidebar is collapsed (per browser). External store so the first render matches the
// server (expanded) and the saved choice applies right after hydration without a flash or an effect.
const KEY = "sr_admin_sidebar_collapsed";
const listeners = new Set<() => void>();
const read = () => { try { return window.localStorage.getItem(KEY) === "1"; } catch { return false; } };
export const sidebarStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) l(); };
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
  },
  getSnapshot: read,
  getServerSnapshot: () => false,
  toggle() { try { window.localStorage.setItem(KEY, read() ? "0" : "1"); } catch { /* storage blocked: stays expanded */ } listeners.forEach((l) => l()); },
};
