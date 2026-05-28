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
import { STATUS_OPTIONS, DESIGN_TABLE_FIELDS } from "@/components/admin/designStudio/constants";
import { FALLBACK_IMAGE } from "@/components/admin/designStudio/types";
import type { DesignStudioAdminApi } from "@/components/admin/designStudio/useDesignStudioAdmin";

type Props = { studio: DesignStudioAdminApi };

function renderDesignBadges(design: import("@/lib/admin/types").StudioDesign) {
  return (
    <div className="d-flex flex-wrap gap-1">
      {design.featured && <span className="admin_status_badge active" style={{ fontSize: "0.65rem" }}>Featured</span>}
      {design.trending && <span className="admin_status_badge active" style={{ fontSize: "0.65rem" }}>Trending</span>}
      {design.newArrival && <span className="admin_status_badge active" style={{ fontSize: "0.65rem" }}>New</span>}
      {design.bridalSpecial && <span className="admin_status_badge active" style={{ fontSize: "0.65rem" }}>Bridal</span>}
      {design.homepageShow && <span className="admin_status_badge active" style={{ fontSize: "0.65rem" }}>Home</span>}
      {!design.featured && !design.trending && !design.newArrival && !design.bridalSpecial && !design.homepageShow && (
        <span className="text-muted">—</span>
      )}
    </div>
  );
}

