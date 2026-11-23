"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api/client";
import { AUTH } from "@/lib/api/urls";

export type CurrentAdmin = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  permissions: Record<"products" | "orders" | "stock" | "returns" | "reports", boolean>;
};

/** Signed-in admin (from the server, so role/permission changes show up). `loaded` is false until the first answer. */
export function useCurrentAdmin() {
  const [user, setUser] = useState<CurrentAdmin | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiJson<CurrentAdmin>(AUTH.ME, { skipLoader: true })
      .then((r) => !cancelled && setUser(r.data))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);
  return { user, loaded };
}
