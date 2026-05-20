export type Collection = {
  id: string;
  name: string;
  serviceId: string;
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  stitchingPrice: string;
  sliderDelayMs?: number;
  categoryId: string;
  imageUrl: string;
  imageName?: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
};

export type Service = {
  id: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  imageName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HeroBanner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Reel = {
  id: string;
  title: string;
  instagramUrl: string;
  thumbnail: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Testimonial = {
  id: string;
  customerName: string;
  reviewText: string;
  rating: number;
  image: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const GALLERY_CATEGORIES = [
  "Bridal",
  "Anarkali",
  "Party Wear",
  "Kurti",
  "Plazo",
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export type GalleryItem = {
  id: string;
  title: string;
  image: string;
  category: GalleryCategory;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminState = {
  collections: Collection[];
  products: Product[];
  services: Service[];
};