const DesignsTab: React.FC<Props> = ({ studio }) => {
  const {
    editingDesignId, onDesignSubmit, designForm, setDesignForm, designErrors,
    categoryOptions, formSubcategoryOptions, uploadingThumb, onThumbnailUpload,
    uploadingGallery, onGalleryUpload, uploadError, designThumbPreview,
    moveGalleryImage, removeGalleryImage, savingDesign, resetDesignForm,
    designs, designsLoading, fillDesignForm, openDesignPreview, duplicatingId, onDuplicateDesign,
    setDeleteDesignId,
  } = studio;

  return (
    <>
      <Card className="admin_card p-3 mb-4">
        <form key={editingDesignId ?? "new-design"} className="admin_form" onSubmit={onDesignSubmit}>
              <Row className="g-3">
                <Col md={6}>
                  <InputField
                    label="Title"
                    name="title"
                    value={designForm.title}
                    error={designErrors.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setDesignForm((prev) => ({
                        ...prev,
                        title,
                        slug: editingDesignId ? prev.slug : createSlug(title),
                      }));
                    }}
                  />
                </Col>
                <Col md={6}>
                  <InputField
                    label="Slug"
                    name="slug"
                    value={designForm.slug}
                    onChange={(e) => setDesignForm((prev) => ({ ...prev, slug: e.target.value }))}
                  />
                </Col>
                <Col md={4}>
                  <SelectField
                    name="categoryId"
                    label="Category"
                    value={designForm.categoryId}
                    options={categoryOptions}
                    placeholder={categoryOptions.length ? "Select category" : "No categories"}
                    error={designErrors.categoryId}
                    onChange={(opt) =>
                      setDesignForm((prev) => ({
                        ...prev,
                        categoryId: String(opt?.value ?? ""),
                        subcategoryId: "",
                      }))
                    }
                  />
                </Col>
                <Col md={4}>
                  <SelectField
                    name="subcategoryId"
                    label="Subcategory"
                    value={designForm.subcategoryId}
                    options={formSubcategoryOptions}
                    placeholder={
                      designForm.categoryId ? "Select subcategory" : "Select category first"
                    }
                    error={designErrors.subcategoryId}
                    onChange={(opt) =>
                      setDesignForm((prev) => ({
                        ...prev,
                        subcategoryId: String(opt?.value ?? ""),
                      }))
                    }
                  />
                </Col>
                <Col md={4}>
                  <InputField
                    label="Display Order"
                    name="displayOrder"
                    type="number"
                    value={designForm.displayOrder}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, displayOrder: e.target.value }))
                    }
                  />
                </Col>
                <Col md={6}>
                  <TextareaField
                    label="Short Description"
                    name="shortDescription"
                    value={designForm.shortDescription}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, shortDescription: e.target.value }))
                    }
                  />
                </Col>
                <Col md={6}>
                  <TextareaField
                    label="Full Description"
                    name="fullDescription"
                    value={designForm.fullDescription}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, fullDescription: e.target.value }))
                    }
                  />
                </Col>
                <Col md={4}>
                  <InputField
                    label="Stitching Price"
                    name="stitchingPrice"
                    value={designForm.stitchingPrice}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, stitchingPrice: e.target.value }))
                    }
                  />
                </Col>
                <Col md={4}>
                  <InputField
                    label="Fabric Recommendation"
                    name="fabricRecommendation"
                    value={designForm.fabricRecommendation}
                    onChange={(e) =>
                      setDesignForm((prev) => ({
                        ...prev,
                        fabricRecommendation: e.target.value,
                      }))
                    }
                  />
                </Col>
                <Col md={4}>
                  <InputField
                    label="Delivery Timeline"
                    name="deliveryTimeline"
                    value={designForm.deliveryTimeline}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, deliveryTimeline: e.target.value }))
                    }
                  />
                </Col>
                <Col md={12}>
                  <InputField
                    label="Tags (comma-separated)"
                    name="tags"
                    value={designForm.tags}
                    onChange={(e) => setDesignForm((prev) => ({ ...prev, tags: e.target.value }))}
                  />
                </Col>
                <Col md={6}>
                  <div className="input_group">
                    <label className="form-label" htmlFor="designThumbnail">
                      Thumbnail Image
                    </label>
                    <input
                      id="designThumbnail"
                      type="file"
                      accept="image/*"
                      className="form-control admin_file_input"
                      onChange={onThumbnailUpload}
                    />
                    {uploadingThumb && (
                      <small className="text-muted d-block mt-1">Uploading thumbnail…</small>
                    )}
                    {designErrors.thumbnailImage && (
                      <small className="text-danger d-block mt-1">{designErrors.thumbnailImage}</small>
                    )}
                  </div>
                </Col>
                <Col md={6}>
                  <div className="input_group">
                    <label className="form-label" htmlFor="designGallery">
                      Gallery Images
                    </label>
                    <input
                      id="designGallery"
                      type="file"
                      accept="image/*"
                      multiple
                      className="form-control admin_file_input"
                      onChange={onGalleryUpload}
                    />
                    {uploadingGallery && (
                      <small className="text-muted d-block mt-1">Uploading gallery…</small>
                    )}
                  </div>
                </Col>
                {uploadError && (
                  <Col md={12}>
                    <small className="text-danger">{uploadError}</small>
                  </Col>
                )}
                <Col md={12}>
                  <div className="admin_image_preview">
                    <Image
                      src={designThumbPreview}
                      alt="Thumbnail preview"
                      width={120}
                      height={150}
                      className="admin_hero_preview_image"
                      unoptimized={designThumbPreview.startsWith("http")}
                    />
                  </div>
                </Col>
                {designForm.galleryImages.length > 0 && (
                  <Col md={12}>
                    <Row className="g-2">
                      {designForm.galleryImages.map((src, index) => (
                        <Col key={`${src}-${index}`} xs={6} sm={4} md={3} lg={2}>
                          <div className="admin_gallery_sort_item admin_card p-2">
                            <Image
                              src={src || FALLBACK_IMAGE}
                              alt={`Gallery ${index + 1}`}
                              width={80}
                              height={100}
                              className="admin_table_image admin_hero_table_image mb-2"
                              unoptimized={src.startsWith("http")}
                            />
                            <div className="d-flex gap-1 justify-content-center flex-wrap">
                              <CommonButton
                                type="button"
                                className="admin_outline_btn admin_sm_btn"
                                disabled={index === 0}
                                onClick={() => moveGalleryImage(index, -1)}
                              >
                                ↑
                              </CommonButton>
                              <CommonButton
                                type="button"
                                className="admin_outline_btn admin_sm_btn"
                                disabled={index === designForm.galleryImages.length - 1}
                                onClick={() => moveGalleryImage(index, 1)}
                              >
                                ↓
                              </CommonButton>
                              <CommonButton
                                type="button"
                                className="admin_danger_btn admin_sm_btn"
                                onClick={() => removeGalleryImage(index)}
                              >
                                ×
                              </CommonButton>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Col>
                )}
                <Col xs={6} md={4}>
                  <CheckboxField
                    label="Featured"
                    name="featured"
                    value={designForm.featured}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, featured: e.target.checked }))
                    }
                  />
                </Col>
                <Col xs={6} md={4}>
                  <CheckboxField
                    label="Trending"
                    name="trending"
                    value={designForm.trending}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, trending: e.target.checked }))
                    }
                  />
                </Col>
                <Col xs={6} md={4}>
                  <CheckboxField
                    label="New Arrival"
                    name="newArrival"
                    value={designForm.newArrival}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, newArrival: e.target.checked }))
                    }
                  />
                </Col>
                <Col xs={6} md={4}>
                  <CheckboxField
                    label="Bridal Special"
                    name="bridalSpecial"
                    value={designForm.bridalSpecial}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, bridalSpecial: e.target.checked }))
                    }
                  />
                </Col>
                <Col xs={6} md={4}>
                  <CheckboxField
                    label="Homepage"
                    name="homepageShow"
                    value={designForm.homepageShow}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, homepageShow: e.target.checked }))
                    }
                  />
                </Col>
                <Col xs={6} md={4}>
                  <SelectField
                    name="activeStatus"
                    label="Status"
                    value={designForm.activeStatus ? "active" : "inactive"}
                    options={STATUS_OPTIONS}
                    onChange={(opt) =>
                      setDesignForm((prev) => ({
                        ...prev,
                        activeStatus: opt?.value === "active",
                      }))
                    }
                  />
                </Col>
                <Col md={4}>
                  <InputField
                    label="SEO Title"
                    name="seoTitle"
                    value={designForm.seoTitle}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, seoTitle: e.target.value }))
                    }
                  />
                </Col>
                <Col md={4}>
                  <InputField
                    label="SEO Keywords"
                    name="seoKeywords"
                    value={designForm.seoKeywords}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, seoKeywords: e.target.value }))
                    }
                  />
                </Col>
                <Col md={12}>
                  <TextareaField
                    label="SEO Description"
                    name="seoDescription"
                    value={designForm.seoDescription}
                    onChange={(e) =>
                      setDesignForm((prev) => ({ ...prev, seoDescription: e.target.value }))
                    }
                  />
                </Col>
                <Col md={12}>
                  <div className="d-flex gap-2 flex-wrap">
                    <CommonButton type="submit" className="admin_primary_btn" disabled={savingDesign}>
                      {editingDesignId ? "Update Design" : "Add Design"}
                    </CommonButton>
                    {editingDesignId && (
                      <CommonButton type="button" className="admin_outline_btn" onClick={resetDesignForm}>
                        Cancel
                      </CommonButton>
                    )}
                  </div>
                </Col>
              </Row>
            </form>
          </Card>

          <div className="admin_table_scroll">
            <CommonTable fields={DESIGN_TABLE_FIELDS} lastColumnWidth="320px" loader={designsLoading}>
              {designs.map((design) => {
                const thumbSrc = design.thumbnailImage?.trim() || FALLBACK_IMAGE;
                return (
                  <tr key={design.id}>
                    <td>
                      <Image
                        src={thumbSrc}
                        alt={design.title}
                        width={54}
                        height={68}
                        className="admin_table_image admin_hero_table_image"
                        unoptimized={thumbSrc.startsWith("http")}
                      />
                    </td>
                    <td>
                      <strong>{design.title}</strong>
                      <small className="d-block text-muted">{design.slug}</small>
                    </td>
                    <td>
                      <span>{design.categoryName}</span>
                      <small className="d-block text-muted">{design.subcategoryName}</small>
                    </td>
                    <td>{renderDesignBadges(design)}</td>
                    <td>
                      <span
                        className={`admin_status_badge ${design.activeStatus ? "active" : "inactive"}`}
                      >
                        {design.activeStatus ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{design.stitchingPrice || "—"}</td>
                    <td>{formatAdminDate(design.createdAt)}</td>
                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        <CommonButton
                          className="admin_outline_btn admin_sm_btn"
                          onClick={() => fillDesignForm(design)}
                        >
                          Edit
                        </CommonButton>
                        <CommonButton
                          className="admin_outline_btn admin_sm_btn"
                          onClick={() => openDesignPreview(design)}
                        >
                          Preview
                        </CommonButton>
                        <CommonButton
                          className="admin_outline_btn admin_sm_btn"
                          disabled={duplicatingId === design.id}
                          onClick={() => onDuplicateDesign(design.id)}
                        >
                          {duplicatingId === design.id ? "…" : "Duplicate"}
                        </CommonButton>
                        <CommonButton
                          className="admin_danger_btn admin_sm_btn"
                          onClick={() => setDeleteDesignId(design.id)}
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

export default DesignsTab;
