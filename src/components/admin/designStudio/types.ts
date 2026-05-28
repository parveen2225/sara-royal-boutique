import type { FormEvent } from "react";
import { uploadImages } from "@/lib/api/upload";
import type { DesignCategory, DesignSubcategory, StudioDesign } from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { extractListData } from "@/lib/api/listData";
import { createSlug } from "@/lib/api/utils";
import { DESIGN_STUDIO } from "@/lib/api/urls";

export type AdminTab = "designs" | "categories" | "subcategories";

export type DesignFilters = {
  search: string;
  category: string;
  subcategory: string;
  featured: boolean;
  trending: boolean;
  bridal: boolean;
  activeOnly: boolean;
};

export const emptyDesignFilters: DesignFilters = {
  search: "",
  category: "",
  subcategory: "",
  featured: false,
  trending: false,
  bridal: false,
  activeOnly: true,
};

export type DesignFormState = {
  title: string;
  slug: string;
  categoryId: string;
  subcategoryId: string;
  shortDescription: string;
  fullDescription: string;
  thumbnailImage: string;
  galleryImages: string[];
  tags: string;
  stitchingPrice: string;
  fabricRecommendation: string;
  deliveryTimeline: string;
  featured: boolean;
  trending: boolean;
  newArrival: boolean;
  bridalSpecial: boolean;
  homepageShow: boolean;
  activeStatus: boolean;
  displayOrder: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
};

export const emptyDesignForm: DesignFormState = {
  title: "",
  slug: "",
  categoryId: "",
  subcategoryId: "",
  shortDescription: "",
  fullDescription: "",
  thumbnailImage: "",
  galleryImages: [],
  tags: "",
  stitchingPrice: "",
  fabricRecommendation: "",
  deliveryTimeline: "",
  featured: false,
  trending: false,
  newArrival: false,
  bridalSpecial: false,
  homepageShow: false,
  activeStatus: true,
  displayOrder: "0",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
};

export type CategoryFormState = {
  name: string;
  slug: string;
  description: string;
  image: string;
  displayOrder: string;
  isActive: boolean;
};

export const emptyCategoryForm: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  image: "",
  displayOrder: "0",
  isActive: true,
};

export type SubcategoryFormState = {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  displayOrder: string;
  isActive: boolean;
};

export const emptySubcategoryForm: SubcategoryFormState = {
  categoryId: "",
  name: "",
  slug: "",
  description: "",
  image: "",
  displayOrder: "0",
  isActive: true,
};

export const FALLBACK_IMAGE = "/images/kide_war1.png";

export const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Something went wrong.";
};

export const parseTags = (value: string) =>
  value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

export function designToFormState(design: StudioDesign): DesignFormState {
  return {
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
  };
}

export function categoryToFormState(category: DesignCategory): CategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    displayOrder: String(category.displayOrder ?? 0),
    isActive: category.isActive,
  };
}

export function subcategoryToFormState(sub: DesignSubcategory): SubcategoryFormState {
  return {
    categoryId: sub.categoryId,
    name: sub.name,
    slug: sub.slug,
    description: sub.description,
    image: sub.image,
    displayOrder: String(sub.displayOrder ?? 0),
    isActive: sub.isActive,
  };
}

export function getDesignFormErrors(form: DesignFormState): Record<string, string> {
  const next: Record<string, string> = {};
  if (!form.title.trim()) next.title = "Title is required.";
  if (!form.thumbnailImage.trim()) next.thumbnailImage = "Thumbnail image is required.";
  if (!form.categoryId) next.categoryId = "Category is required.";
  if (!form.subcategoryId) next.subcategoryId = "Subcategory is required.";
  return next;
}

export function getCategoryFormErrors(form: CategoryFormState): Record<string, string> {
  const next: Record<string, string> = {};
  if (!form.name.trim()) next.name = "Category name is required.";
  return next;
}

export function getSubcategoryFormErrors(form: SubcategoryFormState): Record<string, string> {
  const next: Record<string, string> = {};
  if (!form.name.trim()) next.name = "Subcategory name is required.";
  if (!form.categoryId) next.categoryId = "Category is required.";
  return next;
}

export function buildDesignPayload(form: DesignFormState) {
  return {
    title: form.title.trim(),
    slug: createSlug(form.slug || form.title),
    categoryId: form.categoryId,
    subcategoryId: form.subcategoryId,
    shortDescription: form.shortDescription.trim(),
    fullDescription: form.fullDescription.trim(),
    thumbnailImage: form.thumbnailImage.trim(),
    galleryImages: form.galleryImages,
    tags: parseTags(form.tags),
    stitchingPrice: form.stitchingPrice.trim(),
    fabricRecommendation: form.fabricRecommendation.trim(),
    deliveryTimeline: form.deliveryTimeline.trim(),
    featured: form.featured,
    trending: form.trending,
    newArrival: form.newArrival,
    bridalSpecial: form.bridalSpecial,
    homepageShow: form.homepageShow,
    activeStatus: form.activeStatus,
    displayOrder: Number(form.displayOrder) || 0,
    seoTitle: form.seoTitle.trim(),
    seoDescription: form.seoDescription.trim(),
    seoKeywords: form.seoKeywords.trim(),
  };
}

