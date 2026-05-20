"use client";

import { useEffect, useState } from "react";
import { type GalleryCategory, type GalleryItem } from "@/lib/admin/types";
import { GALLERY_CATEGORIES } from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { GALLERY } from "@/lib/api/urls";

type GalleryResponse = {
  items: GalleryItem[];
  categories: GalleryCategory[];
};

export const useGallery = (category?: GalleryCategory | "All") => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([...GALLERY_CATEGORIES]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const url =
      category && category !== "All"
        ? GALLERY.BY_CATEGORY(category)
        : GALLERY.PUBLIC;

    apiJson<GalleryResponse>(url, { skipLoader: true })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data?.items ?? []);
        if (res.data?.categories?.length) {
          setCategories(res.data.categories as GalleryCategory[]);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  return { items, categories, isLoading };
};
