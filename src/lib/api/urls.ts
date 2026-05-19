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

export const API_ROUTES = {
  HEALTH,
  AUTH,
  ADMIN,
  COLLECTIONS,
  PRODUCTS,
  SERVICES,
  UPLOAD,
  HERO_BANNER,
};

export default API_ROUTES;
