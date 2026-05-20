import type { GalleryCategory } from "@/lib/admin/types";

export type GallerySeedItem = {
  id: string;
  title: string;
  image: string;
  category: GalleryCategory;
  sortOrder: number;
  isActive: boolean;
};

/** Portfolio images from /public/images — used when gallery DB is empty. */
export const DEFAULT_GALLERY_ITEMS: GallerySeedItem[] = [
  {
    id: "gal-bridal-1",
    title: "Blush Rose Bridal Set",
    image: "/images/Designer_Suits2.jpg",
    category: "Bridal",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "gal-bridal-2",
    title: "Bridal Couture Ensemble",
    image: "/images/bridal_couture_1.png",
    category: "Bridal",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "gal-bridal-3",
    title: "Royal Bridal Finish",
    image: "/images/bridal_couture_3.png",
    category: "Bridal",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "gal-anarkali-1",
    title: "Mohey Floral Anarkali",
    image: "/images/Mohey_Floral_Embroidered_Anarkali_Suit_4.png",
    category: "Anarkali",
    sortOrder: 4,
    isActive: true,
  },
  {
    id: "gal-anarkali-2",
    title: "Flowing Anarkali Suit",
    image: "/images/Flowing_Anarkali_Suit_3.png",
    category: "Anarkali",
    sortOrder: 5,
    isActive: true,
  },
  {
    id: "gal-party-1",
    title: "Midnight Navy Formal",
    image: "/images/Designer_Suits1.jpg",
    category: "Party Wear",
    sortOrder: 6,
    isActive: true,
  },
  {
    id: "gal-party-2",
    title: "Royal Mustard Silk Suit",
    image: "/images/Royal_Musta_d_Silk_Salwar_Suit_3.png",
    category: "Party Wear",
    sortOrder: 7,
    isActive: true,
  },
  {
    id: "gal-party-3",
    title: "Designer Evening Suit",
    image: "/images/Designer_Suits3.jpg",
    category: "Party Wear",
    sortOrder: 8,
    isActive: true,
  },
  {
    id: "gal-kurti-1",
    title: "Floral Kurta Set",
    image: "/images/floral_kurta.png",
    category: "Kurti",
    sortOrder: 9,
    isActive: true,
  },
  {
    id: "gal-kurti-2",
    title: "Elegant Kurti Stitching",
    image: "/images/kurti_1.jpg",
    category: "Kurti",
    sortOrder: 10,
    isActive: true,
  },
  {
    id: "gal-kurti-3",
    title: "Premium Kurti Work",
    image: "/images/kurti_3.jpg",
    category: "Kurti",
    sortOrder: 11,
    isActive: true,
  },
  {
    id: "gal-plazo-1",
    title: "Olive Bloom Palazzo Suit",
    image: "/images/Olive_Bloom_Palazzo_Suit.png",
    category: "Plazo",
    sortOrder: 12,
    isActive: true,
  },
  {
    id: "gal-plazo-2",
    title: "Plazo Set — Classic",
    image: "/images/plazzo_1.jpg",
    category: "Plazo",
    sortOrder: 13,
    isActive: true,
  },
  {
    id: "gal-plazo-3",
    title: "Plazo Set — Festive",
    image: "/images/plazzo_3.jpg",
    category: "Plazo",
    sortOrder: 14,
    isActive: true,
  },
];
