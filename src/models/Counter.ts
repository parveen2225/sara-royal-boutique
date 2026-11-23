import mongoose, { Schema } from "mongoose";

// Monotonic counters (SKU, order numbers, invoice numbers). Values are only ever incremented, so numbers are never reused.
const counterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, required: true, default: 0 } });

const Counter = (mongoose.models.Counter as mongoose.Model<{ _id: string; seq: number }>) || mongoose.model("Counter", counterSchema);
export default Counter;
