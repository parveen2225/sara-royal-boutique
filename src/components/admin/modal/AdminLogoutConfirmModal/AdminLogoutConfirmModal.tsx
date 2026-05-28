"use client";

import React from "react";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonModal from "@/components/common/Modal/CommonModal";
import "./AdminLogoutConfirmModal.scss";

export type AdminLogoutConfirmModalProps = {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const AdminLogoutConfirmModal: React.FC<AdminLogoutConfirmModalProps> = ({
  show,
  onClose,
  onConfirm,
}) => (
  <CommonModal
    show={show}
    handleClose={onClose}
    heading="Confirm Logout"
    variant="small"
    className="admin_logout_confirm_modal"
  >
    <p className="admin_logout_confirm_msg">Are you sure you want to logout?</p>
    <div className="admin_logout_confirm_actions">
      <CommonButton className="admin_outline_btn w-50" onClick={onClose} type="button">
        No
      </CommonButton>
      <CommonButton
        className="admin_primary_btn w-50"
        onClick={() => {
          onClose();
          onConfirm();
        }}
        type="button"
      >
        Yes
      </CommonButton>
    </div>
  </CommonModal>
);

export default AdminLogoutConfirmModal;
