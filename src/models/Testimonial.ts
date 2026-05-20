import mongoose, { type InferSchemaType, type Model } from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    reviewText: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    image: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type TestimonialDocument = InferSchemaType<typeof testimonialSchema>;

const Testimonial: Model<TestimonialDocument> =
  mongoose.models.Testimonial ||
  mongoose.model<TestimonialDocument>("Testimonial", testimonialSchema);

export default Testimonial;
