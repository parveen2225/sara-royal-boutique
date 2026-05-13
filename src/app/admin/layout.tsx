 "use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Offcanvas } from "react-bootstrap";
import Sidebar from "@/components/admin/Sidebar";
import AdminNavbar from "@/components/admin/AdminNavbar";
import { AdminProvider } from "@/components/admin/AdminProvider";
import "../../components/admin/admin.scss";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isLogin) {
    return (
      <AdminProvider>
        <div className="admin_theme_dark">{children}</div>
      </AdminProvider>
    );
  }

  return (
    <AdminProvider>
      <div className="admin_theme_dark admin_root">
        <Sidebar />
        <Offcanvas
          show={menuOpen}
          onHide={() => setMenuOpen(false)}
          placement="start"
          className="admin_drawer"
          backdrop
          scroll={false}
        >
          <Offcanvas.Header className="admin_drawer_header" closeButton />
          <Offcanvas.Body className="admin_drawer_body">
            <Sidebar isDrawer onNavigate={() => setMenuOpen(false)} />
          </Offcanvas.Body>
        </Offcanvas>
        <main className="admin_content">
          <AdminNavbar onMenuOpen={() => setMenuOpen(true)} />
          {children}
        </main>
      </div>
    </AdminProvider>
  );
}
