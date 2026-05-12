"use client";

import { useParams, useRouter } from "next/navigation";
import { Card } from "react-bootstrap";
import ProductForm from "@/components/admin/ProductForm";
import { useAdmin } from "@/components/admin/AdminProvider";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, getProductById, updateProduct } = useAdmin();
  const productId = params?.id;
  const product = productId ? getProductById(productId) : null;

  if (!product) {
    return (
      <section>
        <Card className="admin_card p-3">
          <p className="mb-2">Product not found.</p>
          <CommonButton role="link" to="/admin/products" className="admin_outline_btn admin_sm_btn">
            Back to Products
          </CommonButton>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <div className="admin_section_header">
        <h4 className="mb-0">Edit Product</h4>
      </div>
      <Card className="admin_card p-3">
        <ProductForm
          collections={state.collections}
          services={state.services}
          initialValues={{
            ...product,
            stitchingPrice: String(product.stitchingPrice),
            imageUrls: product.imageUrls && product.imageUrls.length > 0
              ? product.imageUrls
              : product.imageUrl ? [product.imageUrl] : [],
          }}
          submitLabel="Update Product"
          onSubmit={(values) => {
            updateProduct(product.id, values);
            router.push("/admin/products");
          }}
        />
      </Card>
    </section>
  );
}
