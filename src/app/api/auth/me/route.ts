import { jsonError, jsonOk } from "@/lib/api/utils";
import { getAuthUser } from "@/lib/auth/permissions";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if ("error" in user) return user.error;
  if (!user) return jsonError("Unauthorized", 401);
  return jsonOk(user);
}
