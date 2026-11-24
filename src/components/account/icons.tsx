// Small inline icons for the customer account UI (stroke icons, inherit the text colour).
import type { ReactNode } from "react";

function Svg({ size = 20, children }: { size?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}
type P = { size?: number };

export const CloseIcon = ({ size }: P) => <Svg size={size}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const MailIcon = ({ size }: P) => <Svg size={size}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7.5l8.5 6 8.5-6" /></Svg>;
export const CheckIcon = ({ size }: P) => <Svg size={size}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const LockIcon = ({ size }: P) => <Svg size={size}><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /></Svg>;
export const UserIcon = ({ size }: P) => <Svg size={size}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></Svg>;
export const ShieldIcon = ({ size }: P) => <Svg size={size}><path d="M12 3l7.5 3v5.5c0 4.3-3 7.7-7.5 9.5-4.5-1.8-7.5-5.2-7.5-9.5V6L12 3z" /><path d="M8.7 12l2.3 2.3 4.3-4.6" /></Svg>;
export const KeyIcon = ({ size }: P) => <Svg size={size}><circle cx="8" cy="15" r="4" /><path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2" /></Svg>;
export const EditIcon = ({ size }: P) => <Svg size={size}><path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17v3z" /><path d="M14.5 7.5l3 3" /></Svg>;
export const BagIcon = ({ size }: P) => <Svg size={size}><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6.5a3 3 0 016 0V8" /></Svg>;
export const LogoutIcon = ({ size }: P) => <Svg size={size}><path d="M10 4H6.5A1.5 1.5 0 005 5.5v13A1.5 1.5 0 006.5 20H10" /><path d="M15 8l4 4-4 4M19 12H9.5" /></Svg>;
export const CalendarIcon = ({ size }: P) => <Svg size={size}><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></Svg>;
