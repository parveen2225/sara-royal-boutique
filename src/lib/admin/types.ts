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

export type AdminState = {
  collections: Collection[];
  products: Product[];
  services: Service[];
};
