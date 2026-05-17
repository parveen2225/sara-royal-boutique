import * as Yup from "yup";

const PRICE_RANGE_REGEX = /^\d+(\.\d+)?(-\d+(\.\d+)?)?$/;

export const productValidationSchema = Yup.object({
  name: Yup.string()
    .required("Product name is required.")
    .matches(/^[a-zA-Z\s'-]+$/, "Name must contain only letters.")
    .min(2, "Name must be at least 2 characters."),

  description: Yup.string()
    .required("Description is required.")
    .min(10, "Description must be at least 10 characters."),

  stitchingPrice: Yup.string()
    .required("Stitching price is required.")
    .matches(
      PRICE_RANGE_REGEX,
      "Enter a valid price (e.g. 4500 or 800-1000).",
    ),

  sliderDelayMs: Yup.number()
    .typeError("Slider timing must be a number.")
    .required("Slider timing is required.")
    .min(500, "Slider timing must be at least 500 ms.")
    .max(15000, "Slider timing must be 15000 ms or less."),

  categoryId: Yup.string().required("Collection is required."),

  imageUrls: Yup.array()
    .of(Yup.string().required())
    .min(1, "At least one product image is required.")
    .required("Product image is required."),
});

export const serviceValidationSchema = Yup.object({
  title: Yup.string()
    .required("Service title is required.")
    .matches(/^[a-zA-Z\s'/-]+$/, "Title must contain only letters.")
    .min(2, "Title must be at least 2 characters."),

  description: Yup.string()
    .required("Description is required.")
    .min(10, "Description must be at least 10 characters."),

  icon: Yup.string()
    .required("Icon text is required.")
    .max(3, "Icon must be 3 characters or fewer."),

  imageUrl: Yup.string().required("Service image is required."),
});

export const collectionValidationSchema = Yup.object({
  name: Yup.string()
    .required("Collection name is required.")
    .min(2, "Name must be at least 2 characters."),
  serviceId: Yup.string().required("Service is required."),
});

export const loginValidationSchema = Yup.object({
  email: Yup.string()
    .email("Enter a valid email address.")
    .required("Email is required."),
  password: Yup.string().required("Password is required."),
});
