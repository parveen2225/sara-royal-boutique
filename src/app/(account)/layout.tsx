import type { Metadata } from "next";
import { AuthProvider } from "@/components/account/AuthProvider";
import "@/components/account/account.scss";

// Customer account pages only. Firebase is loaded here and nowhere else on the site; shopping, Collections, About,
// Cart and WhatsApp checkout never require an account. Not indexed by search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
