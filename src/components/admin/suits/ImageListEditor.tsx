"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadImages } from "@/lib/api/upload";
import { errorMessage, type SuitImage } from "@/lib/api/suitsApi";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Props = {
  label: string;
  hint?: string;
  images: SuitImage[];
  max: number;
  coverLabel?: string;
  onChange: (images: SuitImage[]) => void;
};

/** Ordered image list: upload (several at once), reorder, replace, remove. The first image is the cover. */
export default function ImageListEditor({ label, hint, images, max, coverLabel, onChange }: Props) {
  const addRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const check = (files: File[]) => {
    for (const f of files) {
      if (!TYPES.includes(f.type)) return "Only JPG, PNG, WEBP or GIF images are allowed.";
      if (f.size > MAX_BYTES) return `"${f.name}" is larger than 5 MB.`;
    }
    return "";
  };

  const upload = async (files: File[]) => {
    const problem = check(files);
    if (problem) {
      setError(problem);
      return null;
    }
    setBusy(true);
    setError("");
    try {
      const urls = await uploadImages(files);
      return urls.map((url) => ({ url, publicId: "" }));
    } catch (e) {
      setError(errorMessage(e, "Upload failed."));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const add = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (addRef.current) addRef.current.value = "";
    if (!files.length) return;
    if (images.length + files.length > max) {
      setError(`You can add at most ${max} images (${max - images.length} more).`);
      return;
    }
    const added = await upload(files);
    if (!added) return;
    // Never keep the same image twice (it would be rejected on save and breaks list identity).
    const known = new Set(images.map((i) => i.url));
    const fresh = added.filter((img) => !known.has(img.url) && known.add(img.url));
    if (fresh.length < added.length) setError("That image is already in this list.");
    if (fresh.length) onChange([...images, ...fresh]);
  };

  const replace = async (index: number, list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    const added = await upload([file]);
    if (!added?.[0]) return;
    if (images.some((img, i) => i !== index && img.url === added[0].url)) return setError("That image is already in this list.");
    onChange(images.map((img, i) => (i === index ? added[0] : img)));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
        <label className="form-label mb-0">
          {label} <small className="text-muted">({images.length}/{max})</small>
        </label>
        <label className={`admin_outline_btn admin_sm_btn ${busy || images.length >= max ? "disabled" : ""}`} style={{ cursor: "pointer", margin: 0 }}>
          {busy ? "Uploading…" : "+ Add images"}
          <input ref={addRef} type="file" accept={TYPES.join(",")} multiple hidden disabled={busy || images.length >= max} onChange={(e) => add(e.target.files)} />
        </label>
      </div>
      {hint && <p className="admin_section_hint mb-2">{hint}</p>}
      {error && <div className="admin_error_banner mb-2" role="alert">{error}</div>}
      {images.length === 0 ? (
        <p className="text-muted small mb-0">No images yet.</p>
      ) : (
        <div className="admin_img_grid">
          {images.map((img, i) => (
            <div className="admin_img_tile" key={img.url}>
              {i === 0 && coverLabel && <span className="admin_img_badge">{coverLabel}</span>}
              <Image src={img.url} alt={`${label} ${i + 1}`} width={300} height={300} unoptimized />
              <div className="admin_img_actions">
                <button type="button" onClick={() => move(i, i - 1)} disabled={busy || i === 0} aria-label="Move earlier">◀</button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={busy || i === images.length - 1} aria-label="Move later">▶</button>
                <label aria-disabled={busy}>
                  Replace
                  <input type="file" accept={TYPES.join(",")} hidden disabled={busy} onChange={(e) => { replace(i, e.target.files); e.target.value = ""; }} />
                </label>
                <button type="button" className="is_danger" disabled={busy} onClick={() => onChange(images.filter((_, j) => j !== i))}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
