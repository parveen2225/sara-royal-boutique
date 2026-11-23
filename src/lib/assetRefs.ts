import UnstitchedSuit from "@/models/UnstitchedSuit";
import SiteSettings from "@/models/SiteSettings";
import Product from "@/models/Product";
import Service from "@/models/Service";
import HeroBanner from "@/models/HeroBanner";
import Reel from "@/models/Reel";
import Testimonial from "@/models/Testimonial";
import GalleryItem from "@/models/GalleryItem";
import Design from "@/models/Design";
import DesignCategory from "@/models/DesignCategory";
import DesignSubcategory from "@/models/DesignSubcategory";
import SuitReturn from "@/models/SuitReturn";

type Q = { countDocuments: (f: Record<string, unknown>) => Promise<number> };

/**
 * Is this image URL used by ANY record in the system? Checked before any Cloudinary deletion so an image shared
 * by several records (or by a different feature such as products or the gallery) is never removed.
 * `excludeSuitId` ignores one suit (the one being edited or deleted).
 */
export async function isUrlReferenced(url: string, opts: { excludeSuitId?: string } = {}): Promise<boolean> {
  const suitFilter: Record<string, unknown> = { $or: [{ "fabricImages.url": url }, { "referenceImages.url": url }] };
  if (opts.excludeSuitId) suitFilter._id = { $ne: opts.excludeSuitId };
  const checks: [Q, Record<string, unknown>][] = [
    [UnstitchedSuit as unknown as Q, suitFilter],
    [SiteSettings as unknown as Q, { "logo.url": url }],
    [Product as unknown as Q, { $or: [{ imageUrl: url }, { imageUrls: url }] }],
    [Service as unknown as Q, { imageUrl: url }],
    [HeroBanner as unknown as Q, { image: url }],
    [Reel as unknown as Q, { thumbnail: url }],
    [Testimonial as unknown as Q, { image: url }],
    [GalleryItem as unknown as Q, { image: url }],
    [Design as unknown as Q, { $or: [{ thumbnailImage: url }, { galleryImages: url }] }],
    [DesignCategory as unknown as Q, { image: url }],
    [DesignSubcategory as unknown as Q, { image: url }],
    [SuitReturn as unknown as Q, { "photos.url": url }],
  ];
  for (const [model, filter] of checks) if ((await model.countDocuments(filter)) > 0) return true;
  return false;
}

/** Filter a list of images down to those nobody else references (safe to delete from Cloudinary). */
export async function unreferencedImages<T extends { url: string }>(images: T[], opts: { excludeSuitId?: string } = {}): Promise<T[]> {
  const out: T[] = [];
  for (const img of images) if (!(await isUrlReferenced(img.url, opts))) out.push(img);
  return out;
}
