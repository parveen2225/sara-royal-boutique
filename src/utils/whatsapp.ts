const WHATSAPP_PHONE =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "9988854440";

export const getWhatsAppUrl = (message?: string): string => {
  const text =
    message ?? "Hi, I want to order this design from Sara Royal Boutique";
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
};

const formatPriceValueForMessage = (price?: string): string => {
  if (!price?.trim()) return "";
  return price
    .trim()
    .replace(/^INR\s+/i, "")
    .replace(/₹\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

export const buildProductEnquiryMessage = (
  productName: string,
  price?: string,
): string => {
  const priceValue = formatPriceValueForMessage(price);
  const stitchingPriceLine = priceValue
    ? `Stitching Price: ₹${priceValue}`
    : "Stitching Price: On request";

  return [
    "Hello Sara Royal Boutique,",
    "",
    `I'm interested in *${productName}*.`,
    "",
    stitchingPriceLine,
    "",
    "Please share further details regarding the stitching process and booking.",
  ].join("\n");
};

export const getProductWhatsAppUrl = (
  productName: string,
  price?: string,
): string => getWhatsAppUrl(buildProductEnquiryMessage(productName, price));

/** Product detail page — includes full product page link for WhatsApp preview. */
export const buildProductPageWhatsAppUrl = (
  productId: string,
  product: {
    name: string;
    price?: string;
    category?: string;
    description?: string;
  },
  origin: string,
): string => {
  const base = origin.replace(/\/$/, "");
  const productUrl = `${base}/product/${productId}`;

  const priceValue = formatPriceValueForMessage(product.price);
  const stitchingPriceLine = priceValue
    ? `Stitching Price: ₹${priceValue}`
    : "Stitching Price: On request";

  const desc = product.description?.trim();
  const shortDesc =
    desc && desc.length > 200 ? `${desc.slice(0, 200).trim()}…` : desc;

  const lines = [
    productUrl,
    "",
    "Hello Sara Royal Boutique,",
    "",
    "I'm interested in this design:",
    "",
    `*${product.name}*`,
  ];

  if (product.category?.trim()) {
    lines.push(`Category: ${product.category.trim()}`);
  }

  lines.push(stitchingPriceLine);

  if (shortDesc) {
    lines.push("", `Details: ${shortDesc}`);
  }

  lines.push(
    "",
    "Please share further details regarding the stitching process and booking.",
  );

  return getWhatsAppUrl(lines.join("\n"));
};

/** Product detail page — ask for similar designs / styling suggestions. */
export const buildProductSuggestionWhatsAppUrl = (
  productId: string,
  product: {
    name: string;
    category?: string;
  },
  origin: string,
): string => {
  const base = origin.replace(/\/$/, "");
  const productUrl = `${base}/product/${productId}`;

  const lines = [
    productUrl,
    "",
    "Hello Sara Royal Boutique,",
    "",
    "I was browsing this design and would like your suggestions:",
    "",
    `*${product.name}*`,
  ];

  if (product.category?.trim()) {
    lines.push(`Category: ${product.category.trim()}`);
  }

  lines.push(
    "",
    "Could you suggest similar designs, colour options, or styling ideas that would suit me?",
    "",
    "Thank you!",
  );

  return getWhatsAppUrl(lines.join("\n"));
};

export const getServiceWhatsAppUrl = (serviceName: string): string =>
  getWhatsAppUrl(
    `Hi Sara Royal Boutique, I want *${serviceName}*. I will share my design, fabric details, and measurements. Please guide me with INR pricing.`
  );

/** Design Studio — stitch enquiry for a specific design. */
export const buildDesignStudioWhatsAppUrl = (designName: string): string =>
  getWhatsAppUrl(
    [
      "Hello Sara Royal Boutique,",
      "",
      `I'm interested in *${designName}*.`,
      "",
      "Please share further details regarding the stitching process and booking.",
    ].join("\n"),
  );
