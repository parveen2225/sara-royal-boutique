export type Service = {
  id: string;
  title: string;
  description: string;
  icon: string;
  image: string;
  active?: boolean;
};

export const SERVICES: Service[] = [
  {
    id: "suit-stitching",
    title: "Suit Stitching",
    description: "Perfectly tailored suits designed for comfort and elegance.",
    icon: "SS",
    image: "/images/punjabi_1.jpg",
    active: true,
  },
  {
    id: "suit-salwar",
    title: "Suit Salwar",
    description: "Classic salwar stitching shaped for graceful movement and everyday ease.",
    icon: "SL",
    image: "/images/punjabi_2.jpg",
    active: true,
  },
  {
    id: "kurti-stitching",
    title: "Kurti Stitching",
    description: "Stylish kurtis crafted with precision and modern designs.",
    icon: "KS",
    image: "/images/kurti_1.jpg",
    active: true,
  },
  {
    id: "anarkali-suits",
    title: "Anarkali Suits",
    description: "Graceful and royal Anarkali designs for special occasions.",
    icon: "AS",
    image: "/images/Designer_Suits2.jpg",
    active: true,
  },
  {
    id: "blouse-stitching",
    title: "Blouse Stitching",
    description: "Elegant and modern blouse stitching with perfect fitting.",
    icon: "BS",
    image: "/images/Designer_Suits3.jpg",
    active: true,
  },
  {
    id: "pant-plazo",
    title: "Pant / Plazo",
    description: "Comfortable and trendy bottom wear tailored to your style.",
    icon: "PP",
    image: "/images/plazzo_1.jpg",
    active: true,
  },
  {
    id: "gown-stitching",
    title: "Gown Stitching",
    description: "Beautiful gowns stitched for a classy and premium look.",
    icon: "GS",
    image: "/images/Designer_Suits4.jpg",
    active: true,
  },
  {
    id: "designer-suits",
    title: "Designer Suits",
    description: "Exclusive designer outfits customized for your unique style.",
    icon: "DS",
    image: "/images/Designer_Suits5.webp",
    active: true,
  },
  {
    id: "custom-designs",
    title: "Custom Designs",
    description: "Bring your ideas to life with personalized stitching services.",
    icon: "CD",
    image: "/images/Designer_Suits1.jpg",
    active: true,
  },
  {
    id: "kids-wear",
    title: "Kids Wear",
    description: "Comfortable and stylish outfits specially made for kids.",
    icon: "KW",
    image: "/images/kurti_4.jpg",
    active: true,
  },
  {
    id: "alteration-services",
    title: "Alteration Services",
    description: "Professional alterations for the perfect fit.",
    icon: "AL",
    image: "/images/plazzo_2.jpg",
    active: true,
  },
  {
    id: "stitching-classes",
    title: "Stitching Classes",
    description: "Learn stitching from beginner to advanced level.",
    icon: "SC",
    image: "/images/kurti_3.jpg",
    active: true,
  },
];
