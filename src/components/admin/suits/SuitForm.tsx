"use client";

import { useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import ImageListEditor from "./ImageListEditor";
import FormSection from "@/components/admin/ui/FormSection";
import AdminIcon from "@/components/admin/ui/AdminIcon";
import { errorMessage, type AdminSuit, type SuitCategory, type SuitImage } from "@/lib/api/suitsApi";
import "./suits.scss";

type Props = {
  categories: SuitCategory[];
  suit?: AdminSuit; // editing when present
  canSetStock: boolean; // opening stock (of the suit on create, or of a new variant) needs the stock permission
  submitLabel: string;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
};

const MONEY = /^\d{1,9}(\.\d{1,2})?$/;
const MAX_VARIANTS = 12;
const MAX_VARIANT_IMAGES = 6;

/** A variant row in the form. `id` = already saved (its stock then changes only through "Adjust stock"). */
type VariantDraft = { key: string; id?: string; images: SuitImage[]; stock: string };
let draftSeq = 0;
const newDraft = (images: SuitImage[] = []): VariantDraft => ({ key: `new-${++draftSeq}`, images, stock: "0" });

export default function SuitForm({ categories, suit, canSetStock, submitLabel, onSubmit }: Props) {
  const editing = Boolean(suit);
  const [name, setName] = useState(suit?.name ?? "");
  const [fabric, setFabric] = useState(suit?.fabric ?? "");
  const [color, setColor] = useState(suit?.color ?? "");
  const [original, setOriginal] = useState(suit ? String(suit.originalPrice) : "");
  const [sale, setSale] = useState(suit ? String(suit.salePrice) : "");
  const [description, setDescription] = useState(suit?.description ?? "");
  const [details, setDetails] = useState(suit?.details ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(suit?.categoryIds ?? []);
  const [featured, setFeatured] = useState(suit?.featured ?? false);
  const [fabricImages, setFabricImages] = useState<SuitImage[]>(suit?.fabricImages ?? []);
  const [referenceImages, setReferenceImages] = useState<SuitImage[]>(suit?.referenceImages ?? []);
  const [stock, setStock] = useState("0");
  const [variants, setVariants] = useState<VariantDraft[]>(() => (suit?.variants ?? []).map((v) => ({ key: v.id, id: v.id, images: v.images, stock: "" })));
  const [publishNow, setPublishNow] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const discount = (() => {
    const o = Number(original), s = Number(sale || original);
    return MONEY.test(original) && MONEY.test(sale || original) && s < o ? Math.round(((o - s) * 100) / o) : 0;
  })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Suit name is required.");
    if (!MONEY.test(original)) return setError("Enter the original price as a number (max 2 decimals).");
    if (sale && !MONEY.test(sale)) return setError("Enter the sale price as a number (max 2 decimals).");
    if (sale && Number(sale) > Number(original)) return setError("Sale price cannot exceed the original price.");
    if (!editing && publishNow && fabricImages.length === 0) return setError("Add at least one fabric image before publishing.");
    for (const [i, v] of variants.entries()) {
      if (v.images.length === 0) return setError(`Variant ${i + 1} needs at least one image.`);
      if (!v.id && canSetStock && !/^\d{1,6}$/.test(v.stock.trim() || "0")) return setError(`Variant ${i + 1}: opening stock must be a whole number, 0 or more.`);
    }

    const body: Record<string, unknown> = {
      name, fabric, color, description, details, featured, categoryIds,
      originalPrice: original,
      salePrice: sale || original,
      fabricImages: fabricImages.map((i) => i.url),
      referenceImages: referenceImages.map((i) => i.url),
    };
    // Variants are sent whenever the suit has (or had) any, as the full ordered list. Existing variants never send a
    // stock number: their stock only changes through orders, returns and "Adjust stock".
    if (variants.length > 0 || (suit?.variants.length ?? 0) > 0) {
      body.variants = variants.map((v) => ({
        ...(v.id ? { id: v.id } : canSetStock ? { stock: Number(v.stock.trim() || "0") } : {}),
        images: v.images.map((i) => i.url),
      }));
    }
    if (!editing) {
      if (canSetStock && variants.length === 0) {
        const n = Number(stock);
        if (!Number.isInteger(n) || n < 0) return setError("Stock must be a whole number, 0 or more.");
        body.stock = n;
      }
      body.status = publishNow ? "published" : "draft";
    }
    setSaving(true);
    try {
      await onSubmit(body);
    } catch (err) {
      setError(errorMessage(err, "Could not save the suit."));
    } finally {
      setSaving(false);
    }
  };

  const liveStock = (id?: string) => suit?.variants.find((v) => v.id === id)?.stock ?? 0;
  const updateVariant = (key: string, patch: Partial<VariantDraft>) => setVariants((cur) => cur.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  const moveVariant = (from: number, to: number) => setVariants((cur) => {
    if (to < 0 || to >= cur.length) return cur;
    const next = [...cur];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  });
  const openingTotal = variants.reduce((sum, v) => sum + (v.id ? liveStock(v.id) : Number(v.stock) || 0), 0);
  const converting = editing && (suit?.variants.length ?? 0) === 0 && variants.length > 0 && (suit?.stock ?? 0) > 0;

  const toggleCategory = (id: string) => setCategoryIds((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));
  const shown = categories.filter((c) => c.active || categoryIds.includes(c.id));

  return (
    <Form className="admin_form ad_form" onSubmit={submit} noValidate>
      {error && <div className="admin_error_banner" role="alert"><AdminIcon name="alert" size={18} /><span>{error}</span></div>}

      <FormSection title="Basic details" description="What customers see first on the suit page.">
        <Row className="g-3">
          {suit && (
            <Col md={12}>
              <p className="mb-0"><strong>SKU:</strong> {suit.sku} <span className="text-muted small">(generated automatically, cannot be changed)</span></p>
            </Col>
          )}
          <Col md={6}>
            <Form.Label htmlFor="suit-name">Suit name *</Form.Label>
            <Form.Control id="suit-name" value={name} maxLength={160} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rose Pink Chanderi Suit" aria-invalid={error.startsWith("Suit name")} />
          </Col>
          <Col md={3}>
            <Form.Label htmlFor="suit-fabric">Fabric / material</Form.Label>
            <Form.Control id="suit-fabric" value={fabric} maxLength={120} onChange={(e) => setFabric(e.target.value)} placeholder="e.g. Pure cotton" />
          </Col>
          <Col md={3}>
            <Form.Label htmlFor="suit-color">Color</Form.Label>
            <Form.Control id="suit-color" value={color} maxLength={80} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Rose pink" />
          </Col>
        </Row>
      </FormSection>

      <FormSection title={editing || !canSetStock ? "Pricing" : "Pricing & stock"} description="Leave the sale price empty if there is no discount.">
        <Row className="g-3">
          <Col md={4}>
            <Form.Label htmlFor="suit-original">Original price (₹) *</Form.Label>
            <Form.Control id="suit-original" inputMode="decimal" value={original} onChange={(e) => setOriginal(e.target.value)} placeholder="e.g. 2499" aria-invalid={error.startsWith("Enter the original")} />
          </Col>
          <Col md={4}>
            <Form.Label htmlFor="suit-sale">Sale price (₹)</Form.Label>
            <Form.Control id="suit-sale" inputMode="decimal" value={sale} onChange={(e) => setSale(e.target.value)} placeholder="Leave empty for no sale" aria-describedby="suit-sale-hint" aria-invalid={error.includes("sale price") || error.startsWith("Sale price")} />
            <Form.Text id="suit-sale-hint" className="text-muted">{discount > 0 ? `${discount}% off will be shown` : "No discount badge"}</Form.Text>
          </Col>
          {!editing && canSetStock && variants.length === 0 && (
            <Col md={4}>
              <Form.Label htmlFor="suit-stock">Opening stock</Form.Label>
              <Form.Control id="suit-stock" type="number" min={0} step={1} value={stock} onChange={(e) => setStock(e.target.value)} />
            </Col>
          )}
        </Row>
      </FormSection>

      <FormSection title="Description" description="Shown on the suit page. Keep it short and honest about the fabric.">
        <Row className="g-3">
          <Col md={12}>
            <Form.Label htmlFor="suit-desc">Description</Form.Label>
            <Form.Control as="textarea" id="suit-desc" rows={3} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Col>
          <Col md={12}>
            <Form.Label htmlFor="suit-details">Details (what is included, dimensions, care…)</Form.Label>
            <Form.Control as="textarea" id="suit-details" rows={3} maxLength={4000} value={details} onChange={(e) => setDetails(e.target.value)} />
          </Col>
        </Row>
      </FormSection>

      <FormSection title="Categories" description="Customers can browse the collection by these.">
        {shown.length === 0 ? (
          <p className="text-muted small mb-0">No categories yet. Add some under “Categories”.</p>
        ) : (
          <div className="admin_chip_list" role="group" aria-label="Categories">
            {shown.map((c) => (
              <label key={c.id} className={`admin_chip_check ${categoryIds.includes(c.id) ? "is_on" : ""} ${c.active ? "" : "is_inactive"}`}>
                <input type="checkbox" checked={categoryIds.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                {c.name}{c.active ? "" : " (inactive)"}
              </label>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection title="Images" description="Real fabric photos come first; styled examples are optional.">
        <ImageListEditor
          label="Original fabric images"
          hint="Photos of the actual unstitched fabric (1–10). The first image is the cover. Required before publishing."
          images={fabricImages}
          max={10}
          coverLabel="Cover"
          onChange={setFabricImages}
        />
        <ImageListEditor
          label="Stitched / model reference images (optional)"
          hint="Styling examples only (0–5). Customers see these labelled as stitched references, never as the fabric itself."
          images={referenceImages}
          max={5}
          onChange={setReferenceImages}
        />
      </FormSection>

      <FormSection
        title="Image variants (optional)"
        description="Same design in other colours. Each variant has its own photos and stock, and customers choose one by tapping its photo. All variants use the price above; the fabric images above stay the cover on cards and listings."
      >
        {converting && (
          <div className="admin_variant_notice" role="note">
            This suit has <strong>{suit!.stock}</strong> in stock today. After saving with variants, stock is counted per variant: enter each variant’s opening stock below (their total replaces the current {suit!.stock}).
          </div>
        )}
        {variants.length === 0 && <p className="text-muted small mb-2">No variants. Customers buy the suit as shown above.</p>}
        <div className="admin_variant_list">
          {variants.map((v, i) => {
            const saved = v.id ? suit?.variants.find((x) => x.id === v.id) : undefined;
            const stockLeft = v.id ? liveStock(v.id) : 0;
            return (
              <div className="admin_variant_card" key={v.key} data-testid="variant-card">
                <div className="admin_variant_head">
                  <strong>Variant {i + 1}</strong>
                  {saved && <span className="admin_variant_code">{saved.code}</span>}
                  <span className="admin_variant_tools">
                    <button type="button" onClick={() => moveVariant(i, i - 1)} disabled={i === 0} aria-label={`Move variant ${i + 1} earlier`}>◀</button>
                    <button type="button" onClick={() => moveVariant(i, i + 1)} disabled={i === variants.length - 1} aria-label={`Move variant ${i + 1} later`}>▶</button>
                    <button type="button" className="is_danger" onClick={() => setVariants((cur) => cur.filter((x) => x.key !== v.key))} disabled={stockLeft > 0}
                      title={stockLeft > 0 ? "Set this variant's stock to 0 with Adjust stock before removing it" : undefined}>Remove</button>
                  </span>
                </div>
                <ImageListEditor label={`Variant ${i + 1} photos`} images={v.images} max={MAX_VARIANT_IMAGES} coverLabel="Thumbnail" onChange={(images) => updateVariant(v.key, { images })} />
                {v.id ? (
                  <p className="admin_variant_stock_note mb-0">Stock: <strong>{stockLeft}</strong>{stockLeft > 0 ? " · change it with “Adjust stock” above" : " · use “Adjust stock” above to add pieces"}</p>
                ) : canSetStock ? (
                  <div className="admin_variant_stock_input">
                    <Form.Label htmlFor={`variant-stock-${v.key}`}>Opening stock</Form.Label>
                    <Form.Control id={`variant-stock-${v.key}`} type="number" min={0} step={1} value={v.stock} onChange={(e) => updateVariant(v.key, { stock: e.target.value })} />
                  </div>
                ) : (
                  <p className="admin_variant_stock_note mb-0">Starts with 0 in stock (you do not have permission to set stock).</p>
                )}
              </div>
            );
          })}
        </div>
        <div className="d-flex flex-wrap align-items-center gap-3 mt-2">
          <button type="button" className="admin_outline_btn admin_sm_btn" onClick={() => setVariants((cur) => [...cur, newDraft()])} disabled={variants.length >= MAX_VARIANTS}>+ Add variant</button>
          {variants.length > 0 && <span className="text-muted small">{variants.length} of {MAX_VARIANTS} · total stock {openingTotal}</span>}
        </div>
      </FormSection>

      <FormSection title="Visibility">
        <Form.Check id="suit-featured" type="checkbox" label="Featured on the Home page" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        {!editing && (
          <Form.Check id="suit-publish" type="checkbox" className="mt-2" label="Publish immediately (otherwise saved as Draft)" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
        )}
      </FormSection>

      <div className="ad_form_actions">
        <CommonButton type="submit" className="admin_primary_btn" disabled={saving} isLoading={saving}>
          {saving ? "Saving…" : submitLabel}
        </CommonButton>
      </div>
    </Form>
  );
}
