"use client";

import React from "react";
import type { StudioDesign } from "@/lib/admin/types";

type DesignBadgesProps = {
  design: Pick<
    StudioDesign,
    "featured" | "trending" | "newArrival" | "bridalSpecial"
  >;
};

const DesignBadges: React.FC<DesignBadgesProps> = ({ design }) => (
  <div className="ds_card_badges">
    {design.trending && <span className="ds_badge ds_badge_trending">Trending</span>}
    {design.featured && <span className="ds_badge ds_badge_featured">Featured</span>}
    {design.newArrival && <span className="ds_badge ds_badge_new">New</span>}
    {design.bridalSpecial && <span className="ds_badge ds_badge_bridal">Bridal</span>}
  </div>
);

export default DesignBadges;
