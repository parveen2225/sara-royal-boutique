"use client";

import { useState } from "react";
import Image from "next/image";
import { useAdmin } from "@/components/admin/AdminProvider";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import AdminDeleteConfirmModal from "@/components/admin/modal/AdminDeleteConfirmModal/AdminDeleteConfirmModal";
import { formatPriceRange } from "@/utils/formatCurrency";

const FIELDS = [
  { label: "Image", key: "image" },
  { label: "Name", key: "name" },
  { label: "Collection", key: "collection" },
  { label: "Price", key: "price" },
  { label: "Actions", key: "actions" },
];

export default function ProductsPage() {
  const { state, deleteProduct } = useAdmin();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getCategoryName = (categoryId: string) => {
    const collection = state.collections.find((item) => item.id === categoryId);
    if (collection) {
      const service = state.services.find((s) => s.id === collection.serviceId);
      return service ? `${service.title} — ${collection.name}` : collection.name;
    }
    return "Unassigned";
  };

  const onConfirmDelete = () => {
    if (!deleteId) return;
    deleteProduct(deleteId);
    setDeleteId(null);
  };

  return (
    <section>
      <div className="admin_section_header">
        <h4 className="mb-0">Products ({state.products.length})</h4>
        <CommonButton role="link" to="/admin/products/add" className="admin_primary_btn">
          + Add Product
        </CommonButton>
      </div>

      <CommonTable fields={FIELDS} lastColumnWidth="160px">
        {state.products.map((item) => (
          <tr key={item.id}>
            <td>
              <Image
                src={item.imageUrl || (item.imageUrls?.[0] ?? "/images/Designer_Suits5.webp")}
                alt={item.name}
                width={64}
                height={64}
                className="admin_table_image"
                unoptimized
              />
            </td>
            <td>
              <strong>{item.name}</strong>
              {item.imageUrls && item.imageUrls.length > 1 && (
                <small className="d-block text-muted">{item.imageUrls.length} images</small>
              )}
            </td>
            <td>{getCategoryName(item.categoryId)}</td>
            <td>
              <span className="admin_price_badge">
                ₹ {formatPriceRange(String(item.stitchingPrice))}
              </span>
            </td>
            <td>
              <div className="d-flex gap-2">
                <CommonButton
                  role="link"
                  to={`/admin/products/${item.id}/edit`}
                  className="admin_outline_btn admin_sm_btn"
                >
                  Edit
                </CommonButton>
                <CommonButton
                  className="admin_danger_btn admin_sm_btn"
                  onClick={() => setDeleteId(item.id)}
                >
                  Delete
                </CommonButton>
              </div>
            </td>
          </tr>
        ))}
      </CommonTable>

      <AdminDeleteConfirmModal
        show={!!deleteId}
        heading="Delete Product"
        message="Are you sure you want to delete this product? This cannot be undone."
        onClose={() => setDeleteId(null)}
        onConfirm={onConfirmDelete}
      />
    </section>
  );
}
