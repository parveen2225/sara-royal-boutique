import { Suspense } from "react";
import type { Metadata } from "next";
import SignupForm from "@/components/account/SignupForm";

export const metadata: Metadata = { title: "Create an account — Sara Royal Boutique" };

export default function Page() {
  return <Suspense fallback={null}><SignupForm /></Suspense>;
}
