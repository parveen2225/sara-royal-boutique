"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Offcanvas } from "react-bootstrap";
import Sidebar from "@/components/admin/Sidebar";
import AdminNavbar from "@/components/admin/AdminNavbar";
import { AdminProvider } from "@/components/admin/AdminProvider";
import AdminLogoutConfirmModal from "@/components/admin/modal/AdminLogoutConfirmModal/AdminLogoutConfirmModal";
import { sidebarStore } from "@/lib/admin/sidebarStore";
import { apiJson } from "@/lib/api/client";
import { AUTH } from "@/lib/api/urls";
import "../../components/admin/admin.scss";
import "../../components/admin/ui/admin-ui.scss";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const collapsed = useSyncExternalStore(sidebarStore.subscribe, sidebarStore.getSnapshot, sidebarStore.getServerSnapshot);

  // Close the mobile menu when the route changes (adjust state during render, not in an effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  const doLogout = () => {
    apiJson(AUTH.LOGOUT, { method: "POST", skipLoader: true }).finally(() => router.replace("/admin/login"));
  };

  if (isLogin) {
    return (
      <AdminProvider>
        <div className="admin_theme_dark">{children}</div>
      </AdminProvider>
    );
  }

  return (
    <AdminProvider>
      <div className={`admin_theme_dark admin_root ad_shell ${collapsed ? "is_collapsed" : ""}`}>
        <a href="#admin-main" className="ad_skip">Skip to content</a>
        <div className="ad_sidebar_wrap d-none d-lg-block">
          <Sidebar collapsed={collapsed} onToggleCollapse={sidebarStore.toggle} onLogout={() => setLogoutOpen(true)} />
        </div>
        <Offcanvas show={menuOpen} onHide={() => setMenuOpen(false)} placement="start" className="admin_drawer ad_drawer" backdrop scroll={false}>
          <Offcanvas.Header className="admin_drawer_header" closeButton closeLabel="Close menu"><Offcanvas.Title className="visually-hidden">Admin menu</Offcanvas.Title></Offcanvas.Header>
          <Offcanvas.Body className="admin_drawer_body">
            <Sidebar isDrawer onNavigate={() => setMenuOpen(false)} onLogout={() => setLogoutOpen(true)} />
          </Offcanvas.Body>
        </Offcanvas>
        <main className="admin_content ad_main">
          <AdminNavbar onMenuOpen={() => setMenuOpen(true)} onLogout={() => setLogoutOpen(true)} />
          <div className="admin_content_inner ad_content" id="admin-main" tabIndex={-1}>
            {children}
          </div>
        </main>
        <AdminLogoutConfirmModal show={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={doLogout} />
      </div>
    </AdminProvider>
  );
}
