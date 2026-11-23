"use client";

import React from "react";
import { useSyncExternalStore } from "react";
import HeroSection from "@/components/boutique/HeroSection/HeroSection";
import { useHeroBanner } from "@/hooks/useHeroBanner";
import ServicesSection from "@/components/ServicesSection";
import { usePublicProducts } from "@/hooks/usePublicProducts";
import { loadingStore } from "@/lib/loading/loadingStore";
import CollectionsSection from "@/components/boutique/HomePageSections/CollectionsSection/CollectionsSection";
import AboutSection from "@/components/boutique/HomePageSections/AboutSection/AboutSection";
import ClassesPromoSection from "@/components/boutique/HomePageSections/ClassesPromoSection/ClassesPromoSection";
import DesignStudioSection from "@/components/boutique/HomePageSections/DesignStudioSection/DesignStudioSection";
import HiringSection from "@/components/boutique/HomePageSections/HiringSection/HiringSection";
import CtaBannerSection from "@/components/boutique/HomePageSections/CtaBannerSection/CtaBannerSection";
import ReelsSection from "@/components/boutique/HomePageSections/ReelsSection/ReelsSection";
import TestimonialsSection from "@/components/boutique/HomePageSections/TestimonialsSection/TestimonialsSection";
import OrderingProcessSection from "@/components/boutique/HomePageSections/OrderingProcessSection/OrderingProcessSection";
import MeasurementsGuideSection from "@/components/boutique/HomePageSections/MeasurementsGuideSection/MeasurementsGuideSection";
import SuitsRail from "@/components/shop/SuitsRail";
import "./HomePage.scss";

const HomePage: React.FC = () => {
  const { banner } = useHeroBanner();
  const featuredProducts = usePublicProducts().slice(0, 6);
  const isLoading = useSyncExternalStore(
    loadingStore.subscribe,
    loadingStore.getSnapshot,
    () => false,
  );

  return (
    <div className="boutique_page">
      <HeroSection banner={banner} />
      <SuitsRail id="featured-suits" label="✦ Handpicked" title="Featured Unstitched Suits" subtitle="Premium fabrics chosen by our boutique." query={{ featured: true, limit: 4 }} />
      <SuitsRail id="new-arrivals" label="✦ Just In" title="New Arrivals" subtitle="The latest unstitched suits in our collection." query={{ sort: "newest", limit: 4 }} />
      <CollectionsSection featuredProducts={featuredProducts} isLoading={isLoading} />
      <ServicesSection />
      <ReelsSection />
      <OrderingProcessSection />
      <MeasurementsGuideSection />
      <AboutSection />
      <TestimonialsSection />
      {/* <DesignStudioSection /> */}
      <ClassesPromoSection />
      {/* <HiringSection /> */}
      <CtaBannerSection />
    </div>
  );
};

export default HomePage;
