export const CLASSES_WHATSAPP_URL = `https://wa.me/919779379004?text=${encodeURIComponent(
  "Hello! I'm interested in joining the Sewing Classes at Sara Royal Boutique. Please share more details.",
)}`;

export const CLASSES_IMAGES = {
  hero: "/images/classes/classes_banner1.png",
  heroSecondary: "/images/classes/classes_img4.png",
  promoMain: "/images/classes/classes_img7.png",
  promoAccent: "/images/classes/classes_img3.png",
} as const;

export const CLASSES_CURRICULUM = [
  {
    icon: "🧵",
    title: "Stitching",
    sub: "Basic to Advanced",
    image: "/images/classes/stitching_img.png",
  },
  {
    icon: "📏",
    title: "Measurement & Fitting",
    sub: "Perfect sizing every time",
    image: "/images/classes/measurement_img.png",
  },
  {
    icon: "✂️",
    title: "Designing & Finishing",
    sub: "Professional boutique look",
    image: "/images/classes/classes_img6.png",
  },
  {
    icon: "🪡",
    title: "Practical Training",
    sub: "Real hands-on sessions",
    image: "/images/classes/classes_img3.png",
  },
] as const;

export const CLASSES_FEATURES = [
  { icon: "📈", label: "Beginners to Advanced" },
  { icon: "🎓", label: "Practical Learning" },
  { icon: "👩‍🏫", label: "Personal Attention" },
  { icon: "📋", label: "Certificate Provided" },
  { icon: "🕐", label: "Flexible Timings" },
] as const;

export const CLASSES_STATS = [
  { value: "₹1,500", label: "Per Person · All Levels" },
  { value: "5+", label: "Core Skills Covered" },
  { value: "✓", label: "Certificate Provided" },
] as const;

export const CLASSES_PROMO_POINTS = [
  "Stitching — Basic to Advanced",
  "Measurement & Fitting",
  "Designing & Finishing",
  "Certificate Provided",
] as const;
