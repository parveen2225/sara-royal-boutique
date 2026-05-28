"use client";

import React from "react";
import { useSyncExternalStore } from "react";
import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";
import HeroSection from "@/components/boutique/HeroSection/HeroSection";
import { useHeroBanner } from "@/hooks/useHeroBanner";
import Header from "@/components/boutique/Header/Header";
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
      <Header />
      <HeroSection banner={banner} />
      <CollectionsSection featuredProducts={featuredProducts} isLoading={isLoading} />
      <ServicesSection />
      <ReelsSection />
      <OrderingProcessSection />
      <MeasurementsGuideSection />
      <AboutSection />
      <TestimonialsSection />
      <DesignStudioSection />
      <ClassesPromoSection />
      {/* <HiringSection /> */}
      <CtaBannerSection />
      <BoutiqueFooter />
    </div>
  );
};

export default HomePage;
