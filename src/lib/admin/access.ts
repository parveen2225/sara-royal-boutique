// Which admin pages a staff account may open. The server enforces permissions on every API; this only drives the
// sidebar and redirects. Anything not listed is owner-only.
export type StaffPerm = "products" | "orders" | "stock" | "returns" | "reports";
export const STAFF_ROUTES: { prefix: string; perm: StaffPerm | "any"; label: string }[] = [
  { prefix: "/admin/shop", perm: "reports", label: "Shop Dashboard" },
  { prefix: "/admin/orders", perm: "orders", label: "Suit Orders" },
  { prefix: "/admin/returns", perm: "returns", label: "Returns" },
  { prefix: "/admin/refunds", perm: "returns", label: "Refunds" },
  { prefix: "/admin/suits", perm: "products", label: "Unstitched Suits" },
  { prefix: "/admin/suit-categories", perm: "products", label: "Suit Categories" },
  { prefix: "/admin/reports", perm: "reports", label: "Reports" },
  { prefix: "/admin/account", perm: "any", label: "My Account" },
];

export const canStaffOpen = (path: string, perms: Partial<Record<StaffPerm, boolean>>) =>
  STAFF_ROUTES.some((r) => (path === r.prefix || path.startsWith(`${r.prefix}/`)) && (r.perm === "any" || perms[r.perm]));

export const firstStaffRoute = (perms: Partial<Record<StaffPerm, boolean>>) =>
  STAFF_ROUTES.find((r) => r.perm !== "any" && perms[r.perm as StaffPerm])?.prefix ?? "/admin/account";
