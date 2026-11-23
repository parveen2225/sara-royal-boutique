"use client";

type Props = { value: number; max: number; onChange: (n: number) => void; label?: string; disabled?: boolean };

export default function QuantityStepper({ value, max, onChange, label = "Quantity", disabled }: Props) {
  const dec = () => onChange(Math.max(1, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="shop_qty" role="group" aria-label={label}>
      <button type="button" onClick={dec} disabled={disabled || value <= 1} aria-label="Decrease quantity">−</button>
      <span aria-live="polite" aria-label={`${label}: ${value}`}>{value}</span>
      <button type="button" onClick={inc} disabled={disabled || value >= max} aria-label="Increase quantity">+</button>
    </div>
  );
}
