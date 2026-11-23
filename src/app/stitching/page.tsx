import CollectionsPage from "@/pages/CollectionsPage/CollectionsPage";

export const metadata = {
  title: "Stitching Designs — Sara Royal Boutique",
  description: "Browse our custom stitching designs by service: lawn, formal, bridal, casual and embroidered suits — all custom stitched.",
};

// The original "Collections" experience (stitching designs by service), kept intact and moved here.
export default function Stitching() {
  return <CollectionsPage />;
}
