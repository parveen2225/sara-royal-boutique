import { Suspense } from "react";
import type { Metadata } from "next";
import AuthPage from "@/components/account/AuthPage";

export const metadata: Metadata = { title: "Verify your email — Sara Royal Boutique" };

export default function Page() {
  return <Suspense fallback={null}><AuthPage view="verify" /></Suspense>;
}
