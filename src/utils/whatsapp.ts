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

export const getServiceWhatsAppUrl = (serviceName: string): string =>
  getWhatsAppUrl(
    `Hi Sara Royal Boutique, I want *${serviceName}*. I will share my design, fabric details, and measurements. Please guide me with INR pricing.`
  );
