"use client";

import axios, { type Method } from "axios";
import axiosInstance from "@/lib/axios";
import { withLoading } from "@/lib/loading/loadingStore";

export type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

/**
 * Strongly-typed API error that carries the HTTP status code.
 * Thrown by apiJson on any non-2xx response.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Options accepted by apiJson.
 * Compatible with the existing call-site pattern:
 *   apiJson(URL, { method: "POST", body: JSON.stringify(payload) })
 */
export type ApiOptions = {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
  skipLoader?: boolean;
};

/**
 * Strip the "/api" prefix so it works correctly with axiosInstance
 * whose baseURL is already "/api".
 *
 * "/api/products"    → "/products"
 * "/api/auth/login"  → "/auth/login"
 * "/products"        → "/products"  (passthrough if already stripped)
 */
const toRelativePath = (url: string): string =>
  url.startsWith("/api") ? url.slice(4) : url;

/**
 * Central API helper for all JSON requests.
 *
 * - Uses Axios under the hood (axiosInstance with baseURL "/api")
 * - Integrates with the global loading store unless skipLoader is true
 * - Throws ApiError on non-2xx responses (message extracted from body)
 */
export const apiJson = async <T,>(
  url: string,
  options?: ApiOptions,
): Promise<ApiEnvelope<T>> => {
  const req = async (): Promise<ApiEnvelope<T>> => {
    try {
      const response = await axiosInstance.request<ApiEnvelope<T>>({
        url: toRelativePath(url),
        method: (options?.method ?? "GET") as Method,
        data: options?.body ? (JSON.parse(options.body) as unknown) : undefined,
        headers: options?.headers,
      });
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          (err.response?.data as { message?: string })?.message ||
          err.message ||
          "Request failed";
        const status = err.response?.status ?? 500;
        throw new ApiError(message, status);
      }
      throw err;
    }
  };

  return options?.skipLoader ? req() : withLoading(req());
};
