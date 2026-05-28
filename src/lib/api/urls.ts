const API_BASE = "/api";

export const HEALTH = {
  CHECK: `${API_BASE}/health`,
};

export const AUTH = {
  LOGIN: `${API_BASE}/auth/login`,
  LOGOUT: `${API_BASE}/auth/logout`,
  ME: `${API_BASE}/auth/me`,
};

export const ADMIN = {
  GET_STATE: `${API_BASE}/admin/state`,
  UPDATE_STATE: `${API_BASE}/admin/state`,
};

export const COLLECTIONS = {
  LIST: `${API_BASE}/collections`,
  LIST_BY_SERVICE: (serviceId: string) => `${API_BASE}/collections?serviceId=${encodeURIComponent(serviceId)}`,
  CREATE: `${API_BASE}/collections`,
  GET: (id: string) => `${API_BASE}/collections/${id}`,
  UPDATE: (id: string) => `${API_BASE}/collections/${id}`,
  DELETE: (id: string) => `${API_BASE}/collections/${id}`,
};

export const PRODUCTS = {
  LIST: `${API_BASE}/products`,
  CREATE: `${API_BASE}/products`,
  GET: (id: string) => `${API_BASE}/products/${id}`,
  UPDATE: (id: string) => `${API_BASE}/products/${id}`,
  DELETE: (id: string) => `${API_BASE}/products/${id}`,
};

export const SERVICES = {
  LIST: `${API_BASE}/services`,
  CREATE: `${API_BASE}/services`,
  GET: (id: string) => `${API_BASE}/services/${id}`,
  UPDATE: (id: string) => `${API_BASE}/services/${id}`,
  DELETE: (id: string) => `${API_BASE}/services/${id}`,
};

export const UPLOAD = {
  IMAGE: `${API_BASE}/upload`,
};

export const HERO_BANNER = {
  LIST: `${API_BASE}/hero-banner?all=true`,
  ACTIVE: `${API_BASE}/hero-banner`,
  CREATE: `${API_BASE}/hero-banner`,
  UPDATE: `${API_BASE}/hero-banner`,
  DELETE: `${API_BASE}/hero-banner`,
};

export const REELS = {
  LIST: `${API_BASE}/reels?all=true`,
  PUBLIC: `${API_BASE}/reels`,
  CREATE: `${API_BASE}/reels`,
  UPDATE: `${API_BASE}/reels`,
  DELETE: `${API_BASE}/reels`,
};

export const TESTIMONIALS = {
  LIST: `${API_BASE}/testimonials?all=true`,
  PUBLIC: `${API_BASE}/testimonials`,
  CREATE: `${API_BASE}/testimonials`,
  UPDATE: `${API_BASE}/testimonials`,
  DELETE: `${API_BASE}/testimonials`,
};

export const GALLERY = {
  LIST: `${API_BASE}/gallery?all=true`,
  PUBLIC: `${API_BASE}/gallery`,
  BY_CATEGORY: (category: string) =>
    `${API_BASE}/gallery?category=${encodeURIComponent(category)}`,
  CREATE: `${API_BASE}/gallery`,
  UPDATE: `${API_BASE}/gallery`,
  DELETE: `${API_BASE}/gallery`,
};

export const DESIGN_STUDIO = {
  CATEGORIES: `${API_BASE}/design-studio/categories`,
  CATEGORIES_ADMIN: `${API_BASE}/design-studio/categories?all=true`,
  SUBCATEGORIES: `${API_BASE}/design-studio/subcategories`,
  SUBCATEGORIES_ADMIN: `${API_BASE}/design-studio/subcategories?all=true`,
  SUBCATEGORIES_BY_CATEGORY: (slug: string) =>
    `${API_BASE}/design-studio/subcategories?category=${encodeURIComponent(slug)}`,
  DESIGNS: `${API_BASE}/design-studio/designs`,
  DESIGNS_ADMIN: `${API_BASE}/design-studio/designs?all=true`,
  DESIGNS_BY_CATEGORY: (slug: string) =>
    `${API_BASE}/design-studio/designs?category=${encodeURIComponent(slug)}`,
  DESIGNS_BY_SUBCATEGORY: (category: string, sub: string) =>
    `${API_BASE}/design-studio/designs?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(sub)}`,
  DESIGN_BY_SLUG: (slug: string) =>
    `${API_BASE}/design-studio/designs?slug=${encodeURIComponent(slug)}`,
  FEATURED: `${API_BASE}/design-studio/designs?featured=true`,
  TRENDING: `${API_BASE}/design-studio/designs?trending=true`,
  HOMEPAGE: `${API_BASE}/design-studio/designs?homepageShow=true&limit=8`,
  SEED: `${API_BASE}/design-studio/seed`,
};

export const API_ROUTES = {
  HEALTH,
  AUTH,
  ADMIN,
  COLLECTIONS,
  PRODUCTS,
  SERVICES,
  UPLOAD,
  HERO_BANNER,
  REELS,
  TESTIMONIALS,
  GALLERY,
  DESIGN_STUDIO,
};

export default API_ROUTES;
