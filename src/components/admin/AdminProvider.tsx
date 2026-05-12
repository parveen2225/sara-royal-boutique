"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Toast, ToastContainer } from "react-bootstrap";
import { AdminState, Collection, Product, Service } from "@/lib/admin/types";
import { apiJson } from "@/lib/api/client";
import { ADMIN, COLLECTIONS, PRODUCTS, SERVICES } from "@/lib/api/urls";
import { EMPTY_ADMIN_STATE } from "@/lib/admin/constants";
import { useRouter } from "next/navigation";

const SEED_URL = "/api/seed";

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Something went wrong.";
};

type ToastState = {
  show: boolean;
  message: string;
  variant: "success" | "danger" | "warning";
};

type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;
type ServiceInput = Omit<Service, "id" | "createdAt" | "updatedAt">;

type AdminContextType = {
  state: AdminState;
  addCollection: (name: string, serviceId: string) => void;
  updateCollection: (id: string, name: string, serviceId?: string) => void;
  deleteCollection: (id: string) => void;
  addProduct: (payload: ProductInput) => string;
  updateProduct: (id: string, payload: ProductInput) => void;
  deleteProduct: (id: string) => void;
  getProductById: (id: string) => Product | undefined;
  addService: (payload: ServiceInput) => string;
  updateService: (id: string, payload: ServiceInput) => void;
  deleteService: (id: string) => void;
  getServiceById: (id: string) => Service | undefined;
};

