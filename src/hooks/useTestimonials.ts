"use client";

import { useEffect, useState } from "react";
import { type Testimonial } from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { extractListData } from "@/lib/api/listData";
import { TESTIMONIALS } from "@/lib/api/urls";

export const useTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiJson<Testimonial[]>(TESTIMONIALS.PUBLIC, { skipLoader: true })
      .then((res) => {
        if (!cancelled) setTestimonials(extractListData<Testimonial>(res.data));
      })
      .catch(() => {
        if (!cancelled) setTestimonials([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { testimonials, isLoading };
};
