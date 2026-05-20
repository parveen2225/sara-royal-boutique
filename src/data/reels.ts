import type { Reel } from "@/lib/admin/types";

export type ReelSeed = Omit<Reel, "createdAt" | "updatedAt">;

/** Temporary demo reels when MongoDB has no reels yet. */
export const DEFAULT_REELS: ReelSeed[] = [
  {
    id: "demo-reel-bridal",
    title: "Bridal Suit Fitting",
    instagramUrl: "https://www.instagram.com/reel/DDemoBridal01/",
    thumbnail: "/images/Designer_Suits5.webp",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "demo-reel-anarkali",
    title: "Anarkali Stitching",
    instagramUrl: "https://www.instagram.com/reel/DDemoAnarkali02/",
    thumbnail: "/images/Designer_Suits3.webp",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "demo-reel-party",
    title: "Party Wear Collection",
    instagramUrl: "https://www.instagram.com/reel/DDemoParty03/",
    thumbnail: "/images/Designer_Suits2.webp",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "demo-reel-kurti",
    title: "Designer Kurti",
    instagramUrl: "https://www.instagram.com/reel/DDemoKurti04/",
    thumbnail: "/images/kide_war1.png",
    sortOrder: 4,
    isActive: true,
  },
];
