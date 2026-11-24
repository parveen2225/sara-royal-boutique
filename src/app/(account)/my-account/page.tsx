import { Suspense } from "react";
import type { Metadata } from "next";
import MyAccountView from "@/components/account/MyAccountView";

export const metadata: Metadata = { title: "My Account — Sara Royal Boutique" };

export default function Page() {
  return <Suspense fallback={null}><MyAccountView /></Suspense>;
}
