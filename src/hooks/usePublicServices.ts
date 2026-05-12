"use client";

import { useEffect, useMemo, useState } from "react";
import { SERVICES as FALLBACK_SERVICES, type Service } from "@/data/services";
import { apiJson } from "@/lib/api/client";
import { SERVICES as SERVICES_API } from "@/lib/api/urls";

type ApiService = {
  id: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  active: boolean;
};

export const usePublicServices = () => {
  const [services, setServices] = useState<Service[]>(
    FALLBACK_SERVICES.filter((service) => service.active !== false),
  );

  useEffect(() => {
    let cancelled = false;
    apiJson<ApiService[]>(`${SERVICES_API.LIST}?active=true`)
      .then((res) => {
        if (cancelled) return;
        if (!Array.isArray(res.data) || res.data.length === 0) return;
        setServices(
          res.data.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            icon: item.icon,
            image: item.imageUrl,
            active: item.active,
          })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo<Service[]>(() => services, [services]);
};
