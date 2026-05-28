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
import { STATUS_OPTIONS, CATEGORY_TABLE_FIELDS } from "@/components/admin/designStudio/constants";
import { FALLBACK_IMAGE } from "@/components/admin/designStudio/types";
import type { DesignStudioAdminApi } from "@/components/admin/designStudio/useDesignStudioAdmin";

type Props = { studio: DesignStudioAdminApi };

const CategoriesTab: React.FC<Props> = ({ studio }) => {
  const {
    editingCategoryId, onCategorySubmit, categoryForm, setCategoryForm, categoryErrors,
    uploadingCategoryImage, onCategoryImageUpload, categoryImagePreview, savingCategory,
    resetCategoryForm, categories, categoriesLoading, fillCategoryForm, setDeleteCategoryId,
  } = studio;

  return (
    <>
          <Card className="admin_card p-3 mb-4">
            <form
              key={editingCategoryId ?? "new-category"}
              className="admin_form"
              onSubmit={onCategorySubmit}
            >
              <Row className="g-3">
                <Col md={4}>
                  <InputField
                    label="Name"
                    name="name"
                    value={categoryForm.name}
                    error={categoryErrors.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCategoryForm((prev) => ({
                        ...prev,
                        name,
                        slug: editingCategoryId ? prev.slug : createSlug(name),
                      }));
                    }}
                  />
                </Col>
                <Col md={4}>
                  <InputField
                    label="Slug"
                    name="slug"
                    value={categoryForm.slug}
                    onChange={(e) =>
                      setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))
                    }
                  />
                </Col>
                <Col md={4}>
                  <InputField
                    label="Display Order"
                    name="displayOrder"
                    type="number"
                    value={categoryForm.displayOrder}
                    onChange={(e) =>
                      setCategoryForm((prev) => ({ ...prev, displayOrder: e.target.value }))
                    }
                  />
                </Col>
                <Col md={12}>
                  <TextareaField
                    label="Description"
                    name="description"
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </Col>
                <Col md={6}>
                  <div className="input_group">
                    <label className="form-label" htmlFor="categoryImage">
                      Category Image
                    </label>
                    <input
                      id="categoryImage"
                      type="file"
                      accept="image/*"
                      className="form-control admin_file_input"
                      onChange={onCategoryImageUpload}
                    />
                    {uploadingCategoryImage && (
                      <small className="text-muted d-block mt-1">Uploading…</small>
                    )}
                  </div>
                </Col>
                <Col md={6}>
                  <SelectField
                    name="categoryStatus"
                    label="Status"
                    value={categoryForm.isActive ? "active" : "inactive"}
                    options={STATUS_OPTIONS}
                    onChange={(opt) =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        isActive: opt?.value === "active",
                      }))
                    }
                  />
                </Col>
                <Col md={12}>
                  <div className="admin_image_preview">
                    <Image
                      src={categoryImagePreview}
                      alt="Category preview"
                      width={120}
                      height={150}
                      className="admin_hero_preview_image"
                      unoptimized={categoryImagePreview.startsWith("http")}
                    />
                  </div>
                </Col>
                <Col md={12}>
                  <div className="d-flex gap-2 flex-wrap">
                    <CommonButton
                      type="submit"
                      className="admin_primary_btn"
                      disabled={savingCategory}
                    >
                      {editingCategoryId ? "Update Category" : "Add Category"}
                    </CommonButton>
                    {editingCategoryId && (
                      <CommonButton
                        type="button"
                        className="admin_outline_btn"
                        onClick={resetCategoryForm}
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
              fields={CATEGORY_TABLE_FIELDS}
              lastColumnWidth="220px"
              loader={categoriesLoading}
            >
              {categories.map((category) => {
                const imgSrc = category.image?.trim() || FALLBACK_IMAGE;
                return (
                  <tr key={category.id}>
                    <td>
                      <Image
                        src={imgSrc}
                        alt={category.name}
                        width={54}
                        height={68}
                        className="admin_table_image admin_hero_table_image"
                        unoptimized={imgSrc.startsWith("http")}
                      />
                    </td>
                    <td>
                      <strong>{category.name}</strong>
                    </td>
                    <td>
                      <small className="text-muted">{category.slug}</small>
                    </td>
                    <td>
                      <small className="d-block">
                        {category.subcategoryCount ?? 0} sub · {category.designCount ?? 0} designs
                      </small>
                    </td>
                    <td>
                      <span
                        className={`admin_status_badge ${category.isActive ? "active" : "inactive"}`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{category.displayOrder}</td>
                    <td>{formatAdminDate(category.createdAt)}</td>
                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        <CommonButton
                          className="admin_outline_btn admin_sm_btn"
                          onClick={() => fillCategoryForm(category)}
                        >
                          Edit
                        </CommonButton>
                        <CommonButton
                          className="admin_danger_btn admin_sm_btn"
                          onClick={() => setDeleteCategoryId(category.id)}
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

export default CategoriesTab;
