"use client";

// Optional "Share" for a suit page. Runs only when the customer taps it; nothing is ever sent automatically.
//  1. Web Share with the real product photo attached (mobile browsers that support file sharing),
//  2. Web Share with the link only (WhatsApp then builds its own preview from the page's Open Graph tags),
//  3. no Web Share (most desktop browsers): copy the link, or open WhatsApp's share screen with the link.
import { useEffect, useRef, useState } from "react";
import { productImageUrl, suitPublicUrl } from "@/lib/siteUrl";

type Props = { id: string; name: string; sku: string; image: string };
type Status = { tone: "ok" | "warn"; text: string } | null;

const canShareFiles = () => typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof File !== "undefined";

export default function ShareProductButton({ id, name, sku, image }: Props) {
  const url = suitPublicUrl(id);
  const text = `${name} (${sku}) from Sara Royal Boutique`;
  const fileRef = useRef<File | null>(null);
  const [fallback, setFallback] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // Prepare the photo ahead of time, only where it can actually be shared: awaiting a download inside the tap
  // would use up the browser's user-activation window and the share sheet would be refused.
  useEffect(() => {
    const src = productImageUrl(image, { w: 1080, h: 1350 });
    if (!src || !canShareFiles()) return;
    const controller = new AbortController();
    fetch(src, { signal: controller.signal, mode: "cors", credentials: "omit" })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        if (!blob.type.startsWith("image/")) return;
        const file = new File([blob], `sara-royal-${sku.toLowerCase()}.jpg`, { type: blob.type });
        if (navigator.canShare({ files: [file] })) fileRef.current = file;
      })
      .catch(() => undefined); // link-only sharing still works
    return () => controller.abort();
  }, [image, sku]);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const share = async () => {
    setStatus(null);
    if (typeof navigator.share !== "function") { setFallback((v) => !v); return; }
    const file = fileRef.current;
    try {
      // Some apps drop `url` when files are attached, so the link is also written into the text.
      if (file) await navigator.share({ files: [file], title: name, text: `${text}\n${url}` });
      else await navigator.share({ title: name, text, url });
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return; // customer closed the share sheet
      try { await navigator.share({ title: name, text, url }); } catch (e2) { // retry without the photo
        if ((e2 as DOMException)?.name !== "AbortError") setFallback(true);
      }
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus({ tone: "ok", text: "Link copied." });
    } catch {
      setStatus({ tone: "warn", text: `Copy this link: ${url}` });
    }
  };

  return (
    <div className="shop_share">
      <button type="button" className="shop_share_btn" onClick={share} aria-expanded={fallback || undefined} aria-controls={fallback ? "shop-share-options" : undefined}>
        <ShareIcon /> Share this suit
      </button>
      {fallback && (
        <div id="shop-share-options" className="shop_share_options">
          <button type="button" className="shop_share_opt" onClick={copy}>Copy link</button>
          <a className="shop_share_opt" href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
        </div>
      )}
      <p className={`shop_share_status ${status ? `is_${status.tone}` : ""}`} role="status" aria-live="polite">{status?.text}</p>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}
