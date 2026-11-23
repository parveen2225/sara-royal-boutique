"use client";

import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import CommonModal from "@/components/common/Modal/CommonModal";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { errorMessage, suitsApi, type StockMovementRow } from "@/lib/api/suitsApi";
import "./suits.scss";

type SuitInfo = { id: string; sku: string; name: string; stock: number };
type Props = { suit: SuitInfo | null; onClose: () => void; onChanged: () => void };

/** Mounts a fresh dialog (fresh form state) every time a suit is opened. */
export default function StockModal({ suit, onClose, onChanged }: Props) {
  return suit ? <StockDialog key={suit.id} suit={suit} onClose={onClose} onChanged={onChanged} /> : null;
}

function StockDialog({ suit, onClose, onChanged }: Omit<Props, "suit"> & { suit: SuitInfo }) {
  const [mode, setMode] = useState<"adjust" | "set">("adjust");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("correction");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<StockMovementRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    suitsApi.stockHistory(suit.id).then((h) => !cancelled && setHistory(h)).catch(() => !cancelled && setHistory([]));
    return () => {
      cancelled = true;
    };
  }, [suit.id]);

  const save = async () => {
    setError("");
    const n = Number(qty);
    if (qty.trim() === "" || !Number.isInteger(n)) return setError("Enter a whole number.");
    if (mode === "set" && n < 0) return setError("Stock cannot be negative.");
    if (mode === "adjust" && n === 0) return setError("Adjustment cannot be zero.");
    if (mode === "adjust" && suit.stock + n < 0) return setError(`Only ${suit.stock} in stock; cannot remove ${-n}.`);
    if (reason === "other" && note.trim().length < 3) return setError("Please describe the reason.");
    setSaving(true);
    try {
      await suitsApi.setStock(suit.id, { mode, quantity: n, reason, note });
      onChanged();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CommonModal show handleClose={onClose} heading={`Stock — ${suit.sku}`} backdrop="static" className="admin_delete_confirm_modal">
      <p className="mb-2"><strong>{suit.name}</strong><br />Current stock: <strong>{suit.stock}</strong></p>
      {error && <div className="admin_error_banner mb-2" role="alert">{error}</div>}
      <Form className="admin_form">
        <Form.Label htmlFor="stk-mode">Action</Form.Label>
        <Form.Select id="stk-mode" value={mode} onChange={(e) => setMode(e.target.value as "adjust" | "set")} className="mb-2">
          <option value="adjust">Add / remove (use − to remove)</option>
          <option value="set">Set exact quantity (physical count)</option>
        </Form.Select>
        <Form.Label htmlFor="stk-qty">{mode === "adjust" ? "Change (e.g. 5 or -2)" : "New quantity"}</Form.Label>
        <Form.Control id="stk-qty" type="number" step={1} value={qty} onChange={(e) => setQty(e.target.value)} className="mb-2" />
        <Form.Label htmlFor="stk-reason">Reason</Form.Label>
        <Form.Select id="stk-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mb-2">
          <option value="correction">Physical stock correction</option>
          <option value="damaged">Damaged inventory</option>
          <option value="other">Other (describe below)</option>
        </Form.Select>
        <Form.Label htmlFor="stk-note">Note {reason === "other" ? "*" : "(optional)"}</Form.Label>
        <Form.Control id="stk-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className="mb-3" />
      </Form>
      <div className="admin_delete_confirm_actions">
        <CommonButton className="admin_outline_btn admin_sm_btn" onClick={onClose}>Cancel</CommonButton>
        <CommonButton className="admin_primary_btn admin_sm_btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</CommonButton>
      </div>
      {history.length > 0 && (
        <>
          <h6 className="mt-3">Recent changes</h6>
          <table className="admin_history_table">
            <thead><tr><th>When</th><th>Before</th><th>Change</th><th>After</th><th>Reason</th><th>By</th></tr></thead>
            <tbody>
              {history.slice(0, 8).map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.createdAt).toLocaleString()}</td><td>{m.previousQty}</td><td>{m.change > 0 ? `+${m.change}` : m.change}</td><td>{m.resultingQty}</td><td>{m.reason}</td><td>{m.actorEmail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </CommonModal>
  );
}
