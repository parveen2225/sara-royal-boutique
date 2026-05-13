import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";

export async function GET() {
  try {
    await connectMongo();

    return NextResponse.json({
      success: true,
      message: "MongoDB connected successfully",
    });
  } catch (error: unknown) {
    const err = error as { message?: string; name?: string; stack?: string; cause?: unknown };
    console.error("[API /api/test] Mongo connection check failed");
    console.error("[API /api/test] Error name:", err?.name ?? "Unknown");
    console.error("[API /api/test] Error message:", err?.message ?? "Unknown error");
    if (err?.cause) {
      console.error("[API /api/test] Error cause:", err.cause);
    }
    if (err?.stack) {
      console.error("[API /api/test] Error stack:", err.stack);
    }

    return NextResponse.json({
      success: false,
      error: err?.message ?? "MongoDB connection failed",
    }, { status: 500 });
  }
}