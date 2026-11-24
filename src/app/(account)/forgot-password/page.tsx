import { Suspense } from "react";
import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/account/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset your password — Sara Royal Boutique" };

export default function Page() {
  return <Suspense fallback={null}><ForgotPasswordForm /></Suspense>;
}
