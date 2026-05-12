const WHATSAPP_PHONE =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "9988854440";

export const getWhatsAppUrl = (message?: string): string => {
  const text =
    message ?? "Hi, I want to order this design from Sara Royal Boutique";
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
};

export const getProductWhatsAppUrl = (productName: string): string =>
  getWhatsAppUrl(
    `Hi Sara Royal Boutique, I am interested in *${productName}*. I want to discuss stitching, fabric, measurements, fitting, and INR pricing.`
  );

export const getServiceWhatsAppUrl = (serviceName: string): string =>
  getWhatsAppUrl(
    `Hi Sara Royal Boutique, I want *${serviceName}*. I will share my design, fabric details, and measurements. Please guide me with INR pricing.`
  );
