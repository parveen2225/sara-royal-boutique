// Dependency-free helpers for Cloudinary delivery URLs (unit-tested).

export const CLOUDINARY_HOST = "res.cloudinary.com";

/** https URL on res.cloudinary.com only (the only host next/image and the admin accept for suit photos). */
export function isCloudinaryImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname === CLOUDINARY_HOST && !u.username && !u.password && u.pathname.includes("/image/upload/");
  } catch {
    return false;
  }
}

/** Extract the public id from a plain (untransformed) Cloudinary URL, or "" when it cannot be derived safely. */
export function publicIdFromUrl(url: string): string {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const idx = path.indexOf("/image/upload/");
    if (idx === -1) return "";
    let rest = path.slice(idx + "/image/upload/".length);
    if (rest.includes(",")) return ""; // transformation segment present: do not guess
    rest = rest.replace(/^v\d+\//, "");
    const withoutExt = rest.replace(/\.[a-z0-9]{2,5}$/i, "");
    return withoutExt && !withoutExt.includes("..") ? withoutExt : "";
  } catch {
    return "";
  }
}
