import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "@/components/account/LoginForm";

export const metadata: Metadata = { title: "Log in — Sara Royal Boutique" };

export default function Page() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
