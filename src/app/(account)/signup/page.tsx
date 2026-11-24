import { Suspense } from "react";
import type { Metadata } from "next";
import AuthPage from "@/components/account/AuthPage";

export const metadata: Metadata = { title: "Create an account — Sara Royal Boutique" };

export default function Page() {
  return <Suspense fallback={null}><AuthPage view="signup" /></Suspense>;
}
