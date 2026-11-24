import { Suspense } from "react";
import type { Metadata } from "next";
import VerifyEmailView from "@/components/account/VerifyEmailView";

export const metadata: Metadata = { title: "Verify your email — Sara Royal Boutique" };

export default function Page() {
  return <Suspense fallback={null}><VerifyEmailView /></Suspense>;
}
