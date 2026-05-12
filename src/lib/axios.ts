"use client";

import axios from "axios";

/**
 * Shared Axios instance for all internal Next.js API calls.
 *
 * baseURL is set to "/api" so callers use relative paths like
 * "/collections", "/products", "/auth/login" etc.
 *
 * withCredentials ensures the JWT admin_session cookie is always
 * sent with every request (required for protected admin routes).
 */
const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
