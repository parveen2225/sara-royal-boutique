"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import React from "react";
import type { DesignCategory, DesignSubcategory, StudioDesign } from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { extractListData } from "@/lib/api/listData";
import { DESIGN_STUDIO } from "@/lib/api/urls";
import { uploadImages } from "@/lib/api/upload";
import {
  type AdminTab,
  type CategoryFormState,
  type DesignFilters,
  type DesignFormState,
  type SubcategoryFormState,
  categoryToFormState,
  createDesignStudioMutations,
  designToFormState,
  emptyCategoryForm,
  emptyDesignFilters,
  emptyDesignForm,
  emptySubcategoryForm,
  FALLBACK_IMAGE,
  getErrorMessage,
  subcategoryToFormState,
  fetchAdminList,
  uploadOneFile,
} from "@/components/admin/designStudio/types";

export function useDesignStudioAdmin() {
  const [activeTab, setActiveTab] = useState<AdminTab>("designs");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [subcategories, setSubcategories] = useState<DesignSubcategory[]>([]);
  const [filterSubcategories, setFilterSubcategories] = useState<DesignSubcategory[]>([]);
  const [designs, setDesigns] = useState<StudioDesign[]>([]);

  const [designsLoading, setDesignsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(true);

  const [designFilters, setDesignFilters] = useState<DesignFilters>(emptyDesignFilters);

  const [editingDesignId, setEditingDesignId] = useState<string | null>(null);
  const [designForm, setDesignForm] = useState<DesignFormState>(emptyDesignForm);
  const [designErrors, setDesignErrors] = useState<Record<string, string>>({});
  const [deleteDesignId, setDeleteDesignId] = useState<string | null>(null);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [categoryErrors, setCategoryErrors] = useState<Record<string, string>>({});
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryFormState>(emptySubcategoryForm);
  const [subcategoryErrors, setSubcategoryErrors] = useState<Record<string, string>>({});
  const [deleteSubcategoryId, setDeleteSubcategoryId] = useState<string | null>(null);

  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);
  const [uploadingSubcategoryImage, setUploadingSubcategoryImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [savingDesign, setSavingDesign] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSubcategory, setSavingSubcategory] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const [formSubcategories, setFormSubcategories] = useState<DesignSubcategory[]>([]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const categorySlugOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories.map((c) => ({ value: c.slug, label: c.name })),
    ],
    [categories],
  );

  const filterSubcategoryOptions = useMemo(
    () => [
      { value: "", label: "All subcategories" },
      ...filterSubcategories.map((s) => ({ value: s.slug, label: s.name })),
    ],
    [filterSubcategories],
  );

  const formSubcategoryOptions = useMemo(
    () => formSubcategories.map((s) => ({ value: s.id, label: s.name })),
    [formSubcategories],
  );

  const subcategoryFormCategoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const designThumbPreview = useMemo(
    () => designForm.thumbnailImage || FALLBACK_IMAGE,
    [designForm.thumbnailImage],
  );

  const categoryImagePreview = useMemo(
    () => categoryForm.image || FALLBACK_IMAGE,
    [categoryForm.image],
  );

  const subcategoryImagePreview = useMemo(
    () => subcategoryForm.image || FALLBACK_IMAGE,
    [subcategoryForm.image],
  );

  const loadCategories = useCallback(
    () =>
      fetchAdminList<DesignCategory>(
        DESIGN_STUDIO.CATEGORIES_ADMIN,
        setCategoriesLoading,
        setCategories,
        setLoadError,
        "Failed to load categories.",
      ),
    [],
  );

  const loadSubcategories = useCallback(
    () =>
      fetchAdminList<DesignSubcategory>(
        DESIGN_STUDIO.SUBCATEGORIES_ADMIN,
        setSubcategoriesLoading,
        setSubcategories,
        setLoadError,
        "Failed to load subcategories.",
      ),
    [],
  );

  const loadFilterSubcategories = useCallback(async (categorySlug: string) => {
    if (!categorySlug) {
      setFilterSubcategories([]);
      return;
    }
    try {
      const res = await apiJson<DesignSubcategory[]>(
        DESIGN_STUDIO.SUBCATEGORIES_BY_CATEGORY(categorySlug),
        { skipLoader: true },
      );
      setFilterSubcategories(extractListData<DesignSubcategory>(res.data));
    } catch {
      setFilterSubcategories([]);
    }
  }, []);

  const loadFormSubcategories = useCallback(async (categoryId: string) => {
    if (!categoryId) {
      setFormSubcategories([]);
      return;
    }
    try {
      const res = await apiJson<DesignSubcategory[]>(
        `${DESIGN_STUDIO.SUBCATEGORIES_ADMIN}&categoryId=${encodeURIComponent(categoryId)}`,
        { skipLoader: true },
      );
      const list = extractListData<DesignSubcategory>(res.data);
      setFormSubcategories(list);
      setDesignForm((prev) => {
        if (prev.subcategoryId && list.some((s) => s.id === prev.subcategoryId)) return prev;
        return { ...prev, subcategoryId: list[0]?.id ?? "" };
      });
    } catch {
      setFormSubcategories([]);
    }
  }, [categories]);

  const buildDesignsUrl = useCallback(() => {
    const params = new URLSearchParams({ all: "true" });
    if (designFilters.search.trim()) params.set("search", designFilters.search.trim());
    if (designFilters.category) params.set("category", designFilters.category);
    if (designFilters.subcategory) params.set("subcategory", designFilters.subcategory);
    if (designFilters.featured) params.set("featured", "true");
    if (designFilters.trending) params.set("trending", "true");
    if (designFilters.bridal) params.set("bridal", "true");
    return `${DESIGN_STUDIO.DESIGNS}?${params.toString()}`;
  }, [designFilters]);

  const loadDesigns = useCallback(async () => {
    setDesignsLoading(true);
    try {
      const res = await apiJson<StudioDesign[]>(buildDesignsUrl(), { skipLoader: true });
      let list = extractListData<StudioDesign>(res.data);
      if (designFilters.activeOnly) list = list.filter((d) => d.activeStatus);
      setDesigns(list);
      setLoadError(null);
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error) || "Failed to load designs.");
    } finally {
      setDesignsLoading(false);
    }
  }, [buildDesignsUrl, designFilters.activeOnly]);

  const refreshAll = useCallback(async () => {
    setLoadError(null);
    await Promise.all([loadCategories(), loadSubcategories(), loadDesigns()]);
  }, [loadCategories, loadSubcategories, loadDesigns]);

  useEffect(() => {
    loadCategories().catch(() => {});
    loadSubcategories().catch(() => {});
  }, [loadCategories, loadSubcategories]);

  useEffect(() => {
    loadDesigns().catch(() => {});
  }, [loadDesigns]);

  useEffect(() => {
    loadFilterSubcategories(designFilters.category).catch(() => {});
    if (!designFilters.category) {
      setDesignFilters((prev) => ({ ...prev, subcategory: "" }));
    }
  }, [designFilters.category, loadFilterSubcategories]);

  useEffect(() => {
    if (designForm.categoryId) {
      loadFormSubcategories(designForm.categoryId).catch(() => {});
    } else {
      setFormSubcategories([]);
    }
  }, [designForm.categoryId, loadFormSubcategories]);

  useEffect(() => {
    if (subcategoryForm.categoryId || editingSubcategoryId) return;
    if (categories.length > 0) {
      setSubcategoryForm((prev) =>
        prev.categoryId ? prev : { ...prev, categoryId: categories[0].id },
      );
    }
  }, [categories, subcategoryForm.categoryId, editingSubcategoryId]);

  const resetDesignForm = () => {
    setEditingDesignId(null);
    setDesignForm(emptyDesignForm);
    setDesignErrors({});
    setFormSubcategories([]);
    setUploadError("");
  };

  const fillDesignForm = (design: StudioDesign) => {
    setEditingDesignId(design.id);
    setDesignForm({
      title: design.title,
      slug: design.slug,
      categoryId: design.categoryId,
      subcategoryId: design.subcategoryId,
      shortDescription: design.shortDescription,
      fullDescription: design.fullDescription,
      thumbnailImage: design.thumbnailImage,
      galleryImages: [...(design.galleryImages || [])],
      tags: (design.tags || []).join(", "),
      stitchingPrice: design.stitchingPrice,
      fabricRecommendation: design.fabricRecommendation,
      deliveryTimeline: design.deliveryTimeline,
      featured: design.featured,
      trending: design.trending,
      newArrival: design.newArrival,
      bridalSpecial: design.bridalSpecial,
      homepageShow: design.homepageShow,
      activeStatus: design.activeStatus,
      displayOrder: String(design.displayOrder ?? 0),
      seoTitle: design.seoTitle,
      seoDescription: design.seoDescription,
      seoKeywords: design.seoKeywords,
    });
    setDesignErrors({});
    setUploadError("");
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
    setCategoryErrors({});
    setUploadError("");
  };

  const fillCategoryForm = (category: DesignCategory) => {
    setEditingCategoryId(category.id);
    setCategoryForm(categoryToFormState(category));
    setCategoryErrors({});
    setUploadError("");
  };

  const resetSubcategoryForm = () => {
    setEditingSubcategoryId(null);
    setSubcategoryForm({
      ...emptySubcategoryForm,
      categoryId: categories[0]?.id ?? "",
    });
    setSubcategoryErrors({});
    setUploadError("");
  };

  const fillSubcategoryForm = (sub: DesignSubcategory) => {
    setEditingSubcategoryId(sub.id);
    setSubcategoryForm(subcategoryToFormState(sub));
    setSubcategoryErrors({});
    setUploadError("");
  };

  const onThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    void uploadOneFile(
      event.target.files?.[0],
      setUploadingThumb,
      setUploadError,
      (url) => setDesignForm((prev) => ({ ...prev, thumbnailImage: url })),
      "Thumbnail upload failed",
    );
  };

  const onGalleryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;
    setUploadingGallery(true);
    setUploadError("");
    uploadImages(files)
      .then((urls) => {
        setDesignForm((prev) => ({
          ...prev,
          galleryImages: [...prev.galleryImages, ...urls.filter(Boolean)],
        }));
      })
      .catch((error: unknown) => {
        setUploadError(error instanceof Error ? error.message : "Gallery upload failed");
      })
      .finally(() => setUploadingGallery(false));
  };

  const removeGalleryImage = (index: number) => {
    setDesignForm((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index),
    }));
  };

  const moveGalleryImage = (index: number, direction: -1 | 1) => {
    setDesignForm((prev) => {
      const next = [...prev.galleryImages];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, galleryImages: next };
    });
  };

  const onCategoryImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    void uploadOneFile(
      event.target.files?.[0],
      setUploadingCategoryImage,
      setUploadError,
      (url) => setCategoryForm((prev) => ({ ...prev, image: url })),
      "Image upload failed",
    );
  };

  const onSubcategoryImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    void uploadOneFile(
      event.target.files?.[0],
      setUploadingSubcategoryImage,
      setUploadError,
      (url) => setSubcategoryForm((prev) => ({ ...prev, image: url })),
      "Image upload failed",
    );
  };

  const mutations = useMemo(
    () =>
      createDesignStudioMutations({
        designForm,
        categoryForm,
        subcategoryForm,
        editingDesignId,
        editingCategoryId,
        editingSubcategoryId,
        deleteDesignId,
        deleteCategoryId,
        deleteSubcategoryId,
        setDesignErrors,
        setCategoryErrors,
        setSubcategoryErrors,
        setSavingDesign,
        setSavingCategory,
        setSavingSubcategory,
        setSeeding,
        setDuplicatingId,
        setLoadError,
        setDeleteDesignId,
        setDeleteCategoryId,
        setDeleteSubcategoryId,
        refreshAll,
        loadDesigns,
        resetDesignForm,
        resetCategoryForm,
        resetSubcategoryForm,
      }),
    [
      designForm,
      categoryForm,
      subcategoryForm,
      editingDesignId,
      editingCategoryId,
      editingSubcategoryId,
      deleteDesignId,
      deleteCategoryId,
      deleteSubcategoryId,
      refreshAll,
      loadDesigns,
      resetDesignForm,
      resetCategoryForm,
      resetSubcategoryForm,
    ],
  );

  return {
    activeTab, setActiveTab, loadError,
    categories, subcategories, designs,
    designsLoading, categoriesLoading, subcategoriesLoading,
    designFilters, setDesignFilters,
    editingDesignId, designForm, setDesignForm, designErrors, deleteDesignId, setDeleteDesignId,
    editingCategoryId, categoryForm, setCategoryForm, categoryErrors, deleteCategoryId, setDeleteCategoryId,
    editingSubcategoryId, subcategoryForm, setSubcategoryForm, subcategoryErrors, deleteSubcategoryId, setDeleteSubcategoryId,
    uploadingThumb, uploadingGallery, uploadingCategoryImage, uploadingSubcategoryImage, uploadError,
    savingDesign, savingCategory, savingSubcategory, seeding, duplicatingId,
    categoryOptions, categorySlugOptions, filterSubcategoryOptions, formSubcategoryOptions, subcategoryFormCategoryOptions,
    designThumbPreview, categoryImagePreview, subcategoryImagePreview,
    loadDesigns, refreshAll,
    resetDesignForm, fillDesignForm, resetCategoryForm, fillCategoryForm, resetSubcategoryForm, fillSubcategoryForm,
    onThumbnailUpload, onGalleryUpload, removeGalleryImage, moveGalleryImage, onCategoryImageUpload, onSubcategoryImageUpload,
    ...mutations,
  };
}

export type DesignStudioAdminApi = ReturnType<typeof useDesignStudioAdmin>;
