import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import SuitCategory from "@/models/SuitCategory";
import { jsonError, jsonOk } from "@/lib/api/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isMongoConfigured()) return jsonOk([]);
  try {
    await connectMongo();
    const cats = await SuitCategory.find({ active: true }).sort({ displayOrder: 1, name: 1 }).select("name slug description").lean();
    return jsonOk(cats.map((c) => ({ id: String(c._id), name: c.name, slug: c.slug, description: c.description })));
  } catch {
    return jsonError("Could not load categories", 500);
  }
}
