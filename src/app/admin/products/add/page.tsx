"use client";

import { useRouter } from "next/navigation";
import { Card } from "react-bootstrap";
import ProductForm from "@/components/admin/ProductForm";
import { useAdmin } from "@/components/admin/AdminProvider";

export default function AddProductPage() {
  const router = useRouter();
  const { state, addProduct } = useAdmin();

  return (
    <section>
      <div className="admin_section_header">
        <h4 className="mb-0">Add Product</h4>
        <span className="admin_section_hint">Fill the form and submit — form resets so you can add another immediately.</span>
      </div>
      <Card className="admin_card p-3">
        <ProductForm
          collections={state.collections}
          services={state.services}
          submitLabel="Create Product"
          onSubmit={(values) => {
            addProduct(values);
          }}
        />
      </Card>
      <div className="admin_add_nav mt-3">
        <button
          type="button"
          className="admin_outline_btn admin_sm_btn"
          onClick={() => router.push("/admin/products")}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          ← View all products
        </button>
      </div>
    </section>
  );
}
