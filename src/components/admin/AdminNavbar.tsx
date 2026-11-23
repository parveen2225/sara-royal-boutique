"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dropdown } from "react-bootstrap";
import { useCurrentAdmin } from "@/lib/admin/useCurrentAdmin";
import { breadcrumb } from "@/lib/admin/nav";
import AdminIcon from "@/components/admin/ui/AdminIcon";

type AdminNavbarProps = { onMenuOpen?: () => void; onLogout: () => void };

export default function AdminNavbar({ onMenuOpen, onLogout }: AdminNavbarProps) {
  const pathname = usePathname();
  const { user } = useCurrentAdmin();
  const trail = breadcrumb(pathname);
  const initial = (user?.name || user?.email || "A").trim().charAt(0).toUpperCase();
  const roleLabel = user ? (user.role === "owner" ? "Owner" : "Staff") : "";

  return (
    <header className="admin_topbar ad_topbar">
      <div className="ad_topbar_left">
        <button type="button" className="ad_icon_btn admin_menu_toggle d-lg-none" onClick={onMenuOpen} aria-label="Open admin menu"><AdminIcon name="menu" size={20} /></button>
        <Link href="/admin/dashboard" className="admin_topbar_brand ad_topbar_brand" aria-label="Sara Royal Boutique admin home">
          <Image src="/images/logo_icon.png" alt="" width={32} height={32} className="admin_brand_logo" unoptimized />
        </Link>
        <nav aria-label="Breadcrumb" className="ad_crumbs">
          <ol>
            {trail.map((t, i) => (
              <li key={`${t}-${i}`} aria-current={i === trail.length - 1 ? "page" : undefined} className={i === trail.length - 1 ? "is_current" : ""}>{t}</li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="ad_topbar_right">
        {roleLabel && <span className={`ad_role_chip ${user?.role === "owner" ? "is_owner" : ""}`}>{roleLabel}</span>}
        <Dropdown align="end" className="ad_account">
          <Dropdown.Toggle as="button" type="button" className="ad_account_btn" id="admin-account-menu" aria-label="Account menu">
            <span className="ad_avatar" aria-hidden="true">{initial}</span>
            <span className="ad_account_name">{user?.name ?? "Account"}</span>
            <AdminIcon name="down" size={14} className="ad_account_caret" />
          </Dropdown.Toggle>
          <Dropdown.Menu popperConfig={{ strategy: "fixed" }} className="ad_menu">
            {user && (
              <div className="ad_menu_head">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
                <span className="ad_menu_role">{roleLabel}</span>
              </div>
            )}
            <Dropdown.Item as={Link} href="/admin/account"><AdminIcon name="user" size={16} /> My Account</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item as="button" type="button" className="is_danger" onClick={onLogout}><AdminIcon name="logout" size={16} /> Logout</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  );
}
