"use client";

import { useEffect, useRef, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import CommonModal from "@/components/common/Modal/CommonModal";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { errorMessage, suitsApi, type StockChangeResult, type StockMovementRow, type StockState } from "@/lib/api/suitsApi";
import "./suits.scss";

type SuitInfo = { id: string; sku: string; name: string; stock: number };
type Props = { suit: SuitInfo | null; onClose: () => void; onChanged: (result: StockChangeResult) => void };

const MAX_STOCK = 100000; // same limit as the server (src/lib/suitInput.ts)
const LOW_STOCK_MAX = 3;
export const stockStateOf = (qty: number): StockState => (qty <= 0 ? "out_of_stock" : qty <= LOW_STOCK_MAX ? "low_stock" : "in_stock");
export const STOCK_STATE_LABEL: Record<StockState, string> = { in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" };
const REASON_LABEL: Record<string, string> = {
  initial: "Opening stock", restock: "New stock received", correction: "Stock count correction", damaged: "Damaged / defective", other: "Other",
  order_confirmed: "Order confirmed", order_cancelled: "Order cancelled", return_restock: "Return restocked", exchange: "Exchange",
};

/** Mounts a fresh dialog (fresh form state) every time a suit is opened. */
export default function StockModal({ suit, onClose, onChanged }: Props) {
  return suit ? <StockDialog key={suit.id} suit={suit} onClose={onClose} onChanged={onChanged} /> : null;
}

/** "" or a whole number 0..MAX_STOCK; anything else is invalid (null). */
const parseQty = (v: string): number | null => {
  const t = v.trim();
  if (t === "") return 0;
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n <= MAX_STOCK ? n : null;
};

function StockDialog({ suit, onClose, onChanged }: Omit<Props, "suit"> & { suit: SuitInfo }) {
  // The page may have been open for a while (orders also change stock), so the dialog reads the live quantity first.
  const [current, setCurrent] = useState(suit.stock);
  const [fresh, setFresh] = useState(false);
  const [add, setAdd] = useState("");
  const [remove, setRemove] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false); // blocks a second submit before React re-renders the disabled button
  const [history, setHistory] = useState<StockMovementRow[]>([]);

  const refresh = (cancelled = () => false) =>
    Promise.all([
      suitsApi.stockLevel(suit.id).then((s) => { if (!cancelled()) { setCurrent(s.stock); setFresh(true); } }).catch(() => undefined),
      suitsApi.stockHistory(suit.id).then((h) => !cancelled() && setHistory(h)).catch(() => !cancelled() && setHistory([])),
    ]);

  useEffect(() => {
    let cancelled = false;
    refresh(() => cancelled);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suit.id]);

  const addN = parseQty(add);
  const removeN = parseQty(remove);
  const net = (addN ?? 0) - (removeN ?? 0);
  const updated = current + net;
  const updatedState = stockStateOf(Math.max(0, updated));

  const problem =
    addN === null ? "Add stock must be a whole number, 0 or more."
      : removeN === null ? "Remove stock must be a whole number, 0 or more."
        : updated < 0 ? `Only ${current} in stock: you can remove at most ${current + (addN ?? 0)}.`
          : updated > MAX_STOCK ? `Stock cannot exceed ${MAX_STOCK.toLocaleString("en-IN")}.`
            : reason === "other" && note.trim().length < 3 ? "Please describe the reason for “Other”."
              : "";
  const canSave = !saving && !problem && net !== 0;

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inFlight.current) return;
    setError("");
    if (problem) return setError(problem);
    if (net === 0) return setError("Enter a quantity to add or remove.");
    // Reason is optional for the admin; the audit trail still records one.
    const finalReason = reason || (net > 0 ? "restock" : "correction");
    inFlight.current = true;
    setSaving(true);
    try {
      // One relative, atomic change on the server ($inc with a "never below zero" guard), so it can never overwrite an
      // order or another admin's change that happened after this dialog opened.
      const result = await suitsApi.setStock(suit.id, { mode: "adjust", quantity: net, reason: finalReason, note: note.trim() });
      onChanged(result);
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not save the stock change."));
      refresh(); // e.g. 409: stock changed meanwhile; show the real quantity
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <CommonModal show handleClose={saving ? () => undefined : onClose} heading="Adjust stock" backdrop="static" className="admin_delete_confirm_modal admin_stock_modal">
      <p className="admin_stock_suit"><strong>{suit.name}</strong> <span>SKU {suit.sku}</span></p>
      {error && <div className="admin_error_banner" role="alert">{error}</div>}

      <Form className="admin_form" onSubmit={save} noValidate>
        <div className="admin_stock_summary" aria-live="polite">
          <div className="admin_stock_box">
            <span className="admin_stock_box_label">Current stock</span>
            <strong className="admin_stock_box_value">{current}</strong>
            <span className={`admin_pill ${stockStateOf(current)}`}>{STOCK_STATE_LABEL[stockStateOf(current)]}</span>
            {!fresh && <span className="admin_stock_box_hint">checking…</span>}
          </div>
          <span className="admin_stock_arrow" aria-hidden="true">→</span>
          <div className={`admin_stock_box is_updated ${net !== 0 ? "has_change" : ""} ${updated < 0 ? "is_invalid" : ""}`}>
            <span className="admin_stock_box_label">Updated stock</span>
            <strong className="admin_stock_box_value">{updated < 0 ? "—" : updated}</strong>
            {updated >= 0 && <span className={`admin_pill ${updatedState}`}>{STOCK_STATE_LABEL[updatedState]}</span>}
            {net !== 0 && <span className="admin_stock_box_hint">{net > 0 ? `+${net}` : net}</span>}
          </div>
        </div>

        <Row className="g-3">
          <Col xs={6}>
            <Form.Label htmlFor="stk-add">Add stock</Form.Label>
            <Form.Control id="stk-add" type="number" inputMode="numeric" min={0} step={1} placeholder="0" value={add} onChange={(e) => setAdd(e.target.value)} aria-invalid={addN === null} autoFocus />
          </Col>
          <Col xs={6}>
            <Form.Label htmlFor="stk-remove">Remove stock</Form.Label>
            <Form.Control id="stk-remove" type="number" inputMode="numeric" min={0} max={current + (addN ?? 0)} step={1} placeholder="0" value={remove} onChange={(e) => setRemove(e.target.value)} aria-invalid={removeN === null || updated < 0} />
          </Col>
          <Col xs={12}>
            <Form.Label htmlFor="stk-reason">Reason (optional)</Form.Label>
            <Form.Select id="stk-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Not specified</option>
              <option value="restock">New stock received</option>
              <option value="correction">Stock count correction</option>
              <option value="damaged">Damaged / defective</option>
              <option value="other">Other (describe below)</option>
            </Form.Select>
          </Col>
          <Col xs={12}>
            <Form.Label htmlFor="stk-note">Note {reason === "other" ? "*" : "(optional)"}</Form.Label>
            <Form.Control id="stk-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 10 pieces from supplier" />
          </Col>
        </Row>
        {problem && !error && <p className="admin_stock_problem" role="status">{problem}</p>}

        <div className="admin_delete_confirm_actions">
          <CommonButton type="button" className="admin_outline_btn admin_sm_btn" onClick={onClose} disabled={saving}>Cancel</CommonButton>
          <CommonButton type="submit" className="admin_primary_btn admin_sm_btn" disabled={!canSave} isLoading={saving}>{saving ? "Saving…" : "Save Stock Changes"}</CommonButton>
        </div>
      </Form>

      {history.length > 0 && (
        <details className="admin_stock_history">
          <summary>Recent stock changes ({Math.min(history.length, 8)})</summary>
          <div className="admin_stock_history_scroll">
            <table className="admin_history_table">
              <thead><tr><th>When</th><th>Before</th><th>Change</th><th>After</th><th>Reason</th><th>By</th></tr></thead>
              <tbody>
                {history.slice(0, 8).map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.createdAt).toLocaleString()}</td><td>{m.previousQty}</td><td>{m.change > 0 ? `+${m.change}` : m.change}</td><td>{m.resultingQty}</td>
                    <td>{REASON_LABEL[m.reason] ?? m.reason}{m.note ? ` · ${m.note}` : ""}</td><td>{m.actorEmail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </CommonModal>
  );
}
