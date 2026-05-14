"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api/client";
import { AUTH } from "@/lib/api/urls";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonModal from "@/components/common/Modal/CommonModal";

type AdminNavbarProps = {
  onMenuOpen?: () => void;
};

export default function AdminNavbar({ onMenuOpen }: AdminNavbarProps) {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const onLogout = () => {
    apiJson(AUTH.LOGOUT, { method: "POST", skipLoader: true })
      .finally(() => router.replace("/admin/login"));
  };

  return (
    <header className="admin_topbar">
      <div className="admin_topbar_left">
        <Link href="/admin/dashboard" className="admin_topbar_brand">
          <Image
            src="/images/logo_3.png"
            alt="Sara Royal"
            width={148}
            height={36}
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

        <div className="admin_topbar_titles">
          <p className="admin_topbar_title">Admin Panel</p>
          <p className="admin_topbar_subtitle">Manage boutique products and collections</p>
        </div>
      </div>

      <div className="admin_topbar_actions">
        <CommonButton
          className="admin_outline_btn admin_logout_btn"
          onClick={() => setShowLogoutConfirm(true)}
        >
          Logout
        </CommonButton>
        <CommonButton
          className="admin_menu_toggle d-flex d-lg-none"
          onClick={onMenuOpen}
          ariaLabel="Open admin menu"
        >
          <span />
          <span />
          <span />
        </CommonButton>
      </div>

      <CommonModal
        show={showLogoutConfirm}
        handleClose={() => setShowLogoutConfirm(false)}
        heading="Confirm Logout"
        variant="small"
      >
        <h6 className="mb-5 mt-3 text-center">Are you sure you want to logout?</h6>
        <div className="d-flex justify-content-between gap-2">
          <CommonButton
            className="admin_outline_btn w-50"
            onClick={() => setShowLogoutConfirm(false)}
            type="button"
          >
            No
          </CommonButton>
          <CommonButton
            className="admin_primary_btn w-50"
            onClick={() => {
              setShowLogoutConfirm(false);
              onLogout();
            }}
            type="button"
          >
            Yes
          </CommonButton>
        </div>
      </CommonModal>
    </header>
  );
}
