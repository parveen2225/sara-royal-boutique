"use client";

import React from "react";
import Image from "next/image";
import { Card, Col, Row } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import InputField from "@/components/common/formik/inputField/InputField";
import SelectField from "@/components/common/formik/selectField/SelectField";
import TextareaField from "@/components/common/formik/textareaField/TextareaField";
import CheckboxField from "@/components/common/formik/checkboxField/CheckboxField";
import { createSlug } from "@/lib/api/utils";
import { formatAdminDate } from "@/lib/api/listData";
import { STATUS_OPTIONS, SUBCATEGORY_TABLE_FIELDS } from "@/components/admin/designStudio/constants";
import { FALLBACK_IMAGE } from "@/components/admin/designStudio/types";
import type { DesignStudioAdminApi } from "@/components/admin/designStudio/useDesignStudioAdmin";
import type { DesignSubcategory } from "@/lib/admin/types";


type Props = { studio: DesignStudioAdminApi };

const SubcategoriesTab: React.FC<Props> = ({ studio }) => {
  const {
    editingSubcategoryId, onSubcategorySubmit, subcategoryForm, setSubcategoryForm, subcategoryErrors,
    subcategoryFormCategoryOptions, uploadingSubcategoryImage, onSubcategoryImageUpload,
    subcategoryImagePreview, savingSubcategory, resetSubcategoryForm, subcategories,
    subcategoriesLoading, categories, fillSubcategoryForm, setDeleteSubcategoryId,
  } = studio;

  return (
    <>
      <Card className="admin_card p-3 mb-4">
        <form
          key={editingSubcategoryId ?? "new-subcategory"}
              className="admin_form"
              onSubmit={onSubcategorySubmit}
            >
              <Row className="g-3">
                <Col md={4}>
                  <SelectField
                    name="subcategoryCategoryId"
                    label="Category"
                    value={subcategoryForm.categoryId}
                    options={subcategoryFormCategoryOptions}
                    placeholder={
                      subcategoryFormCategoryOptions.length
                        ? "Select category"
                        : "No categories"
                    }
                    error={subcategoryErrors.categoryId}
                    onChange={(opt) =>
                      setSubcategoryForm((prev) => ({
                        ...prev,
                        categoryId: String(opt?.value ?? ""),
                      }))
                    }
                  />
                </Col>
                <Col md={4}>
                  <InputField
                    label="Name"
                    name="name"
                    value={subcategoryForm.name}
                    error={subcategoryErrors.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setSubcategoryForm((prev) => ({
                        ...prev,
                        name,
                        slug: editingSubcategoryId ? prev.slug : createSlug(name),
                      }));
                    }}
                  />
                </Col>
                <Col md={4}>
                  <InputField
                    label="Slug"
                    name="slug"
                    value={subcategoryForm.slug}
                    onChange={(e) =>
                      setSubcategoryForm((prev) => ({ ...prev, slug: e.target.value }))
                    }
                  />
                </Col>
                <Col md={4}>
                  <InputField
                    label="Display Order"
                    name="displayOrder"
                    type="number"
                    value={subcategoryForm.displayOrder}
                    onChange={(e) =>
                      setSubcategoryForm((prev) => ({ ...prev, displayOrder: e.target.value }))
                    }
                  />
                </Col>
                <Col md={8}>
                  <TextareaField
                    label="Description"
                    name="description"
                    value={subcategoryForm.description}
                    onChange={(e) =>
                      setSubcategoryForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </Col>
                <Col md={6}>
                  <div className="input_group">
                    <label className="form-label" htmlFor="subcategoryImage">
                      Subcategory Image
                    </label>
                    <input
                      id="subcategoryImage"
                      type="file"
                      accept="image/*"
                      className="form-control admin_file_input"
                      onChange={onSubcategoryImageUpload}
                    />
                    {uploadingSubcategoryImage && (
                      <small className="text-muted d-block mt-1">Uploading…</small>
                    )}
                  </div>
                </Col>
                <Col md={6}>
                  <SelectField
                    name="subcategoryStatus"
                    label="Status"
                    value={subcategoryForm.isActive ? "active" : "inactive"}
                    options={STATUS_OPTIONS}
                    onChange={(opt) =>
                      setSubcategoryForm((prev) => ({
                        ...prev,
                        isActive: opt?.value === "active",
                      }))
                    }
                  />
                </Col>
                <Col md={12}>
                  <div className="admin_image_preview">
                    <Image
                      src={subcategoryImagePreview}
                      alt="Subcategory preview"
                      width={120}
                      height={150}
                      className="admin_hero_preview_image"
                      unoptimized={subcategoryImagePreview.startsWith("http")}
                    />
                  </div>
                </Col>
                <Col md={12}>
                  <div className="d-flex gap-2 flex-wrap">
                    <CommonButton
                      type="submit"
                      className="admin_primary_btn"
                      disabled={savingSubcategory}
                    >
                      {editingSubcategoryId ? "Update Subcategory" : "Add Subcategory"}
                    </CommonButton>
                    {editingSubcategoryId && (
                      <CommonButton
                        type="button"
                        className="admin_outline_btn"
                        onClick={resetSubcategoryForm}
                      >
                        Cancel
                      </CommonButton>
                    )}
                  </div>
                </Col>
              </Row>
            </form>
          </Card>

          <div className="admin_table_scroll">
            <CommonTable
              fields={SUBCATEGORY_TABLE_FIELDS}
              lastColumnWidth="220px"
              loader={subcategoriesLoading}
            >
              {subcategories.map((sub) => {
                const imgSrc = sub.image?.trim() || FALLBACK_IMAGE;
                const categoryLabel =
                  sub.categoryName ||
                  categories.find((c) => c.id === sub.categoryId)?.name ||
                  "—";
                return (
                  <tr key={sub.id}>
                    <td>
                      <Image
                        src={imgSrc}
                        alt={sub.name}
                        width={54}
                        height={68}
                        className="admin_table_image admin_hero_table_image"
                        unoptimized={imgSrc.startsWith("http")}
                      />
                    </td>
                    <td>
                      <strong>{sub.name}</strong>
                      <small className="d-block text-muted">{sub.slug}</small>
                    </td>
                    <td>{categoryLabel}</td>
                    <td>
                      <span
                        className={`admin_status_badge ${sub.isActive ? "active" : "inactive"}`}
                      >
                        {sub.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{sub.displayOrder}</td>
                    <td>{formatAdminDate(sub.createdAt)}</td>
                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        <CommonButton
                          className="admin_outline_btn admin_sm_btn"
                          onClick={() => fillSubcategoryForm(sub)}
                        >
                          Edit
                        </CommonButton>
                        <CommonButton
                          className="admin_danger_btn admin_sm_btn"
                          onClick={() => setDeleteSubcategoryId(sub.id)}
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
    </>
  );
};

export default SubcategoriesTab;
