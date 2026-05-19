"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { type Product } from "@/data/products";
import { getProductWhatsAppUrl } from "@/utils/whatsapp";
import { BoutiqueWhatsAppIcon } from "@/assets/icons/svgIcon";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import "./ProductCard.scss";

interface ProductCardProps {
  product: Product;
  className?: string;
}

const getAutoplayOffset = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1200;
  }
  return hash;
};

const ProductCard: React.FC<ProductCardProps> = ({ product, className = "" }) => {
  const images: string[] =
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : product.image
      ? [product.image]
      : [];

  const hasMultiple = images.length > 1;
  const sliderDelayMs =
    typeof product.sliderDelayMs === "number" && product.sliderDelayMs >= 500
      ? product.sliderDelayMs
      : 3200;
  const autoplayDelay = sliderDelayMs + getAutoplayOffset(product.id);

  return (
    <article className={`product_card ${className}`}>
      <Link href={`/product/${product.id}`} className="product_card_image_wrap" aria-label={product.name}>
        {hasMultiple ? (
          <div className="product_card_slider_wrap">
            <Swiper
              modules={[Pagination, Autoplay]}
              pagination={{ clickable: true, dynamicBullets: true }}
              loop
              autoplay={{
                delay: autoplayDelay,
                disableOnInteraction: true,
                pauseOnMouseEnter: true,
              }}
              className="product_card_swiper"
            >
              {images.map((src, idx) => (
                <SwiperSlide key={idx}>
                  <div className="product_card_img_inner">
                    <Image
                      src={src}
                      alt={`${product.name} ${idx + 1}`}
                      fill
                      sizes="(max-width: 575px) 100vw, (max-width: 991px) 50vw, 33vw"
                      className="product_card_img"
                      unoptimized={src.startsWith("data:")}
                      priority={idx === 0}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
            <div className="product_card_shimmer" aria-hidden="true" />
          </div>
        ) : (
          <div className="product_card_img_inner_single">
            <Image
              src={images[0] ?? "/images/Designer_Suits5.webp"}
              alt={product.name}
              fill
              sizes="(max-width: 575px) 100vw, (max-width: 991px) 50vw, 33vw"
              className="product_card_img"
              unoptimized={images[0]?.startsWith("data:")}
            />
            <div className="product_card_shimmer" aria-hidden="true" />
          </div>
        )}

        {product.category && (
          <span className="product_card_category">{product.category}</span>
        )}
        <div className="product_card_overlay">
          <span className="product_card_view">View Details</span>
        </div>
      </Link>

      <div className="product_card_body">
        <Link href={`/product/${product.id}`} className="product_card_name_link">
          <h5 className="product_card_name">{product.name}</h5>
        </Link>
        {product.price && (
          <div className="product_card_price_wrap">
            <span className="product_card_price_label">Stitching Price</span>
            <p className="product_card_price">{product.price}</p>
          </div>
        )}
        <CommonButton
          role="link"
          to={getProductWhatsAppUrl(product.name, product.price)}
          target="_blank"
          rel="noopener noreferrer"
          className="product_card_cta"
          ariaLabel={`Order ${product.name} on WhatsApp`}
          svgIcon={<BoutiqueWhatsAppIcon width={15} height={15} />}
        >
          Order on WhatsApp
        </CommonButton>
      </div>
    </article>
  );
};

export default ProductCard;
