"use client";

// Small building blocks for the customer account pages (accessible labels/errors, password toggle, notices).
import { useEffect, useId, useState, useSyncExternalStore, type InputHTMLAttributes, type ReactNode } from "react";
import { Container } from "react-bootstrap";
import { CloseEyeIcon, OpenEyeIcon } from "@/assets/icons/svgIcon";

export function AccountPage({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className="acct_page">
      <Container>
        <div className={`acct_card ${wide ? "is_wide" : ""}`}>{children}</div>
      </Container>
    </main>
  );
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & { label: string; error?: string | false; hint?: ReactNode; children?: ReactNode };

export function Field({ label, error, hint, type = "text", children, ...input }: FieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const describedBy = [error ? `${id}-err` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`acct_field ${isPassword ? "has_toggle" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="acct_input_wrap">
        <input id={id} type={isPassword && visible ? "text" : type} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
        {isPassword && (
          <button type="button" className="acct_toggle" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>
            {visible ? <OpenEyeIcon /> : <CloseEyeIcon />}
          </button>
        )}
      </div>
      {hint && <p className="acct_hint" id={`${id}-hint`}>{hint}</p>}
      {children}
      {error && <p className="acct_error" id={`${id}-err`} role="alert">{error}</p>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  return <div className={`acct_notice is_${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function SubmitButton({ busy, children, disabled, solid = true }: { busy: boolean; children: ReactNode; disabled?: boolean; solid?: boolean }) {
  return (
    <button type="submit" className={`acct_btn is_block ${solid ? "is_solid" : ""}`} disabled={busy || disabled} aria-busy={busy || undefined}>
      {busy && <span className="acct_spinner" aria-hidden="true" />} {children}
    </button>
  );
}

export function LoadingCard({ label = "Loading your account…" }: { label?: string }) {
  return <div className="acct_loading" role="status"><span className="acct_spinner" aria-hidden="true" /><span>{label}</span></div>;
}

export function NotConfigured() {
  return (
    <Notice>
      <p><strong>Customer accounts are coming soon.</strong></p>
      <p>You can keep shopping and order on WhatsApp without an account.</p>
    </Notice>
  );
}

const noopSubscribe = () => () => undefined;
/** false during server rendering and hydration, true afterwards (lets portal-based UI open without a hydration mismatch). */
export function useIsClient() { return useSyncExternalStore(noopSubscribe, () => true, () => false); }

const subscribeStorage = (cb: () => void) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); };
const readNumber = (key: string) => { try { return Number(window.localStorage.getItem(key) ?? 0) || 0; } catch { return 0; } };

/** Countdown for "resend" buttons, so customers cannot trigger Firebase's email limits by tapping repeatedly. */
export function useCooldown(storageKey: string) {
  // Server and hydration render use 0; the stored deadline is read right after (no hydration mismatch).
  const stored = useSyncExternalStore(subscribeStorage, () => readNumber(storageKey), () => 0);
  const [local, setLocal] = useState(0);
  const until = Math.max(stored, local);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= now) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until, now]);
  const start = (seconds: number) => {
    const u = Date.now() + seconds * 1000;
    setLocal(u); setNow(Date.now());
    try { window.localStorage.setItem(storageKey, String(u)); } catch { /* storage blocked: in-memory only */ }
  };
  return { remaining: Math.max(0, Math.ceil((until - now) / 1000)), start };
}
