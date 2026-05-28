"use client";

import React from "react";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonModal from "@/components/common/Modal/CommonModal";
import "./AdminDeleteConfirmModal.scss";

export type AdminDeleteConfirmModalProps = {
  show: boolean;
  heading: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
};

const AdminDeleteConfirmModal: React.FC<AdminDeleteConfirmModalProps> = ({
  show,
  heading,
  message,
  confirmLabel = "Delete",
  onClose,
  onConfirm,
}) => (
  <CommonModal
    show={show}
    handleClose={onClose}
    heading={heading}
    backdrop="static"
    className="admin_delete_confirm_modal admin_delete_modal"
  >
    <p className="admin_delete_confirm_msg">{message}</p>
    <div className="admin_delete_confirm_actions">
      <CommonButton className="admin_outline_btn admin_sm_btn" onClick={onClose}>
        Cancel
      </CommonButton>
      <CommonButton className="admin_danger_btn admin_sm_btn" onClick={onConfirm}>
        {confirmLabel}
      </CommonButton>
    </div>
  </CommonModal>
);

export default AdminDeleteConfirmModal;
