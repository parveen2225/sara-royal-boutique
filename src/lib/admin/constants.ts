import { AdminState } from "./types";

export const ADMIN_COOKIE_NAME = "admin_session";

export const EMPTY_ADMIN_STATE: AdminState = {
  collections: [],
  products: [],
  services: [],
};
