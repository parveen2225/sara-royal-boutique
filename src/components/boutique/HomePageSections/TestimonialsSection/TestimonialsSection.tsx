"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Container } from "react-bootstrap";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { useTestimonials } from "@/hooks/useTestimonials";
import { getReviewAvatarUrl, SARA_ROYAL_GOOGLE_MAPS_URL } from "@/data/googleReviews";
import "./TestimonialsSection.scss";

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="testimonial_stars" aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? "star filled" : "star"} aria-hidden="true">
        ★
      </span>
    ))}
  </div>
);

const TestimonialsSection: React.FC = () => {
  const { testimonials, isLoading } = useTestimonials();

  const slides = useMemo(
    () =>
      testimonials.map((item) => ({
        ...item,
        avatarSrc: item.image?.trim() || getReviewAvatarUrl(item.customerName),
      })),
    [testimonials],
  );

  const canLoop = slides.length >= 3;

  return (
    <section className="testimonials_section py-section" id="testimonials">
      <div className="testimonials_section_glow" aria-hidden="true" />
      <Container className="testimonials_container">
        <div className="testimonials_header text-center mb-4">
          <span className="section_label">Client Love</span>
          <h2 className="section_title">What Our Clients Say</h2>
          <p className="section_sub mx-auto">
            Real Google reviews from Sara Royal Boutique, Kharar (5.0 ★ · 27 reviews on Google).
          </p>
          <a
            href={SARA_ROYAL_GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="testimonials_maps_link"
          >
            View on Google Maps
          </a>
        </div>

        {isLoading ? (
          <div className="testimonials_skeleton_row" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <div key={n} className="testimonial_skeleton" />
            ))}
          </div>
        ) : (
          <div className="testimonials_slider_wrap">
            <Swiper
              modules={[Autoplay]}
              slidesPerView={1}
              spaceBetween={20}
              loop={canLoop}
              speed={900}
              allowTouchMove
              autoplay={{
                delay: 2800,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
                reverseDirection: false,
                waitForTransition: true,
              }}
              breakpoints={{
                576: { slidesPerView: 1.15, spaceBetween: 18 },
                768: { slidesPerView: 2, spaceBetween: 20 },
                1200: { slidesPerView: 3, spaceBetween: 24 },
                1400: { slidesPerView: 3.2, spaceBetween: 24 },
              }}
              className="testimonials_swiper testimonials_swiper_continuous"
            >
              {slides.map((item) => (
                <SwiperSlide key={item.id} className="testimonials_slide">
                  <article className="testimonial_card">
                    <div className="testimonial_card_quote" aria-hidden="true">
                      &ldquo;
                    </div>
                    <p className="testimonial_text">{item.reviewText}</p>
                    <div className="testimonial_card_footer">
                      <div className="testimonial_avatar">
                        <Image
                          src={item.avatarSrc}
                          alt={`${item.customerName} profile`}
                          width={52}
                          height={52}
                          className="testimonial_avatar_img"
                          unoptimized
                        />
                      </div>
                      <div className="testimonial_meta">
                        <h3 className="testimonial_name">{item.customerName}</h3>
                        <StarRating rating={item.rating} />
                        <span className="testimonial_verified">Google Review</span>
                      </div>
                      <span className="testimonial_google_badge" aria-hidden="true">
                        G
                      </span>
                    </div>
                  </article>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </Container>
    </section>
  );
};

export default TestimonialsSection;
