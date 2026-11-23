import Counter from "@/models/Counter";

/** Atomically increment and return the next number for a named sequence. */
export async function nextSequence(key: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return doc.seq;
}
