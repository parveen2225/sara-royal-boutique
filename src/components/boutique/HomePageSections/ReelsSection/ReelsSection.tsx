"use client";

import React from "react";
import Image from "next/image";
import { Container } from "react-bootstrap";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import { useReels } from "@/hooks/useReels";
import { BoutiqueInstagramIcon } from "@/assets/icons/svgIcon";
import "./ReelsSection.scss";

const ReelsSection: React.FC = () => {
  const { reels, isLoading } = useReels();

  return (
    <section className="reels_section py-section" id="reels">
      <Container>
        <div className="reels_section_header text-center mb-5">
          <span className="section_label">Instagram</span>
          <h2 className="section_title">Latest Reels</h2>
          <p className="section_sub mx-auto">
            Watch our latest stitching transformations, fabric selections, and boutique
            moments from Sara Royal.
          </p>
        </div>

        {isLoading ? (
          <div className="reels_skeleton_row" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="reel_skeleton_card" />
            ))}
          </div>
        ) : (
          <Swiper
            modules={[FreeMode, Navigation]}
            slidesPerView={1.2}
            spaceBetween={16}
            freeMode
            navigation
            breakpoints={{
              576: { slidesPerView: 2.2, spaceBetween: 18 },
              768: { slidesPerView: 3, spaceBetween: 20 },
              1200: { slidesPerView: 4, spaceBetween: 24 },
            }}
            className="reels_swiper"
          >
            {reels.map((reel) => (
              <SwiperSlide key={reel.id}>
                <a
                  href={reel.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="reel_card"
                  aria-label={`Watch ${reel.title} on Instagram`}
                >
                  <div className="reel_card_thumb">
                    <Image
                      src={reel.thumbnail}
                      alt={reel.title}
                      fill
                      sizes="(max-width: 768px) 45vw, 22vw"
                      className="reel_card_image"
                      unoptimized={reel.thumbnail.startsWith("http")}
                    />
                    <span className="reel_card_play" aria-hidden="true">
                      <BoutiqueInstagramIcon width={22} height={22} />
                    </span>
                    <div className="reel_card_body">
                      <h3 className="reel_card_title">{reel.title}</h3>
                      <span className="reel_card_cta">Watch Reel</span>
                    </div>
                  </div>
                </a>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </Container>
    </section>
  );
};

export default ReelsSection;
