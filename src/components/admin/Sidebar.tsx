"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentAdmin } from "@/lib/admin/useCurrentAdmin";
import { canStaffOpen } from "@/lib/admin/access";
import { NAV_GROUPS, isActivePath, type NavItem } from "@/lib/admin/nav";
import AdminIcon from "@/components/admin/ui/AdminIcon";

export const adminLinks: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

type SidebarProps = {
  onNavigate?: () => void;
  isDrawer?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onLogout: () => void;
};

export default function Sidebar({ onNavigate, isDrawer = false, collapsed = false, onToggleCollapse, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useCurrentAdmin();
  const mini = collapsed && !isDrawer;

  // Until the server answers, show everything (unchanged for owners); staff then only see what they may use.
  const allowed = (item: NavItem) => {
    if (!user || user.role === "owner") return true;
    if (item.access === "any") return true;
    return item.access === "shop" && canStaffOpen(item.href, user.permissions);
  };
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter(allowed) })).filter((g) => g.items.length > 0);

  return (
    <aside className={`admin_sidebar ad_sidebar ${isDrawer ? "admin_sidebar_drawer" : ""} ${mini ? "is_collapsed" : ""}`}>
      <div className="ad_side_head">
        <Link href={user && user.role === "staff" ? "/admin/account" : "/admin/dashboard"} className="admin_brand" onClick={onNavigate} aria-label="Sara Royal Boutique admin home">
          <Image src="/images/logo_3.png" alt="Sara Royal" width={168} height={42} className="admin_brand_logo admin_brand_logo_full" unoptimized />
          <Image src="/images/logo_icon.png" alt="Sara Royal" width={36} height={36} className="admin_brand_logo admin_brand_logo_icon" unoptimized />
        </Link>
        {!isDrawer && onToggleCollapse && (
          <button type="button" className="ad_icon_btn ad_collapse_btn" onClick={onToggleCollapse} aria-label={mini ? "Expand sidebar" : "Collapse sidebar"} aria-pressed={mini} title={mini ? "Expand sidebar" : "Collapse sidebar"}>
            <AdminIcon name={mini ? "right" : "left"} size={16} />
          </button>
        )}
      </div>

      <nav className="admin_nav ad_nav" aria-label="Admin navigation">
        {groups.map((g) => (
          <div className="ad_nav_group" key={g.title}>
            <p className="ad_nav_title">{g.title}</p>
            {g.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={`admin_nav_link ad_nav_link ${active ? "is_active" : ""}`} onClick={onNavigate} aria-current={active ? "page" : undefined} title={mini ? item.label : undefined}>
                  <AdminIcon name={item.icon} size={18} />
                  <span className="ad_nav_label">{item.label}</span>
                </Link>
              );
            })}
            {g.title === "Account" && (
              <button type="button" className="admin_nav_link ad_nav_link ad_nav_logout" onClick={() => { onNavigate?.(); onLogout(); }} title={mini ? "Logout" : undefined}>
                <AdminIcon name="logout" size={18} />
                <span className="ad_nav_label">Logout</span>
              </button>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
