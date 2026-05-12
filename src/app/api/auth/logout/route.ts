import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { jsonMessage } from "@/lib/api/utils";

export async function POST() {
  const res = jsonMessage("Logout successful");
  res.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
