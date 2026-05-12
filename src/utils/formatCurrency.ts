export const formatInr = (amount: number | string): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `₹ ${amount}`;
  return `₹ ${num.toLocaleString("en-IN")}`;
};

export const formatPriceRange = (value: string): string => {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.includes("-")) {
    const [a, b] = trimmed.split("-").map((p) => p.trim());
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return `₹ ${numA.toLocaleString("en-IN")} – ₹ ${numB.toLocaleString("en-IN")}`;
    }
  }
  const num = parseFloat(trimmed);
  if (!isNaN(num)) return `₹ ${num.toLocaleString("en-IN")}`;
  return `₹ ${trimmed}`;
};
