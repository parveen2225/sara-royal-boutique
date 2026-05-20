import type { FaqItem } from "@/components/boutique/SeoFaqSection/SeoFaqSection";

export type SeoPageConfig = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  heroLabel: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  introTitle: string;
  introParagraphs: string[];
  highlights: { title: string; description: string }[];
  faqs: FaqItem[];
  whatsappMessage: string;
};

export const SEO_PAGES: Record<string, SeoPageConfig> = {
  "suit-stitching-kharar": {
    slug: "suit-stitching-kharar",
    metaTitle: "Suit Stitching in Kharar — Sara Royal Boutique",
    metaDescription:
      "Premium ladies suit stitching in Kharar. Custom Punjabi suits, designer cuts, perfect fitting, and boutique finishing at Sara Royal Boutique.",
    heroLabel: "Kharar · Punjab",
    heroTitle: "Premium Suit Stitching in Kharar",
    heroSubtitle:
      "Custom Punjabi suits, designer silhouettes, and flawless finishing — crafted for elegance and comfort.",
    heroImage: "/images/punjabi_2.jpg",
    introTitle: "Luxury Suit Stitching Near You",
    introParagraphs: [
      "Sara Royal Boutique offers expert ladies suit stitching in Kharar with a focus on premium fabrics, balanced fitting, and timeless Punjabi elegance.",
      "Whether you need a daily wear suit, festive ensemble, or designer-inspired outfit, we tailor every piece to your measurements and style preferences.",
    ],
    highlights: [
      {
        title: "Custom Punjabi Suits",
        description: "Traditional and modern suit styles with dupatta coordination and boutique detailing.",
      },
      {
        title: "Designer Cuts",
        description: "Structured shoulders, refined necklines, and flattering silhouettes for every body type.",
      },
      {
        title: "Premium Finishing",
        description: "Neat hems, lining options, and hand-finished details for a luxury boutique look.",
      },
      {
        title: "Fabric Guidance",
        description: "We help you choose cotton, silk, georgette, or festive fabrics for the perfect drape.",
      },
    ],
    faqs: [
      {
        question: "Do you stitch Punjabi suits in Kharar?",
        answer:
          "Yes. Sara Royal Boutique specializes in ladies Punjabi suit stitching with custom measurements and premium finishing.",
      },
      {
        question: "Can I bring my own fabric?",
        answer:
          "Absolutely. Share your fabric and design reference on WhatsApp, and we will guide you through measurements and styling.",
      },
      {
        question: "How long does suit stitching take?",
        answer:
          "Typical turnaround is 7–14 days depending on design complexity and embellishment work.",
      },
    ],
    whatsappMessage:
      "Hi Sara Royal Boutique, I need suit stitching in Kharar. Please guide me on measurements and booking.",
  },
  "ladies-tailor-kharar": {
    slug: "ladies-tailor-kharar",
    metaTitle: "Ladies Tailor in Kharar — Sara Royal Boutique",
    metaDescription:
      "Trusted ladies tailor in Kharar for kurtis, suits, gowns, blouses, and alterations. Boutique-quality stitching at Sara Royal.",
    heroLabel: "Expert Tailoring",
    heroTitle: "Ladies Tailor in Kharar",
    heroSubtitle:
      "Boutique-level ladies tailoring for kurtis, suits, gowns, blouses, and precise alterations.",
    heroImage: "/images/punjabi_4.jpg",
    introTitle: "Your Trusted Ladies Tailor",
    introParagraphs: [
      "Looking for a reliable ladies tailor in Kharar? Sara Royal Boutique combines years of craftsmanship with modern boutique styling.",
      "From everyday kurtis to wedding-ready outfits, every garment is stitched with care, accuracy, and elegant finishing.",
    ],
    highlights: [
      {
        title: "Kurti & Suit Stitching",
        description: "Anarkali, straight cut, palazzo sets, and coordinated dupatta styling.",
      },
      {
        title: "Blouse & Gown Work",
        description: "Party blouses, lehenga blouses, and evening gowns with premium fit.",
      },
      {
        title: "Alterations",
        description: "Resize, length adjustments, and fitting corrections with neat finishing.",
      },
      {
        title: "Measurement Support",
        description: "In-boutique fitting or WhatsApp measurement guidance for outstation clients.",
      },
    ],
    faqs: [
      {
        question: "What services does your ladies tailor offer?",
        answer:
          "We offer kurti stitching, suit tailoring, gown work, blouse stitching, kids wear, and alterations.",
      },
      {
        question: "Is home measurement available?",
        answer:
          "You can visit our boutique in Kharar or share measurements via WhatsApp with our guided chart.",
      },
      {
        question: "Do you handle wedding outfits?",
        answer:
          "Yes. We stitch bridal, engagement, and festive outfits with designer finishing.",
      },
    ],
    whatsappMessage:
      "Hi, I am looking for a ladies tailor in Kharar. Please share your services and booking process.",
  },
  "boutique-classes-punjab": {
    slug: "boutique-classes-punjab",
    metaTitle: "Boutique Classes in Punjab — Sara Royal Boutique",
    metaDescription:
      "Learn boutique stitching, pattern making, and garment finishing with Sara Royal Boutique classes in Punjab. Enroll today.",
    heroLabel: "Learn & Create",
    heroTitle: "Boutique Classes in Punjab",
    heroSubtitle:
      "Professional boutique training in stitching, pattern making, and garment finishing for aspiring designers.",
    heroImage: "/images/punjabi_1.jpg",
    introTitle: "Train with Boutique Experts",
    introParagraphs: [
      "Sara Royal Boutique offers boutique classes in Punjab for students who want hands-on training in ladies garment construction and finishing.",
      "Learn practical skills from measurement to final outfit — guided by experienced tailors in a real boutique environment.",
    ],
    highlights: [
      {
        title: "Stitching Fundamentals",
        description: "Machine handling, seams, hems, and professional garment construction.",
      },
      {
        title: "Pattern & Cutting",
        description: "Measurement-based drafting for kurtis, suits, and blouses.",
      },
      {
        title: "Boutique Finishing",
        description: "Necklines, piping, linings, and luxury detailing techniques.",
      },
      {
        title: "Business Guidance",
        description: "Tips on client handling, pricing, and starting your own boutique.",
      },
    ],
    faqs: [
      {
        question: "Who can join boutique classes?",
        answer:
          "Beginners and intermediate learners passionate about ladies garment stitching and boutique work are welcome.",
      },
      {
        question: "Where are classes conducted?",
        answer:
          "Classes are held at Sara Royal Boutique in Punjab with practical, hands-on sessions.",
      },
      {
        question: "How do I enroll?",
        answer:
          "Message us on WhatsApp for batch timings, fees, and seat availability.",
      },
    ],
    whatsappMessage:
      "Hi Sara Royal Boutique, I want to enquire about boutique classes in Punjab. Please share details.",
  },
  "designer-suits-kharar": {
    slug: "designer-suits-kharar",
    metaTitle: "Designer Suits in Kharar — Sara Royal Boutique",
    metaDescription:
      "Designer ladies suits in Kharar with custom embroidery, premium fabrics, and boutique finishing. Order at Sara Royal Boutique.",
    heroLabel: "Designer Wear",
    heroTitle: "Designer Suits in Kharar",
    heroSubtitle:
      "Statement designer suits with custom embroidery, rich fabrics, and red-carpet boutique finishing.",
    heroImage: "/images/Royal_Musta_d_Silk_Salwar_Suit_3.png",
    introTitle: "Designer Suits Made for You",
    introParagraphs: [
      "Stand out in custom designer suits crafted at Sara Royal Boutique in Kharar — from festive silk sets to contemporary Indo-western looks.",
      "Share your inspiration and we translate it into a perfectly fitted outfit with luxury details and elegant draping.",
    ],
    highlights: [
      {
        title: "Custom Embroidery",
        description: "Thread work, sequins, and motif placement tailored to your design vision.",
      },
      {
        title: "Festive & Party Suits",
        description: "Wedding guest, engagement, and celebration outfits with premium appeal.",
      },
      {
        title: "Silk & Designer Fabrics",
        description: "Mustard silk, organza, velvet, and curated festive fabric options.",
      },
      {
        title: "Complete Styling",
        description: "Dupatta, bottom, and blouse coordination for a polished designer look.",
      },
    ],
    faqs: [
      {
        question: "Can you replicate a designer suit photo?",
        answer:
          "Yes. Share reference images on WhatsApp and we will advise on fabric, work, and realistic timelines.",
      },
      {
        question: "Do you offer embroidery in-house?",
        answer:
          "We coordinate embroidery and embellishment work to match your designer suit requirements.",
      },
      {
        question: "What is the price range?",
        answer:
          "Pricing depends on fabric, embroidery, and design. Contact us on WhatsApp for a personalised quote.",
      },
    ],
    whatsappMessage:
      "Hi, I want a designer suit stitched in Kharar. Please share options and pricing.",
  },
};

export const getSeoPageConfig = (slug: string): SeoPageConfig | undefined =>
  SEO_PAGES[slug];