export function buildCategoryPayload(form: CategoryFormState) {
  return {
    name: form.name.trim(),
    slug: createSlug(form.slug || form.name),
    description: form.description.trim(),
    image: form.image.trim(),
    displayOrder: Number(form.displayOrder) || 0,
    isActive: form.isActive,
  };
}

export function buildSubcategoryPayload(form: SubcategoryFormState) {
  return {
    categoryId: form.categoryId,
    name: form.name.trim(),
    slug: createSlug(form.slug || form.name),
    description: form.description.trim(),
    image: form.image.trim(),
    displayOrder: Number(form.displayOrder) || 0,
    isActive: form.isActive,
  };
}

export async function uploadOneFile(
  file: File | undefined,
  setUploading: (v: boolean) => void,
  setUploadError: (v: string) => void,
  applyUrl: (url: string) => void,
  failLabel: string,
) {
  if (!file) return;
  setUploading(true);
  setUploadError("");
  try {
    const urls = await uploadImages([file]);
    applyUrl(urls[0] || "");
  } catch (error: unknown) {
    setUploadError(error instanceof Error ? error.message : failLabel);
  } finally {
    setUploading(false);
  }
}

export async function fetchAdminList<T>(
  url: string,
  setLoading: (loading: boolean) => void,
  setData: (items: T[]) => void,
  setError: (message: string | null) => void,
  errorMessage: string,
) {
  setLoading(true);
  try {
    const res = await apiJson<T[]>(url, { skipLoader: true });
    setData(extractListData<T>(res.data));
  } catch (error: unknown) {
    setError(getErrorMessage(error) || errorMessage);
  } finally {
    setLoading(false);
  }
}

export type DesignStudioMutationCtx = {
  designForm: DesignFormState;
  categoryForm: CategoryFormState;
  subcategoryForm: SubcategoryFormState;
  editingDesignId: string | null;
  editingCategoryId: string | null;
  editingSubcategoryId: string | null;
  deleteDesignId: string | null;
  deleteCategoryId: string | null;
  deleteSubcategoryId: string | null;
  setDesignErrors: (errors: Record<string, string>) => void;
  setCategoryErrors: (errors: Record<string, string>) => void;
  setSubcategoryErrors: (errors: Record<string, string>) => void;
  setSavingDesign: (v: boolean) => void;
  setSavingCategory: (v: boolean) => void;
  setSavingSubcategory: (v: boolean) => void;
  setSeeding: (v: boolean) => void;
  setDuplicatingId: (id: string | null) => void;
  setLoadError: (msg: string | null) => void;
  setDeleteDesignId: (id: string | null) => void;
  setDeleteCategoryId: (id: string | null) => void;
  setDeleteSubcategoryId: (id: string | null) => void;
  refreshAll: () => Promise<void>;
  loadDesigns: () => Promise<void>;
  resetDesignForm: () => void;
  resetCategoryForm: () => void;
  resetSubcategoryForm: () => void;
};

