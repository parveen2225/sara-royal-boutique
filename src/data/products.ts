export interface Product {
  id: string;
  name: string;
  description: string;
  price?: string;
  image: string;
  imageUrls?: string[];
  category: string;
  tags?: string[];
  featured?: boolean;
}

export const CATEGORIES = [
  "All",
  "Suit Stitching",
  "Kurti Stitching",
  "Designer Suits",
  "Anarkali Suits",
  "Pant / Plazo",
];

export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Royal Ivory Lawn Suit",
    description:
      "A breathtaking ivory lawn suit adorned with delicate hand-embroidered motifs. Crafted for the woman who commands every room she enters. Includes fully lined dupatta with embroidered border.",
    price: "INR 4,500",
    image:
      "/images/punjabi_1.jpg",
    category: "Suit Stitching",
    tags: ["lawn", "embroidered", "summer"],
    featured: true,
  },
  {
    id: "2",
    name: "Midnight Navy Formal",
    description:
      "Deep navy chiffon three-piece formal suit with silver thread work. Perfect for evening gatherings and celebrations. The intricate silver embroidery adds a touch of celestial elegance.",
    price: "INR 7,800",
    image:
      "/images/Designer_Suits1.jpg",
    category: "Designer Suits",
    tags: ["formal", "chiffon", "party"],
    featured: true,
  },
  {
    id: "3",
    name: "Blush Rose Bridal Set",
    description:
      "An ethereal blush rose bridal ensemble featuring heavy zardozi and kundan embellishments. Designed for the modern bride who desires timeless sophistication. Complete with matching lehenga and dupatta.",
    price: "INR 35,000",
    image:
      "/images/Designer_Suits2.jpg",
    category: "Anarkali Suits",
    tags: ["bridal", "wedding", "luxury"],
    featured: true,
  },
  {
    id: "4",
    name: "Sage Garden Casual",
    description:
      "Effortlessly chic sage green cotton suit with minimal printed motifs. Ideal for relaxed afternoons and casual outings. Light, breathable fabric keeps you comfortable all day.",
    price: "INR 2,800",
    image:
      "/images/kurti_1.jpg",
    category: "Kurti Stitching",
    tags: ["casual", "cotton", "everyday"],
    featured: true,
  },
  {
    id: "5",
    name: "Golden Hour Embroidered",
    description:
      "Luxurious golden-toned organza suit with intricate mirror work and gota patti embroidery. A celebration outfit that radiates warmth and regality.",
    price: "INR 12,500",
    image:
      "/images/Designer_Suits3.jpg",
    category: "Designer Suits",
    tags: ["embroidered", "organza", "festive"],
    featured: true,
  },
  {
    id: "6",
    name: "Crimson Velvet Formal",
    description:
      "Rich crimson velvet formal suit with gold zari border and hand-crafted button details. Exudes old-world luxury with a modern silhouette.",
    price: "INR 9,200",
    image:
      "/images/punjabi_3.jpg",
    category: "Suit Stitching",
    tags: ["formal", "velvet", "winter"],
    featured: true,
  },
  {
    id: "7",
    name: "Pearl White Lawn Classic",
    description:
      "Classic pearl-white lawn suit with subtle floral print and intricate neckline embroidery. A wardrobe essential for the discerning woman.",
    price: "INR 3,800",
    image:
      "/images/kurti_2.jpg",
    category: "Kurti Stitching",
    tags: ["lawn", "classic", "summer"],
  },
  {
    id: "8",
    name: "Emerald Dreams Casual",
    description:
      "Vibrant emerald green cotton-silk casual suit with block-print design. Understated elegance for day-to-day sophistication.",
    price: "INR 3,200",
    image:
      "/images/plazzo_1.jpg",
    category: "Pant / Plazo",
    tags: ["casual", "cotton", "printed"],
  },
  {
    id: "9",
    name: "Champagne Bridal Lehenga",
    description:
      "Stunning champagne-gold bridal lehenga with three-dimensional floral embroidery and pearl detailing. For the bride who wants to shine without compromise.",
    price: "INR 45,000",
    image:
      "/images/Designer_Suits4.jpg",
    category: "Anarkali Suits",
    tags: ["bridal", "lehenga", "premium"],
  },
];

export const getFeaturedProducts = (): Product[] =>
  PRODUCTS.filter((p) => p.featured);

export const getProductById = (id: string): Product | undefined =>
  PRODUCTS.find((p) => p.id === id);

export const getRelatedProducts = (product: Product, count = 3): Product[] =>
  PRODUCTS.filter(
    (p) => p.id !== product.id && p.category === product.category
  ).slice(0, count);
