"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { TryOnApiError, createTryOn, deleteTryOn, getTryOn, prepareImage, type TryOnConfig } from "@/lib/tryOnApi";
import "./tryOn.scss";

type Prepared = { blob: Blob; url: string; width: number; height: number };
type Phase = { kind: "form" } | { kind: "working"; id: string; token: string; startedAt: number } | { kind: "done"; id: string; token: string; resultUrl: string } | { kind: "error"; message: string; id?: string; token?: string };

type Props = {
  show: boolean;
  onClose: () => void;
  config: TryOnConfig;
  suit: { id: string; name: string; sku: string; cover: string; fabric?: string; color?: string };
  shopping: { onAddToCart: () => void; onBuyWhatsApp: () => void; addDisabled: boolean; waDisabled: boolean; note?: string };
};

const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024; // what we are willing to decode in the browser before downscaling
const POLL_MS = 1500;
const GIVE_UP_MS = 150_000;
const STEPS = ["Uploading your photo securely", "Reading the fabric", "Stitching your chosen style", "Adding the finishing touches"];

export function SparkleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12 2.5l1.7 5.1a3 3 0 0 0 1.9 1.9l5.1 1.7-5.1 1.7a3 3 0 0 0-1.9 1.9L12 19.9l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.3 11.2l5.1-1.7a3 3 0 0 0 1.9-1.9L12 2.5z" />
      <path d="M19 15.5l.7 2a1.2 1.2 0 0 0 .8.8l2 .7-2 .7a1.2 1.2 0 0 0-.8.8l-.7 2-.7-2a1.2 1.2 0 0 0-.8-.8l-2-.7 2-.7a1.2 1.2 0 0 0 .8-.8l.7-2z" opacity=".7" />
    </svg>
  );
}

function UploadBox({ id, label, hint, value, onPick, onRemove, busy }: { id: string; label: string; hint: string; value: Prepared | null; onPick: (f: File) => void; onRemove: () => void; busy?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="tryon_upload">
      {/* Gallery / file picker only: no `capture` attribute, so browsers never offer or open the camera directly. */}
      <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onPick(f); }} />
      {value ? (
        <div className="tryon_preview">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img src={value.url} alt={`${label} preview`} />
          <div className="tryon_preview_actions">
            <button type="button" className="tryon_chip_btn" onClick={() => input.current?.click()}>Replace</button>
            <button type="button" className="tryon_chip_btn is_danger" onClick={onRemove}>Remove</button>
          </div>
        </div>
      ) : (
        <label htmlFor={id} className={`tryon_drop ${busy ? "is_busy" : ""}`}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5.2-5.2a1.5 1.5 0 0 0-2.1 0L5 19.5" /></svg>
          <span className="tryon_drop_title">{busy ? "Preparing…" : label}</span>
          <span className="tryon_drop_hint">{hint}</span>
          <span className="tryon_drop_cta">Choose from your device</span>
        </label>
      )}
    </div>
  );
}

