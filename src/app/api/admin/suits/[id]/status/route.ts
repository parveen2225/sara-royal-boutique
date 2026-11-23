import type { NextRequest } from "next/server";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { BadRequestError, isObjectId, readJsonBody } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// Allowed moves. Archived suits can only be restored to Draft (never straight to Published).
const TRANSITIONS: Record<string, string[]> = {
  draft: ["published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requirePermission(req, "products");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Suit not found", 404);
  try {
    const { status } = await readJsonBody(req);
    if (typeof status !== "string" || !["draft", "published", "archived"].includes(status)) return jsonError("Status must be draft, published or archived.", 400);
    const suit = await UnstitchedSuit.findById(id);
    if (!suit) return jsonError("Suit not found", 404);
    if (suit.status === status) return jsonError(`Suit is already ${status}.`, 409);
    if (!TRANSITIONS[suit.status].includes(status)) return jsonError(suit.status === "archived" ? "Restore an archived suit to Draft first." : `Cannot change a ${suit.status} suit to ${status}.`, 409);
    const from = suit.status;
    suit.status = status;
    await suit.save(); // enforces "published needs at least one fabric image"
    await logAudit(auth.user, "suit.status_changed", { type: "suit", id }, `${suit.sku}: ${from} → ${status}`);
    return jsonOk({ id, sku: suit.sku, status: suit.status });
  } catch (error) {
    if (error instanceof BadRequestError) return jsonError(error.message, 400);
    if ((error as { name?: string })?.name === "ValidationError") return jsonError(Object.values((error as { errors: Record<string, { message: string }> }).errors)[0]?.message ?? "Invalid suit", 400);
    console.error("[API /admin/suits/:id/status]", error instanceof Error ? error.message : error);
    return jsonError("Could not change status", 500);
  }
}
