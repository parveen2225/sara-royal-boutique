"use client";

// Route wrapper for /login, /signup, /forgot-password and /verify-email: the same auth modal, opened over a branded
// stage instead of a plain full-page form. Closing it returns to the home page.
import { useRouter, useSearchParams } from "next/navigation";
import AuthModal from "./AuthModal";
import { useIsClient } from "./ui";
import type { AuthView, FlashNotice } from "./authModalContext";
import { safeNextPath } from "@/lib/customerAuth/rules";

export default function AuthPage({ view }: { view: AuthView }) {
  const router = useRouter();
  const mounted = useIsClient(); // the modal is a portal: open it only after hydration
  const params = useSearchParams();
  const next = safeNextPath(params?.get("next")); // same-site paths only: no open redirects
  const notice: FlashNotice | null =
    view !== "login" ? null
    : params?.get("verified") === "1" ? { tone: "success", text: "Thank you for verifying your email. Please log in." }
    : params?.get("reset") === "1" ? { tone: "success", text: "Your password was changed. Please log in with your new password." }
    : null;

  return (
    <main className="acct_stage">
      <div className="acct_stage_inner" aria-hidden="true">
        <span className="acct_stage_kicker">Sara Royal Boutique</span>
        <span className="acct_stage_line">Elegance in every stitch</span>
      </div>
      <AuthModal
        open={mounted}
        initialView={view}
        next={next}
        notice={notice}
        sendFailed={view === "verify" && params?.get("sent") === "0"}
        onClose={() => router.push("/")}
        onAuthenticated={(dest) => router.replace(dest)}
      />
    </main>
  );
}
