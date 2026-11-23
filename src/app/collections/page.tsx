import { Suspense } from "react";
import SuitCollectionsPage from "@/pages/SuitCollectionsPage/SuitCollectionsPage";

export const metadata = {
  title: "Unstitched Suits Collection — Sara Royal Boutique",
  description: "Shop premium unstitched ladies suit fabrics. Order on WhatsApp, delivered all over India. Stitching available.",
};

export default function Collections() {
  return (
    <Suspense fallback={null}>
      <SuitCollectionsPage />
    </Suspense>
  );
}
