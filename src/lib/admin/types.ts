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

export type DesignCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  displayOrder: number;
  isActive: boolean;
  subcategoryCount?: number;
  designCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type DesignSubcategory = {
  id: string;
  categoryId: string;
  categorySlug?: string;
  categoryName?: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  displayOrder: number;
  isActive: boolean;
  designCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type StudioDesign = {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  subcategoryId: string;
  subcategorySlug: string;
  subcategoryName: string;
  shortDescription: string;
  fullDescription: string;
  thumbnailImage: string;
  galleryImages: string[];
  tags: string[];
  stitchingPrice: string;
  fabricRecommendation: string;
  deliveryTimeline: string;
  featured: boolean;
  trending: boolean;
  newArrival: boolean;
  bridalSpecial: boolean;
  homepageShow: boolean;
  activeStatus: boolean;
  displayOrder: number;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  createdAt?: string;
  updatedAt?: string;
};