export function createDesignStudioMutations(ctx: DesignStudioMutationCtx) {
  const onDesignSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const designErrs = getDesignFormErrors(ctx.designForm);
    ctx.setDesignErrors(designErrs);
    if (Object.keys(designErrs).length) return;
    ctx.setSavingDesign(true);
    try {
      const payload = buildDesignPayload(ctx.designForm);
      if (ctx.editingDesignId) {
        await apiJson<StudioDesign>(DESIGN_STUDIO.DESIGNS, {
          method: "PUT",
          body: JSON.stringify({ id: ctx.editingDesignId, ...payload }),
        });
      } else {
        await apiJson<StudioDesign>(DESIGN_STUDIO.DESIGNS, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await ctx.refreshAll();
      ctx.resetDesignForm();
    } catch (error: unknown) {
      ctx.setLoadError(getErrorMessage(error) || "Failed to save design.");
    } finally {
      ctx.setSavingDesign(false);
    }
  };

  const onCategorySubmit = async (event: FormEvent) => {
    event.preventDefault();
    const catErrs = getCategoryFormErrors(ctx.categoryForm);
    ctx.setCategoryErrors(catErrs);
    if (Object.keys(catErrs).length) return;
    const payload = buildCategoryPayload(ctx.categoryForm);
    ctx.setSavingCategory(true);
    try {
      if (ctx.editingCategoryId) {
        await apiJson<DesignCategory>(DESIGN_STUDIO.CATEGORIES, {
          method: "PUT",
          body: JSON.stringify({ id: ctx.editingCategoryId, ...payload }),
        });
      } else {
        await apiJson<DesignCategory>(DESIGN_STUDIO.CATEGORIES, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await ctx.refreshAll();
      ctx.resetCategoryForm();
    } catch (error: unknown) {
      ctx.setLoadError(getErrorMessage(error) || "Failed to save category.");
    } finally {
      ctx.setSavingCategory(false);
    }
  };

  const onSubcategorySubmit = async (event: FormEvent) => {
    event.preventDefault();
    const subErrs = getSubcategoryFormErrors(ctx.subcategoryForm);
    ctx.setSubcategoryErrors(subErrs);
    if (Object.keys(subErrs).length) return;
    const payload = buildSubcategoryPayload(ctx.subcategoryForm);
    ctx.setSavingSubcategory(true);
    try {
      if (ctx.editingSubcategoryId) {
        await apiJson<DesignSubcategory>(DESIGN_STUDIO.SUBCATEGORIES, {
          method: "PUT",
          body: JSON.stringify({ id: ctx.editingSubcategoryId, ...payload }),
        });
      } else {
        await apiJson<DesignSubcategory>(DESIGN_STUDIO.SUBCATEGORIES, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await ctx.refreshAll();
      ctx.resetSubcategoryForm();
    } catch (error: unknown) {
      ctx.setLoadError(getErrorMessage(error) || "Failed to save subcategory.");
    } finally {
      ctx.setSavingSubcategory(false);
    }
  };

  const onSeed = async () => {
    ctx.setSeeding(true);
    ctx.setLoadError(null);
    try {
      await apiJson(DESIGN_STUDIO.SEED, { method: "POST" });
      await ctx.refreshAll();
    } catch (error: unknown) {
      ctx.setLoadError(getErrorMessage(error) || "Failed to seed Design Studio.");
    } finally {
      ctx.setSeeding(false);
    }
  };

  const onDuplicateDesign = async (id: string) => {
    ctx.setDuplicatingId(id);
    try {
      await apiJson<StudioDesign>(DESIGN_STUDIO.DESIGNS, {
        method: "POST",
        body: JSON.stringify({ duplicateId: id }),
      });
      await ctx.loadDesigns();
    } catch (error: unknown) {
      ctx.setLoadError(getErrorMessage(error) || "Failed to duplicate design.");
    } finally {
      ctx.setDuplicatingId(null);
    }
  };

  const onConfirmDeleteDesign = async () => {
    if (!ctx.deleteDesignId) return;
    try {
      await apiJson(`${DESIGN_STUDIO.DESIGNS}?id=${encodeURIComponent(ctx.deleteDesignId)}`, {
        method: "DELETE",
      });
      await ctx.refreshAll();
      if (ctx.editingDesignId === ctx.deleteDesignId) ctx.resetDesignForm();
    } catch (error: unknown) {
      ctx.setLoadError(getErrorMessage(error) || "Failed to delete design.");
    } finally {
      ctx.setDeleteDesignId(null);
    }
  };

  const onConfirmDeleteCategory = async () => {
    if (!ctx.deleteCategoryId) return;
    try {
      await apiJson(`${DESIGN_STUDIO.CATEGORIES}?id=${encodeURIComponent(ctx.deleteCategoryId)}`, {
        method: "DELETE",
      });
      await ctx.refreshAll();
      if (ctx.editingCategoryId === ctx.deleteCategoryId) ctx.resetCategoryForm();
    } catch (error: unknown) {
      ctx.setLoadError(getErrorMessage(error) || "Failed to delete category.");
    } finally {
      ctx.setDeleteCategoryId(null);
    }
  };

  const onConfirmDeleteSubcategory = async () => {
    if (!ctx.deleteSubcategoryId) return;
    try {
      await apiJson(
        `${DESIGN_STUDIO.SUBCATEGORIES}?id=${encodeURIComponent(ctx.deleteSubcategoryId)}`,
        { method: "DELETE" },
      );
      await ctx.refreshAll();
      if (ctx.editingSubcategoryId === ctx.deleteSubcategoryId) ctx.resetSubcategoryForm();
    } catch (error: unknown) {
      ctx.setLoadError(getErrorMessage(error) || "Failed to delete subcategory.");
    } finally {
      ctx.setDeleteSubcategoryId(null);
    }
  };

  const openDesignPreview = (design: StudioDesign) => {
    if (typeof window === "undefined") return;
    const url = `/design-studio/${design.categorySlug}/${design.subcategorySlug}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return {
    onDesignSubmit,
    onCategorySubmit,
    onSubcategorySubmit,
    onSeed,
    onDuplicateDesign,
    onConfirmDeleteDesign,
    onConfirmDeleteCategory,
    onConfirmDeleteSubcategory,
    openDesignPreview,
  };
}
