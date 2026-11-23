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
  const [isLoading, setIsLoading] = useState(true); // starts true; this effect runs once, so it never needs to set it to true again

  useEffect(() => {
    let cancelled = false;
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
  // `loaded` remembers which category the data belongs to, so "loading" and "no category" are derived, not set in the effect.
  const [loaded, setLoaded] = useState<{ slug: string; list: DesignSubcategory[] } | null>(null);

  useEffect(() => {
    if (!categorySlug) return;
    let cancelled = false;
    apiJson<DesignSubcategory[]>(DESIGN_STUDIO.SUBCATEGORIES_BY_CATEGORY(categorySlug), {
      skipLoader: true,
    })
      .then((res) => {
        if (!cancelled) setLoaded({ slug: categorySlug, list: extractListData(res.data) });
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({ slug: categorySlug, list: getFallbackDesignSubcategories(categorySlug).filter((s) => s.isActive) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  const subcategories = categorySlug ? (loaded?.list ?? []) : []; // previous list stays visible while a new category loads, as before
  const isLoading = Boolean(categorySlug) && loaded?.slug !== categorySlug;
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
  // `loaded` remembers which request (url) the data belongs to, so "loading" is derived instead of being set inside the effect.
  const [loaded, setLoaded] = useState<{ url: string; list: StudioDesign[] } | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    apiJson<StudioDesign[]>(url, { skipLoader: true })
      .then((res) => {
        if (!cancelled) setLoaded({ url, list: extractListData(res.data) });
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({
            url,
            list: getFallbackDesigns({
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
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    url,
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

  const designs = loaded?.list ?? []; // the previous list stays visible while new filters load, as before
  const isLoading = loaded?.url !== url;
  return { designs, isLoading };
};

export const getCategoryBySlugClient = (slug: string) => getFallbackCategoryBySlug(slug);
export const getSubcategoryBySlugClient = (categorySlug: string, subSlug: string) =>
  getFallbackSubcategoryBySlug(categorySlug, subSlug);
