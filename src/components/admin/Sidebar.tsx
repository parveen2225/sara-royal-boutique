"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/collections", label: "Collections" },
];

type SidebarProps = {
  onNavigate?: () => void;
  isDrawer?: boolean;
};

export default function Sidebar({ onNavigate, isDrawer = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`admin_sidebar ${isDrawer ? "admin_sidebar_drawer" : ""}`}>
      <Link href="/admin/dashboard" className="admin_brand" onClick={onNavigate}>
        <Image
          src="/images/logo_3.png"
          alt="Sara Royal"
          width={168}
          height={42}
          className="admin_brand_logo admin_brand_logo_full"
          unoptimized
        />
        <Image
          src="/images/logo_icon.png"
          alt="Sara Royal"
          width={36}
          height={36}
          className="admin_brand_logo admin_brand_logo_icon"
          unoptimized
        />
      </Link>
      <nav className="admin_nav">
        {adminLinks.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin_nav_link ${active ? "is_active" : ""}`}
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
