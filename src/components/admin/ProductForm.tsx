"use client";

import React, { useMemo } from "react";
import { Formik, Form } from "formik";
import { Col, Row } from "react-bootstrap";
import InputField from "@/components/common/formik/inputField/InputField";
import SelectField from "@/components/common/formik/selectField/SelectField";
import TextareaField from "@/components/common/formik/textareaField/TextareaField";
import ImageUploadField from "@/components/common/formik/imageUploadField/ImageUploadField";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { productValidationSchema } from "@/lib/validation/schemas";
import { Collection, Service } from "@/lib/admin/types";

interface ProductValues {
  name: string;
  description: string;
  stitchingPrice: string;
  categoryId: string;
  imageUrls: string[];
}

interface Props {
  collections: Collection[];
  services?: Service[];
  initialValues?: Partial<ProductValues> & { stitchingPrice?: number | string; imageUrl?: string; imageUrls?: string[] };
  submitLabel?: string;
  onSubmit: (values: {
    name: string;
    description: string;
    stitchingPrice: number;
    categoryId: string;
    imageUrl: string;
    imageUrls: string[];
  }) => void;
}

export default function ProductForm({
  collections,
  services = [],
  initialValues,
  submitLabel = "Save Product",
  onSubmit,
}: Props) {
  const collectionOptions = useMemo(() => {
    if (collections.length === 0) {
      return services.map((s) => ({
        value: s.id,
        label: s.title,
      }));
    }

    const serviceMap = new Map(services.map((s) => [s.id, s.title]));

    return collections.map((c) => {
      const serviceName = serviceMap.get(c.serviceId);
      return {
        value: c.id,
        label: serviceName ? `${serviceName} — ${c.name}` : c.name,
      };
    });
  }, [collections, services]);

  const initImageUrls: string[] = (() => {
    if (initialValues?.imageUrls && initialValues.imageUrls.length > 0) return initialValues.imageUrls;
    if (initialValues?.imageUrl) return [initialValues.imageUrl];
    return [];
  })();

  const initial: ProductValues = {
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    stitchingPrice:
      initialValues?.stitchingPrice != null ? String(initialValues.stitchingPrice) : "",
    categoryId: initialValues?.categoryId ?? "",
    imageUrls: initImageUrls,
  };

  const validationSchema = productValidationSchema;

  return (
    <Formik
      initialValues={initial}
      validationSchema={validationSchema}
      onSubmit={(values, helpers) => {
        const priceStr = values.stitchingPrice.trim();
        const price = priceStr.includes("-")
          ? parseFloat(priceStr.split("-")[0])
          : parseFloat(priceStr);
        onSubmit({
          name: values.name.trim(),
          description: values.description.trim(),
          stitchingPrice: isNaN(price) ? 0 : price,
          categoryId: values.categoryId,
          imageUrl: values.imageUrls[0] ?? "",
          imageUrls: values.imageUrls,
        });
        helpers.resetForm();
      }}
    >
      {({ values, errors, touched, setFieldValue, handleChange, handleBlur }) => (
        <Form className="admin_form" noValidate>
          <Row className="g-3">
            <Col md={6}>
              <InputField
                label="Product Name"
                name="name"
                placeholder="e.g. Ivory Lawn Suit"
                value={values.name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.name && errors.name}
              />
            </Col>

            <Col md={6}>
              <InputField
                label="Stitching Price (INR)"
                name="stitchingPrice"
                placeholder="e.g. 4500 or 800-1000"
                value={values.stitchingPrice}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.stitchingPrice && errors.stitchingPrice}
              />
            </Col>

            <Col md={12}>
              <TextareaField
                label="Description"
                name="description"
                placeholder="Describe the product style, fabric, and occasion..."
                value={values.description}
                rows={4}
                onChange={(e) =>
                  setFieldValue(
                    "description",
                    (e as unknown as React.ChangeEvent<HTMLTextAreaElement>).target.value,
                  )
                }
                onBlur={handleBlur}
                error={touched.description && errors.description}
              />
            </Col>

            <Col md={6}>
              <SelectField
                key={values.categoryId || "new"}
                name="categoryId"
                label="Collection"
                value={values.categoryId}
                options={collectionOptions}
                onChange={(opt) => setFieldValue("categoryId", opt?.value ?? "")}
                error={touched.categoryId && errors.categoryId}
                placeholder={
                  collections.length === 0
                    ? "Select service (no collections yet)"
                    : "Select collection"
                }
              />
            </Col>

            <Col md={12}>
              <ImageUploadField
                label="Product Images"
                name="imageUrls"
                values={values.imageUrls}
                onChange={(urls) => setFieldValue("imageUrls", urls)}
                error={touched.imageUrls && errors.imageUrls}
                maxImages={8}
              />
            </Col>

            <Col md={12}>
              <div className="d-flex gap-2 flex-wrap">
                <CommonButton type="submit" className="admin_primary_btn">
                  {submitLabel}
                </CommonButton>
              </div>
            </Col>
          </Row>
        </Form>
      )}
    </Formik>
  );
}
