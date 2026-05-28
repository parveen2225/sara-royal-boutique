"use client";

import { FormEvent, useMemo, useState } from "react";
import React from "react";
import Image from "next/image";
import { Card, Col, Row } from "react-bootstrap";
import { useAdmin } from "@/components/admin/AdminProvider";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import AdminDeleteConfirmModal from "@/components/admin/modal/AdminDeleteConfirmModal/AdminDeleteConfirmModal";
import InputField from "@/components/common/formik/inputField/InputField";
import SelectField from "@/components/common/formik/selectField/SelectField";
import TextareaField from "@/components/common/formik/textareaField/TextareaField";
import { Service } from "@/lib/admin/types";
import { uploadImages } from "@/lib/api/upload";

const FIELDS = [
  { label: "Image", key: "image" },
  { label: "Service", key: "service" },
  { label: "Status", key: "status" },
  { label: "Actions", key: "actions" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const emptyForm = {
  title: "",
  description: "",
  icon: "",
  imageUrl: "",
  imageName: "",
  active: true,
};

type ServiceFormState = typeof emptyForm;

export default function AdminServicesPage() {
  const { state, isLoading, loadError, refreshState, addService, updateService, deleteService } =
    useAdmin();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const previewSrc = useMemo(() => form.imageUrl || "/images/Designer_Suits5.webp", [form.imageUrl]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  };

  const fillForm = (service: Service) => {
    setEditingId(service.id);
    setForm({
      title: service.title,
      description: service.description,
      icon: service.icon,
      imageUrl: service.imageUrl,
      imageName: service.imageName ?? "",
      active: service.active,
    });
    setErrors({});
  };

  const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    uploadImages([file])
      .then((urls) => {
        setForm((prev) => ({ ...prev, imageUrl: urls[0] || "", imageName: file.name }));
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Image upload failed";
        setUploadError(message);
      })
      .finally(() => setUploading(false));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Service title is required.";
    if (!form.description.trim()) next.description = "Description is required.";
    if (!form.icon.trim()) next.icon = "Short icon text is required.";
    if (!form.imageUrl) next.imageUrl = "Service image is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      icon: form.icon.trim().slice(0, 3).toUpperCase(),
      imageUrl: form.imageUrl,
      imageName: form.imageName,
      active: form.active,
    };
    if (editingId) {
      updateService(editingId, payload);
    } else {
      addService(payload);
    }
    resetForm();
  };

  const onConfirmDelete = () => {
    if (!deleteId) return;
    deleteService(deleteId);
    setDeleteId(null);
  };

  return (
    <section>
      <div className="admin_section_header">
        <h4 className="mb-0">Services</h4>
        <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => refreshState()}>
          Refresh
        </CommonButton>
      </div>
      {loadError && <div className="admin_error_banner mb-3">{loadError}</div>}

      <Card className="admin_card p-3 mb-4">
        <form key={editingId ?? "new"} className="admin_form" onSubmit={onSubmit}>
          <Row className="g-3">
            <Col md={4}>
              <InputField
                label="Service Title"
                name="title"
                placeholder="e.g. Suit Stitching"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                error={errors.title}
              />
            </Col>
            <Col md={2}>
              <InputField
                label="Icon Text"
                name="icon"
                placeholder="e.g. SS"
                maxLength={3}
                value={form.icon}
                onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                error={errors.icon}
              />
            </Col>
            <Col md={3}>
              <div className="input_group">
                <label className="form-label" htmlFor="serviceImage">
                  Service Image
                </label>
                <input
                  id="serviceImage"
                  type="file"
                  accept="image/*"
                  className="form-control admin_file_input"
                  onChange={onFileSelect}
                />
                {uploading && <small className="text-muted d-block mt-1">Uploading...</small>}
                {uploadError && <small className="text-danger d-block mt-1">{uploadError}</small>}
                {errors.imageUrl && (
                  <small className="text-danger d-block mt-1">{errors.imageUrl}</small>
                )}
                {form.imageName && (
                  <small className="text-muted d-block mt-1">Selected: {form.imageName}</small>
                )}
              </div>
            </Col>
            <Col md={3}>
              <SelectField
                name="status"
                label="Status"
                value={form.active ? "active" : "inactive"}
                options={STATUS_OPTIONS}
                onChange={(opt) =>
                  setForm((prev) => ({ ...prev, active: opt?.value === "active" }))
                }
              />
            </Col>
            <Col md={8}>
              <TextareaField
                label="Description"
                name="description"
                placeholder="Describe this stitching service..."
                value={form.description}
                rows={3}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: (e as unknown as React.ChangeEvent<HTMLTextAreaElement>).target
                      .value,
                  }))
                }
                error={errors.description}
              />
            </Col>
            <Col md={4}>
              <div className="admin_image_preview admin_service_preview">
                <Image src={previewSrc} alt="Service preview" width={180} height={120} unoptimized />
              </div>
            </Col>
            <Col md={12}>
              <div className="d-flex gap-2 flex-wrap">
                <CommonButton type="submit" className="admin_primary_btn">
                  {editingId ? "Update Service" : "Add Service"}
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

      <CommonTable fields={FIELDS} lastColumnWidth="190px" loader={isLoading}>
        {state.services.map((service) => (
          <tr key={service.id}>
            <td>
              <Image
                src={service.imageUrl}
                alt={service.title}
                width={64}
                height={48}
                className="admin_table_image"
                unoptimized
              />
            </td>
            <td>
              <strong>{service.title}</strong>
              <small className="d-block text-muted">{service.description}</small>
            </td>
            <td>
              <span className={`admin_status_badge ${service.active ? "active" : "inactive"}`}>
                {service.active ? "Active" : "Inactive"}
              </span>
            </td>
            <td>
              <div className="d-flex gap-2">
                <CommonButton
                  className="admin_outline_btn admin_sm_btn"
                  onClick={() => fillForm(service)}
                >
                  Edit
                </CommonButton>
                <CommonButton
                  className="admin_danger_btn admin_sm_btn"
                  onClick={() => setDeleteId(service.id)}
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
        heading="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        onClose={() => setDeleteId(null)}
        onConfirm={onConfirmDelete}
      />
    </section>
  );
}
