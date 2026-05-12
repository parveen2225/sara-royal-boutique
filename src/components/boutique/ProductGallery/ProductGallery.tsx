"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Navigation, Thumbs } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import "swiper/css/thumbs";
import "./ProductGallery.scss";

interface ProductGalleryProps {
  images: string[];
  name: string;
}

const ProductGallery: React.FC<ProductGalleryProps> = ({ images, name }) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperClass | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="product_gallery_single">
        <Image
          src={images[0]}
          alt={name}
          width={600}
          height={750}
          className="product_gallery_main_img"
          priority
          unoptimized={images[0].startsWith("data:")}
        />
      </div>
    );
  }

  return (
    <div className="product_gallery">
      <div className="product_gallery_main_wrap">
        <Swiper
          modules={[FreeMode, Navigation, Thumbs]}
          thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
          navigation
          loop={images.length > 1}
          onSlideChange={(s) => setActiveIdx(s.realIndex)}
          className="product_gallery_main_swiper"
        >
          {images.map((src, idx) => (
            <SwiperSlide key={idx}>
              <div className="product_gallery_slide">
                <Image
                  src={src}
                  alt={`${name} — view ${idx + 1}`}
                  width={600}
                  height={750}
                  className="product_gallery_main_img"
                  priority={idx === 0}
                  unoptimized={src.startsWith("data:")}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="product_gallery_counter">
          {activeIdx + 1} / {images.length}
        </div>
      </div>

      <div className="product_gallery_thumbs_wrap">
        <Swiper
          onSwiper={setThumbsSwiper}
          modules={[FreeMode, Thumbs]}
          direction="vertical"
          slidesPerView="auto"
          freeMode
          watchSlidesProgress
          className="product_gallery_thumb_swiper"
        >
          {images.map((src, idx) => (
            <SwiperSlide key={idx} className="product_gallery_thumb_slide">
              <div className={`product_gallery_thumb ${activeIdx === idx ? "active" : ""}`}>
                <Image
                  src={src}
                  alt={`${name} thumbnail ${idx + 1}`}
                  fill
                  className="product_gallery_thumb_img"
                  unoptimized={src.startsWith("data:")}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default ProductGallery;
