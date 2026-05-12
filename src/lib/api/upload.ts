"use client";

import axios from "axios";
import axiosInstance from "@/lib/axios";
import { ApiError } from "@/lib/api/client";

/**
 * Upload one or more image files to /api/upload.
 * Returns an array of server-stored URL strings.
 *
 * Uses multipart/form-data — Axios automatically sets the correct
 * Content-Type boundary when FormData is passed as the request body.
 */
export async function uploadImages(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  try {
    const response = await axiosInstance.post<{ data: { urls: string[] } }>(
      "/upload",
      formData,
      {
        headers: {
          // Let Axios / browser set the multipart boundary automatically
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const urls = response.data?.data?.urls;
    return Array.isArray(urls) ? urls : [];
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const message =
        (err.response?.data as { message?: string })?.message || "Upload failed";
      const status = err.response?.status ?? 500;
      throw new ApiError(message, status);
    }
    throw err;
  }
}
