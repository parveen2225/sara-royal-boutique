"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/collections", label: "Collections" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin_sidebar">
      <div className="admin_brand">Sara Royal Admin</div>
      <nav className="admin_nav">
        {links.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`admin_nav_link ${active ? "is_active" : ""}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
