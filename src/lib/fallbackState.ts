import { PRODUCTS } from "@/data/products";
import { SERVICES } from "@/data/services";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const getFallbackServices = () =>
  SERVICES.map((service) => ({
    id: service.id,
    title: service.title,
    description: service.description,
    icon: service.icon,
    imageUrl: service.image,
    imageName: "",
    active: service.active !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

export const getFallbackCollections = () => {
  const seen = new Set<string>();
  return PRODUCTS.map((product) => product.category)
    .filter((name) => {
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    })
    .map((name) => ({
      id: slugify(name),
      name,
      serviceId: "custom-designs",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
};

export const getFallbackProducts = () => {
  const byName = new Map(getFallbackCollections().map((c) => [c.name, c.id] as const));
  return PRODUCTS.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    stitchingPrice: String(product.price || "").replace(/^₹\s*/, "").trim(),
    categoryId: byName.get(product.category) || "custom-designs",
    imageUrl: product.image,
    imageName: "",
    imageUrls:
      product.imageUrls && product.imageUrls.length > 0
        ? product.imageUrls
        : product.image
          ? [product.image]
          : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

export const getFallbackAdminState = () => ({
  collections: getFallbackCollections(),
  products: getFallbackProducts(),
  services: getFallbackServices(),
});
