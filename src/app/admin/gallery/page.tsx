"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import React from "react";
import Image from "next/image";
import { Card, Col, Row } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import AdminDeleteConfirmModal from "@/components/admin/modal/AdminDeleteConfirmModal/AdminDeleteConfirmModal";
import InputField from "@/components/common/formik/inputField/InputField";
import SelectField from "@/components/common/formik/selectField/SelectField";
import {
  GALLERY_CATEGORIES,
  type GalleryCategory,
  type GalleryItem,
} from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { extractListData, formatAdminDate } from "@/lib/api/listData";
import { GALLERY } from "@/lib/api/urls";
import { uploadImages } from "@/lib/api/upload";

const TABLE_FIELDS = [
  { label: "Preview", key: "preview" },
  { label: "Title / Category", key: "info" },
  { label: "Created", key: "created" },
  { label: "Status", key: "status" },
  { label: "Actions", key: "actions" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const CATEGORY_OPTIONS = GALLERY_CATEGORIES.map((cat) => ({
  value: cat,
  label: cat,
}));

type GalleryFormState = {
  title: string;
  image: string;
  imageName: string;
  category: GalleryCategory;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: GalleryFormState = {
  title: "",
  image: "",
  imageName: "",
  category: GALLERY_CATEGORIES[0],
  sortOrder: "0",
  isActive: true,
};

type GalleryListResponse = { items: GalleryItem[] };

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Something went wrong.";
};

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
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
    () => form.image || "/images/kide_war1.png",
    [form.image],
  );

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await apiJson<GalleryListResponse | GalleryItem[]>(GALLERY.LIST, {
        skipLoader: true,
      });
      setItems(extractListData<GalleryItem>(res.data));
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to load gallery.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems().catch(() => {});
  }, [loadItems]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setUploadError("");
  };

  const fillForm = (item: GalleryItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      image: item.image,
      imageName: "",
      category: item.category,
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
    if (!form.image) next.image = "Gallery image is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      title: form.title.trim(),
      image: form.image,
      category: form.category,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiJson<GalleryItem>(GALLERY.UPDATE, {
          method: "PUT",
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        await apiJson<GalleryItem>(GALLERY.CREATE, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await loadItems();
      resetForm();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to save gallery item.");
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await apiJson(`${GALLERY.DELETE}?id=${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      await loadItems();
      if (editingId === deleteId) resetForm();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to delete gallery item.");
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (item: GalleryItem) => {
    try {
      await apiJson<GalleryItem>(GALLERY.UPDATE, {
        method: "PUT",
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          image: item.image,
          category: item.category,
          sortOrder: item.sortOrder,
          isActive: !item.isActive,
        }),
      });
      await loadItems();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to update status.");
    }
  };

  return (
    <section>
      <div className="admin_section_header">
        <h4 className="mb-0">Gallery Manager</h4>
        <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => loadItems()}>
          Refresh
        </CommonButton>
      </div>

      {loadError && <div className="admin_error_banner mb-3">{loadError}</div>}

      <Card className="admin_card p-3 mb-4">
        <form key={editingId ?? "new"} className="admin_form" onSubmit={onSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <InputField
                label="Title (optional)"
                name="title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </Col>
            <Col md={3}>
              <SelectField
                name="category"
                label="Category"
                value={form.category}
                options={CATEGORY_OPTIONS}
                onChange={(opt) =>
                  setForm((prev) => ({
                    ...prev,
                    category: (opt?.value as GalleryCategory) || GALLERY_CATEGORIES[0],
                  }))
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
                <label className="form-label" htmlFor="galleryImage">
                  Gallery Image
                </label>
                <input
                  id="galleryImage"
                  type="file"
                  accept="image/*"
                  className="form-control admin_file_input"
                  onChange={onFileSelect}
                />
                {uploading && <small className="text-muted d-block mt-1">Uploading...</small>}
                {uploadError && <small className="text-danger d-block mt-1">{uploadError}</small>}
                {errors.image && (
                  <small className="text-danger d-block mt-1">{errors.image}</small>
                )}
              </div>
            </Col>
            <Col md={12}>
              <div className="admin_image_preview">
                <Image
                  src={previewSrc}
                  alt="Gallery preview"
                  width={160}
                  height={200}
                  className="admin_hero_preview_image"
                  unoptimized={previewSrc.startsWith("http")}
                />
              </div>
            </Col>
            <Col md={12}>
              <div className="d-flex gap-2 flex-wrap">
                <CommonButton type="submit" className="admin_primary_btn" disabled={saving}>
                  {editingId ? "Update Item" : "Add to Gallery"}
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
          {items.map((item) => {
            const thumbSrc = item.image?.trim() || "/images/kide_war1.png";
            return (
              <tr key={item.id}>
                <td>
                  <Image
                    src={thumbSrc}
                    alt={item.title || item.category}
                    width={54}
                    height={68}
                    className="admin_table_image admin_hero_table_image"
                    unoptimized={thumbSrc.startsWith("http")}
                  />
                </td>
                <td>
                  <strong>{item.title || "—"}</strong>
                  <small className="d-block text-muted">{item.category}</small>
                </td>
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

      <AdminDeleteConfirmModal
        show={!!deleteId}
        heading="Delete Gallery Item"
        message="Delete this gallery image? This cannot be undone."
        onClose={() => setDeleteId(null)}
        onConfirm={onConfirmDelete}
      />
    </section>
  );
}
