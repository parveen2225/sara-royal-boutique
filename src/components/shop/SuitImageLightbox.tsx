"use client";

// Same-page image preview for the "Stitched / styling reference" photos. It replaces the old <a target="_blank"> thumbnails, which
// left the page. Rendered in a portal on <body>; closing returns to the exact same scroll position because the page is never
// moved: scrolling is locked with overflow:hidden (not position:fixed), and the page puts focus back on the thumbnail that opened it.
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import "./suitImageLightbox.scss";

type Props = {
  images: string[];
  /** index of the image to show, or null when closed */
  index: number | null;
  label: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

const SWIPE_PX = 50;

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points={dir === "left" ? "15 5 8 12 15 19" : "9 5 16 12 9 19"} />
  </svg>
);

export default function SuitImageLightbox({ images, index, label, onIndexChange, onClose }: Props) {
  const open = index !== null && images.length > 0;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const count = images.length;
  const current = index ?? 0;
  const src = open ? images[Math.min(current, count - 1)] : "";

  const go = useCallback((delta: number) => onIndexChange((current + delta + count) % count), [current, count, onIndexChange]);

  // lock background scroll while open; restore on close (no layout jump: the scrollbar width is compensated)
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const prevPad = document.body.style.paddingRight;
    const bar = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (bar > 0) document.body.style.paddingRight = `${bar}px`;
    return () => {
      html.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
    };
  }, [open]);

  // move focus into the dialog (the page returns it to the thumbnail on close)
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  // keyboard: Esc closes, arrows / Home / End navigate, Tab stays inside the dialog
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowLeft" && count > 1) { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight" && count > 1) { e.preventDefault(); go(1); }
      else if (e.key === "Home" && count > 1) { e.preventDefault(); onIndexChange(0); }
      else if (e.key === "End" && count > 1) { e.preventDefault(); onIndexChange(count - 1); }
      else if (e.key === "Tab") {
        const items = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
        if (!items || items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!dialogRef.current?.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, count, go, onClose, onIndexChange]);

  if (!open || typeof document === "undefined") return null; // only ever opens from a click, so this is client-side

  const onTouchStart = (e: TouchEvent) => { const t = e.touches[0]; touch.current = t && count > 1 ? { x: t.clientX, y: t.clientY } : null; };
  const onTouchEnd = (e: TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  return createPortal(
    <div
      ref={dialogRef}
      className="suit_lb"
      role="dialog"
      aria-modal="true"
      aria-label={`${label}, photo ${current + 1} of ${count}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button ref={closeRef} type="button" className="suit_lb_close" onClick={onClose} aria-label="Close preview">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      {count > 1 && <span className="suit_lb_count" aria-hidden="true">{current + 1} / {count}</span>}

      <div className="suit_lb_stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        {count > 1 && (
          <button type="button" className="suit_lb_nav suit_lb_prev" onClick={() => go(-1)} aria-label="Previous photo"><Chevron dir="left" /></button>
        )}
        <div className={`suit_lb_frame ${loadedSrc === src ? "is_loaded" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          {/* contain: the photo keeps its own aspect ratio inside the viewport, never stretched or cropped */}
          <Image key={src} src={src} alt={`${label} ${current + 1}`} fill sizes="100vw" quality={85} priority draggable={false} className="suit_lb_img" onLoad={() => setLoadedSrc(src)} />
        </div>
        {count > 1 && (
          <button type="button" className="suit_lb_nav suit_lb_next" onClick={() => go(1)} aria-label="Next photo"><Chevron dir="right" /></button>
        )}
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">Photo {current + 1} of {count}</span>
    </div>,
    document.body,
  );
}
