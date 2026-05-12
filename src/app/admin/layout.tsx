 "use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import AdminNavbar from "@/components/admin/AdminNavbar";
import { AdminProvider } from "@/components/admin/AdminProvider";
import "../../components/admin/admin.scss";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return <AdminProvider><div className="admin_theme_dark">{children}</div></AdminProvider>;
  }

  return (
    <AdminProvider>
      <div className="admin_theme_dark admin_root">
        <Sidebar />
        <main className="admin_content">
          <AdminNavbar />
          {children}
        </main>
      </div>
    </AdminProvider>
  );
}
