"use client";

import React from "react";
import { Card, Col, Row } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import InputField from "@/components/common/formik/inputField/InputField";
import SelectField from "@/components/common/formik/selectField/SelectField";
import CheckboxField from "@/components/common/formik/checkboxField/CheckboxField";
import AdminDeleteConfirmModal from "@/components/admin/modal/AdminDeleteConfirmModal/AdminDeleteConfirmModal";
import { useDesignStudioAdmin } from "@/components/admin/designStudio/useDesignStudioAdmin";
import DesignsTab from "@/components/admin/designStudio/DesignsTab";
import CategoriesTab from "@/components/admin/designStudio/CategoriesTab";
import SubcategoriesTab from "@/components/admin/designStudio/SubcategoriesTab";

const DesignStudioAdmin: React.FC = () => {
  const studio = useDesignStudioAdmin();
  const {
    activeTab,
    setActiveTab,
    loadError,
    seeding,
    onSeed,
    refreshAll,
    designFilters,
    setDesignFilters,
    categorySlugOptions,
    filterSubcategoryOptions,
    loadDesigns,
    deleteDesignId,
    setDeleteDesignId,
    onConfirmDeleteDesign,
    deleteCategoryId,
    setDeleteCategoryId,
    onConfirmDeleteCategory,
    deleteSubcategoryId,
    setDeleteSubcategoryId,
    onConfirmDeleteSubcategory,
  } = studio;

  return (
    <section>
      <div className="admin_section_header">
        <h4 className="mb-0">Design Studio Manager</h4>
        <div className="d-flex gap-2 flex-wrap">
          <CommonButton
            className="admin_outline_btn admin_sm_btn"
            onClick={() => onSeed()}
            disabled={seeding}
          >
            {seeding ? "Seeding…" : "Seed Catalog"}
          </CommonButton>
          <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => refreshAll()}>
            Refresh
          </CommonButton>
        </div>
      </div>

      {loadError && <div className="admin_error_banner mb-3">{loadError}</div>}

      <div className="admin_tab_row mb-4">
        {(
          [
            { id: "designs" as const, label: "Designs" },
            { id: "categories" as const, label: "Categories" },
            { id: "subcategories" as const, label: "Subcategories" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin_tab_btn ${activeTab === tab.id ? "is_active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "designs" && (
        <>
          <Card className="admin_card p-3 mb-3">
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <InputField
                  label="Search"
                  name="search"
                  placeholder="Title or tags"
                  value={designFilters.search}
                  onChange={(e) =>
                    setDesignFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                />
              </Col>
              <Col md={3}>
                <SelectField
                  name="filterCategory"
                  label="Category"
                  value={designFilters.category}
                  options={categorySlugOptions}
                  onChange={(opt) =>
                    setDesignFilters((prev) => ({
                      ...prev,
                      category: String(opt?.value ?? ""),
                      subcategory: "",
                    }))
                  }
                />
              </Col>
              <Col md={3}>
                <SelectField
                  name="filterSubcategory"
                  label="Subcategory"
                  value={designFilters.subcategory}
                  options={filterSubcategoryOptions}
                  placeholder={
                    designFilters.category ? "Select subcategory" : "Select category first"
                  }
                  onChange={(opt) =>
                    setDesignFilters((prev) => ({
                      ...prev,
                      subcategory: String(opt?.value ?? ""),
                    }))
                  }
                />
              </Col>
              <Col md={2}>
                <CommonButton
                  type="button"
                  className="admin_outline_btn admin_sm_btn w-100"
                  onClick={() => loadDesigns()}
                >
                  Apply
                </CommonButton>
              </Col>
              <Col xs={6} md={3}>
                <CheckboxField
                  label="Featured only"
                  name="filterFeatured"
                  value={designFilters.featured}
                  onChange={(e) =>
                    setDesignFilters((prev) => ({ ...prev, featured: e.target.checked }))
                  }
                />
              </Col>
              <Col xs={6} md={3}>
                <CheckboxField
                  label="Trending only"
                  name="filterTrending"
                  value={designFilters.trending}
                  onChange={(e) =>
                    setDesignFilters((prev) => ({ ...prev, trending: e.target.checked }))
                  }
                />
              </Col>
              <Col xs={6} md={3}>
                <CheckboxField
                  label="Bridal only"
                  name="filterBridal"
                  value={designFilters.bridal}
                  onChange={(e) =>
                    setDesignFilters((prev) => ({ ...prev, bridal: e.target.checked }))
                  }
                />
              </Col>
              <Col xs={6} md={3}>
                <CheckboxField
                  label="Active only"
                  name="filterActiveOnly"
                  value={designFilters.activeOnly}
                  onChange={(e) =>
                    setDesignFilters((prev) => ({ ...prev, activeOnly: e.target.checked }))
                  }
                />
              </Col>
            </Row>
          </Card>
          <DesignsTab studio={studio} />
        </>
      )}

      {activeTab === "categories" && <CategoriesTab studio={studio} />}
      {activeTab === "subcategories" && <SubcategoriesTab studio={studio} />}

      <AdminDeleteConfirmModal
        show={!!deleteDesignId}
        heading="Delete Design"
        message="Delete this design? This cannot be undone."
        onClose={() => setDeleteDesignId(null)}
        onConfirm={onConfirmDeleteDesign}
      />

      <AdminDeleteConfirmModal
        show={!!deleteCategoryId}
        heading="Delete Category"
        message="Delete this category and all its subcategories and designs? This cannot be undone."
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={onConfirmDeleteCategory}
      />

      <AdminDeleteConfirmModal
        show={!!deleteSubcategoryId}
        heading="Delete Subcategory"
        message="Delete this subcategory? This cannot be undone."
        onClose={() => setDeleteSubcategoryId(null)}
        onConfirm={onConfirmDeleteSubcategory}
      />
    </section>
  );
};

export default DesignStudioAdmin;
