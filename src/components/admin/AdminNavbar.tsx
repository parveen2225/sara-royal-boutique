"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api/client";
import { AUTH } from "@/lib/api/urls";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonModal from "@/components/common/Modal/CommonModal";

export default function AdminNavbar() {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const onLogout = () => {
    apiJson(AUTH.LOGOUT, { method: "POST", skipLoader: true })
      .finally(() => router.replace("/admin/login"));
  };

  return (
    <header className="admin_topbar">
      <div>
        <p className="admin_topbar_title">Admin Panel</p>
        <p className="admin_topbar_subtitle">Manage boutique products and collections</p>
      </div>
      <CommonButton className="admin_outline_btn" onClick={() => setShowLogoutConfirm(true)}>
        Logout
      </CommonButton>

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
