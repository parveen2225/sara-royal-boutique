"use client";

import { useEffect, useState } from "react";
import { type HeroBanner } from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { HERO_BANNER } from "@/lib/api/urls";

export const useHeroBanner = () => {
  const [banner, setBanner] = useState<HeroBanner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiJson<HeroBanner | null>(HERO_BANNER.ACTIVE, { skipLoader: true })
      .then((res) => {
        if (!cancelled) setBanner(res.data);
      })
      .catch(() => {
        if (!cancelled) setBanner(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { banner, isLoading };
};
