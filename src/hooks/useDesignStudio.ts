"use client";

import { useEffect, useState } from "react";
import type { DesignCategory, DesignSubcategory, StudioDesign } from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { extractListData } from "@/lib/api/listData";
import { DESIGN_STUDIO } from "@/lib/api/urls";
import {
  getFallbackDesignCategories,
  getFallbackDesignSubcategories,
  getFallbackDesigns,
  getFallbackCategoryBySlug,
  getFallbackSubcategoryBySlug,
} from "@/data/designStudioFallback";

export const useDesignCategories = () => {
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    apiJson<DesignCategory[]>(DESIGN_STUDIO.CATEGORIES, { skipLoader: true })
      .then((res) => {
        if (!cancelled) setCategories(extractListData(res.data));
      })
      .catch(() => {
        if (!cancelled) setCategories(getFallbackDesignCategories().filter((c) => c.isActive));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, isLoading };
};

export const useDesignSubcategories = (categorySlug?: string) => {
  const [subcategories, setSubcategories] = useState<DesignSubcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!categorySlug) {
      setSubcategories([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    apiJson<DesignSubcategory[]>(DESIGN_STUDIO.SUBCATEGORIES_BY_CATEGORY(categorySlug), {
      skipLoader: true,
    })
      .then((res) => {
        if (!cancelled) setSubcategories(extractListData(res.data));
      })
      .catch(() => {
        if (!cancelled) {
          setSubcategories(getFallbackDesignSubcategories(categorySlug).filter((s) => s.isActive));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  return { subcategories, isLoading };
};

type DesignFilters = {
  categorySlug?: string;
  subcategorySlug?: string;
  search?: string;
  featured?: boolean;
  trending?: boolean;
  bridal?: boolean;
  newArrival?: boolean;
  homepageShow?: boolean;
  limit?: number;
};

export const useDesigns = (filters: DesignFilters = {}) => {
  const [designs, setDesigns] = useState<StudioDesign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    categorySlug,
    subcategorySlug,
    search,
    featured,
    trending,
    bridal,
    newArrival,
    homepageShow,
    limit,
  } = filters;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (subcategorySlug) params.set("subcategory", subcategorySlug);
    if (search?.trim()) params.set("search", search.trim());
    if (featured) params.set("featured", "true");
    if (trending) params.set("trending", "true");
    if (bridal) params.set("bridal", "true");
    if (newArrival) params.set("newArrival", "true");
    if (homepageShow) params.set("homepageShow", "true");
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    const url = qs ? `${DESIGN_STUDIO.DESIGNS}?${qs}` : DESIGN_STUDIO.DESIGNS;

    apiJson<StudioDesign[]>(url, { skipLoader: true })
      .then((res) => {
        if (!cancelled) setDesigns(extractListData(res.data));
      })
      .catch(() => {
        if (!cancelled) {
          setDesigns(
            getFallbackDesigns({
              categorySlug,
              subcategorySlug,
              search,
              featured,
              trending,
              bridal,
              newArrival,
              homepageShow,
              limit,
            }),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    categorySlug,
    subcategorySlug,
    search,
    featured,
    trending,
    bridal,
    newArrival,
    homepageShow,
    limit,
  ]);

  return { designs, isLoading };
};

export const getCategoryBySlugClient = (slug: string) => getFallbackCategoryBySlug(slug);
export const getSubcategoryBySlugClient = (categorySlug: string, subSlug: string) =>
  getFallbackSubcategoryBySlug(categorySlug, subSlug);
