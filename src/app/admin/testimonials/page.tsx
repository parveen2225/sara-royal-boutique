"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import React from "react";
import Image from "next/image";
import { Card, Col, Row } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import CommonModal from "@/components/common/Modal/CommonModal";
import InputField from "@/components/common/formik/inputField/InputField";
import SelectField from "@/components/common/formik/selectField/SelectField";
import TextareaField from "@/components/common/formik/textareaField/TextareaField";
import { type Testimonial } from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { extractListData, formatAdminDate } from "@/lib/api/listData";
import { TESTIMONIALS } from "@/lib/api/urls";
import { uploadImages } from "@/lib/api/upload";

const TABLE_FIELDS = [
  { label: "Photo", key: "photo" },
  { label: "Customer", key: "customer" },
  { label: "Rating", key: "rating" },
  { label: "Created", key: "created" },
  { label: "Status", key: "status" },
  { label: "Actions", key: "actions" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const RATING_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: `${n} Star${n > 1 ? "s" : ""}`,
}));

const emptyForm = {
  customerName: "",
  reviewText: "",
  rating: "5",
  image: "",
  imageName: "",
  sortOrder: "0",
  isActive: true,
};

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Something went wrong.";
};

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);

  const previewSrc = useMemo(
    () => form.image || "/images/logo_icon.png",
    [form.image],
  );

  const loadTestimonials = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await apiJson<Testimonial[]>(TESTIMONIALS.LIST, { skipLoader: true });
      setTestimonials(extractListData<Testimonial>(res.data));
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to load testimonials.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTestimonials().catch(() => {});
  }, [loadTestimonials]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setUploadError("");
  };

  const fillForm = (item: Testimonial) => {
    setEditingId(item.id);
    setForm({
      customerName: item.customerName,
      reviewText: item.reviewText,
      rating: String(item.rating),
      image: item.image,
      imageName: "",
      sortOrder: String(item.sortOrder),
      isActive: item.isActive,
    });
    setErrors({});
    setUploadError("");
  };

  const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    uploadImages([file])
      .then((urls) => {
        setForm((prev) => ({ ...prev, image: urls[0] || "", imageName: file.name }));
      })
      .catch((error: unknown) => {
        setUploadError(error instanceof Error ? error.message : "Image upload failed");
      })
      .finally(() => setUploading(false));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.customerName.trim()) next.customerName = "Customer name is required.";
    if (!form.reviewText.trim()) next.reviewText = "Review text is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      customerName: form.customerName.trim(),
      reviewText: form.reviewText.trim(),
      rating: Number(form.rating) || 5,
      image: form.image,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiJson<Testimonial>(TESTIMONIALS.UPDATE, {
          method: "PUT",
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        await apiJson<Testimonial>(TESTIMONIALS.CREATE, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await loadTestimonials();
      resetForm();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to save testimonial.");
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await apiJson(`${TESTIMONIALS.DELETE}?id=${encodeURIComponent(deleteId)}`, {
        method: "DELETE",
      });
      await loadTestimonials();
      if (editingId === deleteId) resetForm();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to delete testimonial.");
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (item: Testimonial) => {
    try {
      await apiJson<Testimonial>(TESTIMONIALS.UPDATE, {
        method: "PUT",
        body: JSON.stringify({
          id: item.id,
          customerName: item.customerName,
          reviewText: item.reviewText,
          rating: item.rating,
          image: item.image,
          sortOrder: item.sortOrder,
          isActive: !item.isActive,
        }),
      });
      await loadTestimonials();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to update status.");
    }
  };

  return (
    <section>
      <div className="admin_section_header">
        <h4 className="mb-0">Testimonials Manager</h4>
        <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => loadTestimonials()}>
          Refresh
        </CommonButton>
      </div>

      <p className="text-muted small mb-3">
        Same reviews as the homepage slider. Changes here update the public site.
      </p>

      {loadError && <div className="admin_error_banner mb-3">{loadError}</div>}

      <Card className="admin_card p-3 mb-4">
        <form key={editingId ?? "new"} className="admin_form" onSubmit={onSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <InputField
                label="Customer Name"
                name="customerName"
                value={form.customerName}
                onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                error={errors.customerName}
              />
            </Col>
            <Col md={3}>
              <SelectField
                name="rating"
                label="Rating"
                value={form.rating}
                options={RATING_OPTIONS}
                onChange={(opt) =>
                  setForm((prev) => ({ ...prev, rating: opt?.value ?? "5" }))
                }
              />
            </Col>
            <Col md={3}>
              <SelectField
                name="status"
                label="Status"
                value={form.isActive ? "active" : "inactive"}
                options={STATUS_OPTIONS}
                onChange={(opt) =>
                  setForm((prev) => ({ ...prev, isActive: opt?.value === "active" }))
                }
              />
            </Col>
            <Col md={12}>
              <TextareaField
                label="Review Text"
                name="reviewText"
                value={form.reviewText}
                rows={3}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    reviewText: (e as unknown as React.ChangeEvent<HTMLTextAreaElement>).target
                      .value,
                  }))
                }
              />
              {errors.reviewText && (
                <small className="text-danger">{errors.reviewText}</small>
              )}
            </Col>
            <Col md={3}>
              <InputField
                label="Sort Order"
                name="sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
              />
            </Col>
            <Col md={6}>
              <div className="input_group">
                <label className="form-label" htmlFor="testimonialImage">
                  Customer Photo (optional)
                </label>
                <input
                  id="testimonialImage"
                  type="file"
                  accept="image/*"
                  className="form-control admin_file_input"
                  onChange={onFileSelect}
                />
                {uploading && <small className="text-muted d-block mt-1">Uploading...</small>}
                {uploadError && <small className="text-danger d-block mt-1">{uploadError}</small>}
              </div>
            </Col>
            {form.image && (
              <Col md={12}>
                <Image
                  src={previewSrc}
                  alt="Customer preview"
                  width={64}
                  height={64}
                  className="rounded-circle"
                  unoptimized={previewSrc.startsWith("http")}
                />
              </Col>
            )}
            <Col md={12}>
              <div className="d-flex gap-2 flex-wrap">
                <CommonButton type="submit" className="admin_primary_btn" disabled={saving}>
                  {editingId ? "Update Testimonial" : "Add Testimonial"}
                </CommonButton>
                {editingId && (
                  <CommonButton className="admin_outline_btn" onClick={resetForm}>
                    Cancel
                  </CommonButton>
                )}
              </div>
            </Col>
          </Row>
        </form>
      </Card>

      <div className="admin_table_scroll">
        <CommonTable fields={TABLE_FIELDS} lastColumnWidth="220px" loader={isLoading}>
          {testimonials.map((item) => {
            const avatarSrc = item.image?.trim() || "/images/logo_icon.png";
            return (
              <tr key={item.id}>
                <td>
                  <Image
                    src={avatarSrc}
                    alt={item.customerName}
                    width={48}
                    height={48}
                    className="admin_table_image rounded-circle"
                    unoptimized={avatarSrc.startsWith("http")}
                  />
                </td>
                <td>
                  <strong>{item.customerName}</strong>
                  <small className="d-block text-muted text-truncate" style={{ maxWidth: 280 }}>
                    {item.reviewText}
                  </small>
                </td>
                <td>{"★".repeat(item.rating)}</td>
                <td>{formatAdminDate(item.createdAt)}</td>
                <td>
                  <span className={`admin_status_badge ${item.isActive ? "active" : "inactive"}`}>
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <CommonButton
                      className="admin_outline_btn admin_sm_btn"
                      onClick={() => fillForm(item)}
                    >
                      Edit
                    </CommonButton>
                    <CommonButton
                      className="admin_outline_btn admin_sm_btn"
                      onClick={() => toggleActive(item)}
                    >
                      {item.isActive ? "Deactivate" : "Activate"}
                    </CommonButton>
                    <CommonButton
                      className="admin_danger_btn admin_sm_btn"
                      onClick={() => setDeleteId(item.id)}
                    >
                      Delete
                    </CommonButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </CommonTable>
      </div>

      <CommonModal
        show={!!deleteId}
        handleClose={() => setDeleteId(null)}
        heading="Delete Testimonial"
        backdrop="static"
        className="admin_delete_modal"
      >
        <p className="admin_modal_msg">Delete this testimonial? This cannot be undone.</p>
        <div className="admin_modal_actions">
          <CommonButton
            className="admin_outline_btn admin_sm_btn"
            onClick={() => setDeleteId(null)}
          >
            Cancel
          </CommonButton>
          <CommonButton className="admin_danger_btn admin_sm_btn" onClick={onConfirmDelete}>
            Delete
          </CommonButton>
        </div>
      </CommonModal>
    </section>
  );
}
