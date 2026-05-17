"use client";

import { useEffect, useMemo, useState } from "react";
import { PRODUCTS as FALLBACK_PRODUCTS, type Product } from "@/data/products";
import { formatPriceRange } from "@/utils/formatCurrency";
import { apiJson } from "@/lib/api/client";
import { COLLECTIONS, PRODUCTS as PRODUCTS_API } from "@/lib/api/urls";

type ApiCollection = { id: string; name: string };
type ApiProduct = {
  id: string;
  name: string;
  description: string;
  stitchingPrice: string | number;
  sliderDelayMs?: number;
  categoryId: string;
  imageUrl: string;
  imageName?: string;
  imageUrls?: string[];
};

export const usePublicProducts = () => {
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [cRes, pRes] = await Promise.all([
        apiJson<ApiCollection[]>(COLLECTIONS.LIST),
        apiJson<ApiProduct[]>(PRODUCTS_API.LIST),
      ]);
      if (cancelled) return;
      setCollections(cRes.data);
      setProducts(pRes.data);
    };

    load().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo<Product[]>(() => {
    if (products.length === 0) {
      return FALLBACK_PRODUCTS;
    }
    const byId = new Map(collections.map((c) => [c.id, c] as const));
    return products.map((product) => {
      const collection = byId.get(product.categoryId);
      const name = collection?.name ?? "Custom Designs";
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: formatPriceRange(String(product.stitchingPrice)),
        sliderDelayMs:
          typeof product.sliderDelayMs === "number" && product.sliderDelayMs > 0
            ? product.sliderDelayMs
            : 3200,
        image: product.imageUrl,
        imageUrls:
          product.imageUrls && product.imageUrls.length > 0
            ? product.imageUrls
            : product.imageUrl
            ? [product.imageUrl]
            : [],
        category: name,
        tags: [name],
        featured: true,
      };
    });
  }, [collections, products]);
};
