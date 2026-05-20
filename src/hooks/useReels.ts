"use client";

import { useEffect, useState } from "react";
import { type Reel } from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { REELS } from "@/lib/api/urls";

export const useReels = () => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiJson<Reel[]>(REELS.PUBLIC, { skipLoader: true })
      .then((res) => {
        if (!cancelled) {
          const list = Array.isArray(res.data) ? res.data : [];
          setReels(list);
        }
      })
      .catch(() => {
        if (!cancelled) setReels([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { reels, isLoading };
};
