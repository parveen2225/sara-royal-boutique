import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";

// Health check. Details go to the server log only; the response never exposes error text or stack traces.
export async function GET() {
  try {
    await connectMongo();
    return NextResponse.json({ success: true, message: "MongoDB connected successfully" });
  } catch (error: unknown) {
    console.error("[API /api/test] Mongo connection check failed:", (error as Error)?.message ?? "unknown error");
    return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 503 });
  }
}
