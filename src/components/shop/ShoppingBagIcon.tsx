/** Shopping-bag outline icon shared by the header cart button and the empty-cart state (inherits currentColor). */
export default function ShoppingBagIcon({ size = 20, strokeWidth = 1.6, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5.2 8.2h13.6l-.95 11.4a1.6 1.6 0 0 1-1.6 1.47H7.75a1.6 1.6 0 0 1-1.6-1.47L5.2 8.2Z" />
      <path d="M8.8 10.6V7.1a3.2 3.2 0 0 1 6.4 0v3.5" />
    </svg>
  );
}
