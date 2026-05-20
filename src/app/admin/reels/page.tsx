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
import { type Reel } from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { extractListData, formatAdminDate } from "@/lib/api/listData";
import { REELS } from "@/lib/api/urls";
import { uploadImages } from "@/lib/api/upload";

const TABLE_FIELDS = [
  { label: "Preview", key: "preview" },
  { label: "Title", key: "title" },
  { label: "Created", key: "created" },
  { label: "Status", key: "status" },
  { label: "Actions", key: "actions" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const emptyForm = {
  title: "",
  instagramUrl: "",
  thumbnail: "",
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

export default function AdminReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
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
    () => form.thumbnail || "/images/kide_war1.png",
    [form.thumbnail],
  );

  const loadReels = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await apiJson<Reel[]>(REELS.LIST, { skipLoader: true });
      setReels(extractListData<Reel>(res.data));
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to load reels.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReels().catch(() => {});
  }, [loadReels]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setUploadError("");
  };

  const fillForm = (reel: Reel) => {
    setEditingId(reel.id);
    setForm({
      title: reel.title,
      instagramUrl: reel.instagramUrl,
      thumbnail: reel.thumbnail,
      imageName: "",
      sortOrder: String(reel.sortOrder),
      isActive: reel.isActive,
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
        setForm((prev) => ({ ...prev, thumbnail: urls[0] || "", imageName: file.name }));
      })
      .catch((error: unknown) => {
        setUploadError(error instanceof Error ? error.message : "Image upload failed");
      })
      .finally(() => setUploading(false));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Title is required.";
    if (!form.instagramUrl.trim()) next.instagramUrl = "Instagram URL is required.";
    if (!form.thumbnail) next.thumbnail = "Thumbnail is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      title: form.title.trim(),
      instagramUrl: form.instagramUrl.trim(),
      thumbnail: form.thumbnail,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editingId) {
        await apiJson<Reel>(REELS.UPDATE, {
          method: "PUT",
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        await apiJson<Reel>(REELS.CREATE, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await loadReels();
      resetForm();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to save reel.");
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await apiJson(`${REELS.DELETE}?id=${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      await loadReels();
      if (editingId === deleteId) resetForm();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to delete reel.");
    } finally {
      setDeleteId(null);
    }
  };

  const toggleActive = async (reel: Reel) => {
    try {
      await apiJson<Reel>(REELS.UPDATE, {
        method: "PUT",
        body: JSON.stringify({
          id: reel.id,
          title: reel.title,
          instagramUrl: reel.instagramUrl,
          thumbnail: reel.thumbnail,
          sortOrder: reel.sortOrder,
          isActive: !reel.isActive,
        }),
      });
      await loadReels();
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to update reel status.");
    }
  };

  return (
    <section>
      <div className="admin_section_header">
        <h4 className="mb-0">Reels Manager</h4>
        <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => loadReels()}>
          Refresh
        </CommonButton>
      </div>

      {loadError && <div className="admin_error_banner mb-3">{loadError}</div>}

      <Card className="admin_card p-3 mb-4">
        <form key={editingId ?? "new"} className="admin_form" onSubmit={onSubmit}>
          <Row className="g-3">
            <Col md={6}>
              <InputField
                label="Reel Title"
                name="title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                error={errors.title}
              />
            </Col>
            <Col md={6}>
              <InputField
                label="Instagram Reel URL"
                name="instagramUrl"
                placeholder="https://www.instagram.com/reel/..."
                value={form.instagramUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value }))}
                error={errors.instagramUrl}
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
            <Col md={6}>
              <div className="input_group">
                <label className="form-label" htmlFor="reelThumbnail">
                  Thumbnail Image
                </label>
                <input
                  id="reelThumbnail"
                  type="file"
                  accept="image/*"
                  className="form-control admin_file_input"
                  onChange={onFileSelect}
                />
                {uploading && <small className="text-muted d-block mt-1">Uploading...</small>}
                {uploadError && <small className="text-danger d-block mt-1">{uploadError}</small>}
                {errors.thumbnail && (
                  <small className="text-danger d-block mt-1">{errors.thumbnail}</small>
                )}
              </div>
            </Col>
            <Col md={12}>
              <div className="admin_image_preview">
                <Image
                  src={previewSrc}
                  alt="Reel thumbnail preview"
                  width={120}
                  height={180}
                  className="admin_hero_preview_image"
                  unoptimized={previewSrc.startsWith("http")}
                />
              </div>
            </Col>
            <Col md={12}>
              <div className="d-flex gap-2 flex-wrap">
                <CommonButton type="submit" className="admin_primary_btn" disabled={saving}>
                  {editingId ? "Update Reel" : "Add Reel"}
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
          {reels.map((reel) => {
            const thumbSrc = reel.thumbnail?.trim() || "/images/kide_war1.png";
            return (
              <tr key={reel.id}>
                <td>
                  <Image
                    src={thumbSrc}
                    alt={reel.title}
                    width={54}
                    height={80}
                    className="admin_table_image admin_hero_table_image"
                    unoptimized={thumbSrc.startsWith("http")}
                  />
                </td>
                <td>
                  <strong>{reel.title}</strong>
                  <small className="d-block text-muted text-truncate" style={{ maxWidth: 200 }}>
                    {reel.instagramUrl}
                  </small>
                </td>
                <td>{formatAdminDate(reel.createdAt)}</td>
                <td>
                  <span className={`admin_status_badge ${reel.isActive ? "active" : "inactive"}`}>
                    {reel.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="d-flex gap-2">
                    <CommonButton
                      className="admin_outline_btn admin_sm_btn"
                      onClick={() => fillForm(reel)}
                    >
                      Edit
                    </CommonButton>
                    <CommonButton
                      className="admin_outline_btn admin_sm_btn"
                      onClick={() => toggleActive(reel)}
                    >
                      {reel.isActive ? "Deactivate" : "Activate"}
                    </CommonButton>
                    <CommonButton
                      className="admin_danger_btn admin_sm_btn"
                      onClick={() => setDeleteId(reel.id)}
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
        heading="Delete Reel"
        backdrop="static"
        className="admin_delete_modal"
      >
        <p className="admin_modal_msg">Delete this reel? This cannot be undone.</p>
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
