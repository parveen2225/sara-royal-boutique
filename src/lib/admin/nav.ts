import type { IconName } from "@/components/admin/ui/AdminIcon";

// Single source of truth for the admin navigation: drives the sidebar groups AND the header breadcrumb.
// access: "owner" = Owner only; "shop" = Owner, or staff with the matching permission (see lib/admin/access.ts); "any" = everyone signed in.
export type NavItem = { href: string; label: string; icon: IconName; access: "owner" | "shop" | "any" };
export type NavGroup = { title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  { title: "Overview", items: [
    { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard", access: "owner" },
    { href: "/admin/shop", label: "Shop Dashboard", icon: "chart", access: "shop" },
  ] },
  { title: "Unstitched Suits", items: [
    { href: "/admin/suits", label: "Suits", icon: "suits", access: "shop" },
    { href: "/admin/suit-categories", label: "Categories", icon: "tag", access: "shop" },
    { href: "/admin/orders", label: "Suit Orders", icon: "bag", access: "shop" },
    { href: "/admin/returns", label: "Returns", icon: "undo", access: "shop" },
    { href: "/admin/refunds", label: "Refunds", icon: "wallet", access: "shop" },
  ] },
  { title: "Boutique Management", items: [
    { href: "/admin/products", label: "Products", icon: "package", access: "owner" },
    { href: "/admin/services", label: "Services", icon: "scissors", access: "owner" },
    { href: "/admin/collections", label: "Collections / Stitching", icon: "grid", access: "owner" },
    { href: "/admin/design-studio", label: "Design Studio", icon: "palette", access: "owner" },
    { href: "/admin/gallery", label: "Gallery", icon: "image", access: "owner" },
    { href: "/admin/hero-banner", label: "Hero Banner", icon: "banner", access: "owner" },
    { href: "/admin/reels", label: "Reels", icon: "film", access: "owner" },
    { href: "/admin/testimonials", label: "Testimonials", icon: "chat", access: "owner" },
  ] },
  { title: "Business", items: [
    { href: "/admin/reports", label: "Reports", icon: "file", access: "shop" },
    { href: "/admin/settings", label: "Settings", icon: "settings", access: "owner" },
    { href: "/admin/staff", label: "Staff", icon: "users", access: "owner" },
    { href: "/admin/audit", label: "Audit Logs", icon: "shield", access: "owner" },
  ] },
  { title: "Account", items: [{ href: "/admin/account", label: "My Account", icon: "user", access: "any" }] },
];

export const isActivePath = (pathname: string | null, href: string) => !!pathname && (pathname === href || pathname.startsWith(`${href}/`));

const OBJECT_ID = /^[a-f\d]{24}$/i;
const SUB_LABELS: Record<string, string> = { add: "Add", new: "New", edit: "Edit" };

/** Breadcrumb for the header: [group, section, (sub-page)]. The last entry is the current page. */
export function breadcrumb(pathname: string | null): string[] {
  if (!pathname) return ["Admin"];
  for (const g of NAV_GROUPS) {
    const item = g.items.filter((i) => isActivePath(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
    if (!item) continue;
    const rest = pathname.slice(item.href.length).split("/").filter(Boolean);
    const trail = g.items.length === 1 ? [item.label] : [g.title, item.label];
    if (rest.length === 0) return trail;
    const last = rest[rest.length - 1];
    return [...trail, SUB_LABELS[last] ?? (OBJECT_ID.test(rest[0]) ? (last === "edit" ? "Edit" : "Details") : last.replace(/-/g, " "))];
  }
  return ["Admin"];
}