export default function TryOnPanel({ show, onClose, config, suit, shopping }: Props) {
  const uid = useId();
  const [person, setPerson] = useState<Prepared | null>(null);
  const [reference, setReference] = useState<Prepared | null>(null);
  const [style, setStyle] = useState(config.styles[0]?.key ?? "default");
  const [adult, setAdult] = useState(false);
  const [agree, setAgree] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [preparing, setPreparing] = useState<"" | "person" | "reference">("");
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [submitting, setSubmitting] = useState(false);
  const [tick, setTick] = useState(0);
  const selected = config.styles.find((s) => s.key === style);
  const live = config.mode === "live";

  // Revoke local preview URLs when replaced/removed.
  useEffect(() => () => { if (person) URL.revokeObjectURL(person.url); }, [person]);
  useEffect(() => () => { if (reference) URL.revokeObjectURL(reference.url); }, [reference]);

  // Poll the job while it runs.
  useEffect(() => {
    if (phase.kind !== "working") return;
    let stop = false;
    const t = setTimeout(() => {
      if (Date.now() - phase.startedAt > GIVE_UP_MS) {
        if (!stop) setPhase({ kind: "error", message: "Generating your preview took too long. Please try again.", id: phase.id, token: phase.token });
        return;
      }
      getTryOn(phase.id, phase.token)
        .then((j) => {
          if (stop) return;
          if (j.status === "succeeded" && j.resultUrl) setPhase({ kind: "done", id: phase.id, token: phase.token, resultUrl: j.resultUrl });
          else if (j.status === "failed" || j.status === "expired") setPhase({ kind: "error", message: j.error || "We could not create your preview. Please try again.", id: phase.id, token: phase.token });
          else setTick((n) => n + 1);
        })
        .catch((e) => { if (!stop) { if (e instanceof TryOnApiError && e.status === 404) setPhase({ kind: "error", message: "This preview is no longer available. Please try again." }); else setTick((n) => n + 1); } });
    }, POLL_MS);
    return () => { stop = true; clearTimeout(t); };
  }, [phase, tick]);

  const pick = async (kind: "person" | "reference", file: File) => {
    setFieldError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setFieldError("Please choose a JPG, PNG or WEBP image.");
    if (file.size > MAX_ORIGINAL_BYTES) return setFieldError("That image is too large. Please choose a photo under 25 MB.");
    setPreparing(kind);
    try {
      const img = await prepareImage(file);
      const minSide = kind === "person" ? config.minPersonSide : 256;
      if (Math.min(img.width, img.height) < minSide) { URL.revokeObjectURL(img.url); return setFieldError(`This photo is too small. Please use one at least ${minSide}px wide.`); }
      if (img.blob.size > config.maxImageBytes) { URL.revokeObjectURL(img.url); return setFieldError("This photo is still too large after resizing. Please choose another one."); }
      if (kind === "person") setPerson(img); else setReference(img);
    } catch (e) {
      setFieldError(e instanceof Error ? e.message : "This image could not be read.");
    } finally {
      setPreparing("");
    }
  };

  const generate = async () => {
    setFieldError("");
    if (!person) return setFieldError("Please upload your full-body photo first.");
    if (selected?.needsReference && !reference) return setFieldError("Please upload a reference photo of the stitched design you like.");
    if (!adult || !agree) return setFieldError("Please confirm you are 18 or older and agree to how your photo is used.");
    setSubmitting(true);
    try {
      const job = await createTryOn({ suitId: suit.id, style, person: person.blob, reference: selected?.needsReference ? reference?.blob ?? null : null, consentVersion: config.consentVersion });
      setTick(0);
      setPhase({ kind: "working", id: job.id, token: job.token, startedAt: Date.now() });
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "We could not start your preview." });
    } finally {
      setSubmitting(false);
    }
  };

  const discardJob = () => { if ("id" in phase && phase.id && phase.token) void deleteTryOn(phase.id, phase.token); };
  const tryAgain = () => { discardJob(); setPhase({ kind: "form" }); };
  // Closing deletes the server copies at once and forgets the local photos and consent too.
  const close = () => {
    discardJob();
    setPhase({ kind: "form" });
    setPerson(null);
    setReference(null);
    setAdult(false);
    setAgree(false);
    setFieldError("");
    onClose();
  };
  const step = Math.min(STEPS.length - 1, Math.floor((tick * POLL_MS) / 2500)); // tick = polls since this job started

  return (
    <Modal show={show} onHide={close} centered size="xl" fullscreen="md-down" className="tryon_modal" aria-labelledby={`${uid}-title`} backdrop="static">
      <Modal.Header closeButton closeLabel="Close AI Try-On">
        <Modal.Title id={`${uid}-title`} as="h2"><SparkleIcon /> AI Try On Me</Modal.Title>
        {config.mode === "mock" && <span className="tryon_mode_badge" title="The AI service is not connected yet">Test mode · simulated preview</span>}
      </Modal.Header>
      <Modal.Body>
        <div className="tryon_layout">
          <aside className="tryon_suit" aria-label="Selected suit">
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary product photo */}
            {suit.cover && <img src={suit.cover} alt={`${suit.name} fabric`} />}
            <div>
              <p className="tryon_eyebrow">Original fabric</p>
              <h3>{suit.name}</h3>
              <p className="tryon_muted">{[suit.color, suit.fabric].filter(Boolean).join(" · ") || "Unstitched suit"} · {suit.sku}</p>
            </div>
          </aside>

          <div className="tryon_main">
            {phase.kind === "form" && (
              <>
                <section aria-labelledby={`${uid}-photo`}>
                  <h3 id={`${uid}-photo`} className="tryon_h">1. Upload your full-body photo</h3>
                  <UploadBox id={`${uid}-person`} label="Upload Your Full-Body Photo" hint="Stand straight, full body visible, good light, simple background." value={person} busy={preparing === "person"} onPick={(f) => pick("person", f)} onRemove={() => setPerson(null)} />
                </section>

                <fieldset className="tryon_styles">
                  <legend className="tryon_h">2. Choose a stitching style</legend>
                  <div className="tryon_style_grid">
                    {config.styles.map((s) => (
                      <label key={s.key} className={`tryon_style ${style === s.key ? "is_on" : ""}`}>
                        <input type="radio" name={`${uid}-style`} value={s.key} checked={style === s.key} onChange={() => { setStyle(s.key); setFieldError(""); }} />
                        <span className="tryon_style_label">{s.label}</span>
                        <span className="tryon_style_desc">{s.description}</span>
                      </label>
                    ))}
                  </div>
                  {selected?.needsReference && (
                    <div className="tryon_reference">
                      <p className="tryon_ref_label"><span className="tryon_tag">Reference image</span> A photo of a stitched design you like. Only its cut and silhouette are used, never the person in it.</p>
                      <UploadBox id={`${uid}-ref`} label="Upload a reference design" hint="Any stitched suit photo showing the neckline, sleeves and length." value={reference} busy={preparing === "reference"} onPick={(f) => pick("reference", f)} onRemove={() => setReference(null)} />
                    </div>
                  )}
                </fieldset>

                <section className="tryon_privacy" aria-labelledby={`${uid}-privacy`}>
                  <h3 id={`${uid}-privacy`} className="tryon_h">3. Your privacy</h3>
                  <ul>
                    <li>{live ? (config.processor ? `Your photo is sent securely to ${config.processor}, our AI image service, only to create this preview. Google does not use it to improve its products.` : "Your photo is sent securely to our AI image service only to create this preview.") : "Test mode: your photo is processed only on our own server; no AI service is used yet."}</li>
                    <li>It is never published, never added to our galleries and never used to train AI by us.</li>
                    <li>Your photo is deleted as soon as the preview is ready; the preview itself is deleted within {config.resultRetentionMinutes} minutes, or immediately when you close this window.</li>
                  </ul>
                  <label className="tryon_check"><input type="checkbox" checked={adult} onChange={(e) => { setAdult(e.target.checked); setFieldError(""); }} /> I am 18 years or older.</label>
                  <label className="tryon_check"><input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setFieldError(""); }} /> I agree to my photo being processed as described above to create this preview.</label>
                </section>

                {fieldError && <div className="tryon_error" role="alert">{fieldError}</div>}
                <button type="button" className="shop_btn shop_btn_solid tryon_generate" onClick={generate} disabled={submitting || Boolean(preparing)}>
                  <SparkleIcon size={16} /> {submitting ? "Starting…" : "Generate My Look"}
                </button>
                <p className="tryon_muted tryon_center">Up to {config.dailyLimit} previews per day. {config.disclaimer}</p>
              </>
            )}

            {phase.kind === "working" && (
              <div className="tryon_working" role="status" aria-live="polite">
                <div className="tryon_spinner" aria-hidden="true"><SparkleIcon size={26} /></div>
                <h3>Creating your look…</h3>
                <p>{STEPS[step]}</p>
                <p className="tryon_muted">This usually takes {live ? "20–60 seconds" : "a few seconds"}. Please keep this window open.</p>
              </div>
            )}

            {phase.kind === "done" && (
              <div className="tryon_result">
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed image */}
                  <img src={phase.resultUrl} alt={`AI styling preview of you wearing ${suit.name} as ${selected?.label ?? "a stitched suit"}`} />
                  <figcaption className="tryon_disclaimer">{config.mode === "mock" && <strong>Test mode: simulated preview, not AI. </strong>}{config.disclaimer}</figcaption>
                </figure>
                <div className="tryon_result_actions">
                  <a className="shop_btn shop_btn_solid" href={`${phase.resultUrl}&download=1`} download="sara-royal-ai-preview.jpg">Download Image</a>
                  <button type="button" className="shop_btn" onClick={tryAgain}>Try Again</button>
                </div>
                <div className="tryon_shop">
                  <p className="tryon_h">Love this look?</p>
                  <div className="tryon_result_actions">
                    <button type="button" className="shop_btn shop_btn_solid" onClick={shopping.onAddToCart} disabled={shopping.addDisabled}>Add to Cart</button>
                    <button type="button" className="shop_btn shop_btn_wa" onClick={shopping.onBuyWhatsApp} disabled={shopping.waDisabled}>Buy on WhatsApp</button>
                  </div>
                  {shopping.note && <p className="tryon_muted" role="status">{shopping.note}</p>}
                </div>
                <button type="button" className="tryon_link" onClick={() => { discardJob(); setPhase({ kind: "form" }); }}>Delete my photos now</button>
              </div>
            )}

            {phase.kind === "error" && (
              <div className="tryon_working" role="alert">
                <h3>We couldn’t create your preview</h3>
                <p>{phase.message}</p>
                <button type="button" className="shop_btn shop_btn_solid" onClick={tryAgain}>Try Again</button>
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
