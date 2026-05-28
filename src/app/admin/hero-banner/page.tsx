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
import TextareaField from "@/components/common/formik/textareaField/TextareaField";
import { type HeroBanner } from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { HERO_BANNER } from "@/lib/api/urls";
import { uploadImages } from "@/lib/api/upload";

const TABLE_FIELDS = [
  { label: "Preview", key: "preview" },
  { label: "Title", key: "title" },
  { label: "Status", key: "status" },
  { label: "Actions", key: "actions" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const emptyForm = {
  title: "",
  subtitle: "",
  image: "",
  imageName: "",
  buttonText: "",
  buttonLink: "",
  isActive: true,
};

type HeroBannerFormState = typeof emptyForm;

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Something went wrong.";
};

export default function AdminHeroBannerPage() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HeroBannerFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);

  const previewSrc = useMemo(
    () => form.image || "/images/kide_war1.png",
    [form.image],
  );

  const loadBanners = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await apiJson<HeroBanner[]>(HERO_BANNER.LIST, { skipLoader: true });
      setBanners(res.data);
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to load hero banners.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners().catch(() => {});
  }, [loadBanners]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setUploadError("");
  };

  const fillForm = (banner: HeroBanner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle,
      image: banner.image,
      imageName: "",
      buttonText: banner.buttonText,
      buttonLink: banner.buttonLink,
      isActive: banner.isActive,
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
    if (!form.image) next.image = "Hero banner image is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      image: form.image,
      buttonText: form.buttonText.trim(),
      buttonLink: form.buttonLink.trim(),
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiJson<HeroBanner>(HERO_BANNER.UPDATE, {
          method: "PUT",
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        await apiJson<HeroBanner>(HERO_BANNER.CREATE, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await loadBanners();
      resetForm();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to save hero banner.");
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await apiJson(`${HERO_BANNER.DELETE}?id=${encodeURIComponent(deleteId)}`, {
        method: "DELETE",
      });
      await loadBanners();
      if (editingId === deleteId) resetForm();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to delete hero banner.");
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (banner: HeroBanner) => {
    try {
      await apiJson<HeroBanner>(HERO_BANNER.UPDATE, {
        method: "PUT",
        body: JSON.stringify({
          id: banner.id,
          title: banner.title,
          subtitle: banner.subtitle,
          image: banner.image,
          buttonText: banner.buttonText,
          buttonLink: banner.buttonLink,
          isActive: !banner.isActive,
        }),
      });
      await loadBanners();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to update banner status.");
    }
  };

  return (
    <section>
      <div className="admin_section_header">
        <h4 className="mb-0">Hero Banner</h4>
        <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => loadBanners()}>
          Refresh
        </CommonButton>
      </div>

      {loadError && <div className="admin_error_banner mb-3">{loadError}</div>}

      <Card className="admin_card p-3 mb-4">
        <form key={editingId ?? "new"} className="admin_form" onSubmit={onSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <InputField
                label="Heading (optional)"
                name="title"
                placeholder="e.g. Kids Wear"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </Col>
            <Col md={6}>
              <InputField
                label="CTA Button Text (optional)"
                name="buttonText"
                placeholder="e.g. Order on WhatsApp"
                value={form.buttonText}
                onChange={(e) => setForm((prev) => ({ ...prev, buttonText: e.target.value }))}
              />
            </Col>
            <Col md={12}>
              <TextareaField
                label="Subheading (optional)"
                name="subtitle"
                placeholder="e.g. Elegant Stitching. Made Just for Them."
                value={form.subtitle}
                rows={2}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    subtitle: (e as unknown as React.ChangeEvent<HTMLTextAreaElement>).target
                      .value,
                  }))
                }
              />
            </Col>
            <Col md={6}>
              <InputField
                label="CTA Button Link (optional)"
                name="buttonLink"
                placeholder="https://wa.me/..."
                value={form.buttonLink}
                onChange={(e) => setForm((prev) => ({ ...prev, buttonLink: e.target.value }))}
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
              <div className="input_group">
                <label className="form-label" htmlFor="heroBannerImage">
                  Hero Image
                </label>
                <input
                  id="heroBannerImage"
                  type="file"
                  accept="image/*"
                  className="form-control admin_file_input"
                  onChange={onFileSelect}
                />
                {uploading && <small className="text-muted d-block mt-1">Uploading...</small>}
                {uploadError && <small className="text-danger d-block mt-1">{uploadError}</small>}
                {errors.image && <small className="text-danger d-block mt-1">{errors.image}</small>}
                {form.imageName && (
                  <small className="text-muted d-block mt-1">Selected: {form.imageName}</small>
                )}
              </div>
            </Col>
            <Col md={12}>
              <div className="admin_image_preview admin_service_preview">
                <Image
                  src={previewSrc}
                  alt="Hero banner preview"
                  width={220}
                  height={280}
                  className="admin_hero_preview_image"
                  unoptimized={previewSrc.startsWith("http")}
                />
              </div>
            </Col>
            <Col md={12}>

              <div className="d-flex gap-2 flex-wrap">
                <CommonButton type="submit" className="admin_primary_btn" disabled={saving}>
                  {editingId ? "Update Banner" : "Add Banner"}
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

      <CommonTable fields={TABLE_FIELDS} lastColumnWidth="220px" loader={isLoading}>
        {banners.map((banner) => (
          <tr key={banner.id}>
            <td>
              <Image
                src={banner.image}
                alt={banner.title || "Hero banner"}
                width={72}
                height={96}
                className="admin_table_image admin_hero_table_image"
                unoptimized={banner.image.startsWith("http")}
              />
            </td>
            <td>
              <strong>{banner.title || "—"}</strong>
              {banner.subtitle && (
                <small className="d-block text-muted">{banner.subtitle}</small>
              )}
            </td>
            <td>
              <span className={`admin_status_badge ${banner.isActive ? "active" : "inactive"}`}>
                {banner.isActive ? "Active" : "Inactive"}
              </span>
            </td>
            <td>
              <div className="d-flex gap-2">
                <CommonButton
                  className="admin_outline_btn admin_sm_btn"
                  onClick={() => fillForm(banner)}
                >
                  Edit
                </CommonButton>
                <CommonButton
                  className="admin_outline_btn admin_sm_btn"
                  onClick={() => toggleActive(banner)}
                >
                  {banner.isActive ? "Deactivate" : "Activate"}
                </CommonButton>
                <CommonButton
                  className="admin_danger_btn admin_sm_btn"
                  onClick={() => setDeleteId(banner.id)}
                >
                  Delete
                </CommonButton>
              </div>
            </td>
          </tr>
        ))}
      </CommonTable>

      <AdminDeleteConfirmModal
        show={!!deleteId}
        heading="Delete Hero Banner"
        message="Are you sure you want to delete this hero banner? This action cannot be undone."
        onClose={() => setDeleteId(null)}
        onConfirm={onConfirmDelete}
      />
    </section>
  );
}

