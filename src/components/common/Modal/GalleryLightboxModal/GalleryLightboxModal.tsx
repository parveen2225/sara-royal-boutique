"use client";

import React from "react";
import Image from "next/image";
import CommonModal from "@/components/common/Modal/CommonModal";
import "./GalleryLightboxModal.scss";

export type GalleryLightboxModalProps = {
  show: boolean;
  image: string;
  title: string;
  onClose: () => void;
};

const GalleryLightboxModal: React.FC<GalleryLightboxModalProps> = ({
  show,
  image,
  title,
  onClose,
}) => (
  <CommonModal
    show={show}
    handleClose={onClose}
    heading={title || "Gallery"}
    className="gallery_lightbox_modal boutique-modal"
    variant="large"
  >
    <div className="gallery_lb_wrap">
      <Image
        src={image}
        alt={title}
        width={900}
        height={1100}
        className="gallery_lb_image"
        unoptimized={image.startsWith("http")}
      />
    </div>
  </CommonModal>
);

export default GalleryLightboxModal;
