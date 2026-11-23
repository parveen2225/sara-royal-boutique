"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SuitForm from "@/components/admin/suits/SuitForm";
import StockModal from "@/components/admin/suits/StockModal";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { useCurrentAdmin } from "@/lib/admin/useCurrentAdmin";
import { errorMessage, formatInr, suitsApi, type AdminSuit, type SuitCategory } from "@/lib/api/suitsApi";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";

export default function EditSuitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const created = useSearchParams()?.get("created") === "1";
  const { user } = useCurrentAdmin();
  const [suit, setSuit] = useState<AdminSuit | null>(null);
  const [categories, setCategories] = useState<SuitCategory[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(created ? "Suit created as a draft. Add images and publish when ready." : "");
  const [stockOpen, setStockOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const [reloadTick, setReloadTick] = useState(0);
  const load = () => setReloadTick((t) => t + 1);
  useEffect(() => {
    let cancelled = false;
    Promise.all([suitsApi.get(id), suitsApi.categories()])
      .then(([s, c]) => {
        if (cancelled) return;
        setSuit(s);
        setCategories(c);
        setFormKey((k) => k + 1); // re-seed the form from the server copy after status/stock changes
      })
      .catch((e) => !cancelled && setError(errorMessage(e, "Could not load this suit.")));
    return () => {
      cancelled = true;
    };
  }, [id, reloadTick]);

  if (error && !suit) return <div className="admin_error_banner" role="alert">{error}</div>;
  if (!suit) return null;

  const changeStatus = async (status: "draft" | "published" | "archived", label: string) => {
    setError(""); setNotice("");
    try {
      await suitsApi.setStatus(suit.id, status);
      setNotice(`Suit ${label}.`);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <section>
      <PageHeader title={suit.name} subtitle={<>SKU <strong>{suit.sku}</strong></>} actions={<CommonButton role="link" to="/admin/suits" className="admin_outline_btn">All suits</CommonButton>} />
      {error && <div className="admin_error_banner mb-3" role="alert">{error}</div>}
      {notice && <div className="admin_success_banner" role="status">{notice}</div>}

      <div className="admin_card mb-3" style={{ padding: "1rem" }}>
        <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
          <div>
            <span className={`admin_pill ${suit.status}`}>{suit.status}</span>{" "}
            <span className={`admin_pill ${suit.stockState}`}>{suit.stock} in stock</span>{" "}
            {suit.discountPercent > 0 && <span className="admin_old_price">{formatInr(suit.originalPrice)}</span>}
            <strong>{formatInr(suit.salePrice)}</strong>{suit.discountPercent > 0 && <small className="text-muted"> ({suit.discountPercent}% off)</small>}
          </div>
          <div className="admin_row_actions">
            {suit.status === "draft" && <CommonButton className="admin_primary_btn admin_sm_btn" onClick={() => changeStatus("published", "published")}>Publish</CommonButton>}
            {suit.status === "published" && <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => changeStatus("draft", "moved to Draft")}>Unpublish</CommonButton>}
            {suit.status !== "archived" && <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => changeStatus("archived", "archived")}>Archive</CommonButton>}
            {suit.status === "archived" && <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => changeStatus("draft", "restored to Draft")}>Restore to Draft</CommonButton>}
            {user?.permissions.stock && <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => setStockOpen(true)}>Adjust stock</CommonButton>}
          </div>
        </div>
      </div>

      <SuitForm
        key={formKey}
        suit={suit}
        categories={categories}
        canSetStock={false}
        submitLabel="Save Changes"
        onSubmit={async (body) => {
          const updated = await suitsApi.update(suit.id, body);
          setSuit(updated);
          setNotice("Changes saved.");
        }}
      />

      <StockModal suit={stockOpen ? suit : null} onClose={() => setStockOpen(false)} onChanged={() => { setNotice("Stock updated."); load(); }} />
    </section>
  );
}
