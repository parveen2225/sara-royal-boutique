import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import Testimonial from "@/models/Testimonial";
import { GOOGLE_REVIEWS } from "@/data/googleReviews";
import { formatTestimonial } from "@/lib/api/utils";
import { getFallbackTestimonials } from "@/lib/fallbackState";
import type { Testimonial as TestimonialDto } from "@/lib/admin/types";

/** Insert default Google reviews when the collection is empty (first load / fresh DB). */
export const ensureTestimonialsSeeded = async (): Promise<void> => {
  if (!isMongoConfigured()) return;

  await connectMongo();
  const count = await Testimonial.countDocuments();
  if (count > 0) return;

  const seedRows = GOOGLE_REVIEWS.map(({ id: _id, ...rest }) => rest);
  await Testimonial.insertMany(seedRows);
};

export const getStoredTestimonials = async (options?: {
  includeInactive?: boolean;
}): Promise<TestimonialDto[]> => {
  const includeInactive = options?.includeInactive ?? false;

  if (!isMongoConfigured()) {
    return getFallbackTestimonials();
  }

  try {
    await connectMongo();
    await ensureTestimonialsSeeded();

    const filter = includeInactive ? {} : { isActive: true };
    const docs = await Testimonial.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return docs.map((doc) => formatTestimonial(doc) as TestimonialDto);
  } catch (error) {
    console.error("[testimonials/store] read failed, using fallback", error);
    return getFallbackTestimonials();
  }
};