const AdminContext = createContext<AdminContextType | null>(null);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [state, setState] = useState<AdminState>(EMPTY_ADMIN_STATE);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: "",
    variant: "success",
  });

  const notify = (message: string, variant: ToastState["variant"] = "success") => {
    setToast({ show: true, message, variant });
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await apiJson<AdminState>(ADMIN.GET_STATE);
      if (cancelled) return;
      const data = res.data;
      setState(data);

      // Auto-seed MongoDB if collections/services/products are all empty
      const isEmpty =
        data.services.length === 0 &&
        data.collections.length === 0 &&
        data.products.length === 0;

      if (isEmpty) {
        try {
          await apiJson(SEED_URL, { method: "POST", skipLoader: true });
          const seeded = await apiJson<AdminState>(ADMIN.GET_STATE, { skipLoader: true });
          if (!cancelled) setState(seeded.data);
        } catch {
          // Seed failed silently (e.g. MongoDB not configured) — fallback data is already in state
        }
      }
    };

    load().catch((e: unknown) => {
      const message = getErrorMessage(e) || "Failed to load admin state.";
      if (message.toLowerCase().includes("unauthorized")) {
        router.replace("/admin/login");
        return;
      }
      notify(message, "danger");
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const value = useMemo<AdminContextType>(
    () => ({
      state,
      addCollection: (name, serviceId) => {
        const trimmed = name.trim();
        if (!trimmed) {
          notify("Collection name is required.", "danger");
          return;
        }
        const sid = serviceId.trim();
        if (!sid) {
          notify("Service is required.", "danger");
          return;
        }
        const exists = state.collections.some(
          (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
        );
        if (exists) {
          notify("Collection name already exists.", "warning");
          return;
        }
        apiJson<Collection>(COLLECTIONS.CREATE, {
          method: "POST",
          body: JSON.stringify({ name: trimmed, serviceId: sid }),
        })
          .then((res) => {
            setState((prev) => ({
              ...prev,
              collections: [...prev.collections, res.data],
            }));
            notify("Collection created.");
          })
          .catch((e: unknown) => notify(getErrorMessage(e) || "Failed to create collection.", "danger"));
      },
      updateCollection: (id, name, serviceId) => {
        const trimmed = name.trim();
        if (!trimmed) {
          notify("Collection name is required.", "danger");
          return;
        }
        apiJson<Collection>(COLLECTIONS.UPDATE(id), {
          method: "PUT",
          body: JSON.stringify({ name: trimmed, serviceId }),
        })
          .then((res) => {
            setState((prev) => ({
              ...prev,
              collections: prev.collections.map((item) =>
                item.id === id ? res.data : item,
              ),
            }));
            notify("Collection updated.");
          })
          .catch((e: unknown) => notify(getErrorMessage(e) || "Failed to update collection.", "danger"));
      },
      deleteCollection: (id) => {
        const linkedProducts = state.products.some((item) => item.categoryId === id);
        if (linkedProducts) {
          notify("Delete products in this collection first.", "warning");
          return;
        }
        apiJson<Collection>(COLLECTIONS.DELETE(id), { method: "DELETE" })
          .then(() => {
            setState((prev) => ({
              ...prev,
              collections: prev.collections.filter((item) => item.id !== id),
            }));
            notify("Collection deleted.");
          })
          .catch((e: unknown) => notify(getErrorMessage(e) || "Failed to delete collection.", "danger"));
      },
      addProduct: (payload) => {
        const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        apiJson<Product>(PRODUCTS.CREATE, {
          method: "POST",
          body: JSON.stringify(payload),
        })
          .then((res) => {
            setState((prev) => ({ ...prev, products: [res.data, ...prev.products] }));
            notify("Product added.");
          })
          .catch((e: unknown) => notify(getErrorMessage(e) || "Failed to add product.", "danger"));
        return tempId;
      },
      updateProduct: (id, payload) => {
        apiJson<Product>(PRODUCTS.UPDATE(id), {
          method: "PUT",
          body: JSON.stringify(payload),
        })
          .then((res) => {
            setState((prev) => ({
              ...prev,
              products: prev.products.map((item) => (item.id === id ? res.data : item)),
            }));
            notify("Product updated.");
          })
          .catch((e: unknown) => notify(getErrorMessage(e) || "Failed to update product.", "danger"));
      },
      deleteProduct: (id) => {
        apiJson<Product>(PRODUCTS.DELETE(id), { method: "DELETE" })
          .then(() => {
            setState((prev) => ({
              ...prev,
              products: prev.products.filter((item) => item.id !== id),
            }));
            notify("Product deleted.");
          })
          .catch((e: unknown) => notify(getErrorMessage(e) || "Failed to delete product.", "danger"));
      },
      getProductById: (id) => state.products.find((item) => item.id === id),
      addService: (payload) => {
        const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        apiJson<Service>(SERVICES.CREATE, {
          method: "POST",
          body: JSON.stringify(payload),
        })
          .then((res) => {
            setState((prev) => ({ ...prev, services: [res.data, ...prev.services] }));
            notify("Service added.");
          })
          .catch((e: unknown) => notify(getErrorMessage(e) || "Failed to add service.", "danger"));
        return tempId;
      },
      updateService: (id, payload) => {
        apiJson<Service>(SERVICES.UPDATE(id), {
          method: "PUT",
          body: JSON.stringify(payload),
        })
          .then((res) => {
            setState((prev) => ({
              ...prev,
              services: prev.services.map((item) => (item.id === id ? res.data : item)),
            }));
            notify("Service updated.");
          })
          .catch((e: unknown) => notify(getErrorMessage(e) || "Failed to update service.", "danger"));
      },
      deleteService: (id) => {
        apiJson<Service>(SERVICES.DELETE(id), { method: "DELETE" })
          .then(() => {
            setState((prev) => ({
              ...prev,
              services: prev.services.filter((item) => item.id !== id),
            }));
            notify("Service deleted.");
          })
          .catch((e: unknown) => notify(getErrorMessage(e) || "Failed to delete service.", "danger"));
      },
      getServiceById: (id) => state.services.find((item) => item.id === id),
    }),
    [state],
  );

  return (
    <AdminContext.Provider value={value}>
      {children}
      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={toast.show}
          delay={2600}
          autohide
          bg={toast.variant}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        >
          <Toast.Body className="text-white">{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within AdminProvider");
  return context;
};
