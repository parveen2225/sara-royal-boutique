"use client";

// Lets any part of the site (the header's account icon, a protected action) open the customer auth modal.
// This file never imports Firebase: the modal (with Firebase) is a separate chunk loaded the first time it is opened.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { isCustomerAuthConfigured } from "@/lib/customerAuth/publicConfig";
import { safeNextPath } from "@/lib/customerAuth/rules";
import type { AuthView } from "./authModalContext";

const AuthModalHost = dynamic(() => import("./AuthModalHost"), { ssr: false });

type OpenOptions = { next?: string; email?: string };
type Launcher = { openAuth: (view?: AuthView, options?: OpenOptions) => void };

const AuthLauncherContext = createContext<Launcher | null>(null);

type State = { mounted: boolean; open: boolean; view: AuthView; next: string; email: string; key: number };

export function AuthLauncherProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [s, setS] = useState<State>({ mounted: false, open: false, view: "login", next: "/my-account", email: "", key: 0 });

  const openAuth = useCallback((view: AuthView = "login", options: OpenOptions = {}) => {
    if (!isCustomerAuthConfigured()) { router.push("/login"); return; }
    setS((p) => ({ mounted: true, open: true, view, next: safeNextPath(options.next), email: options.email ?? "", key: p.key + 1 }));
  }, [router]);

  const value = useMemo<Launcher>(() => ({ openAuth }), [openAuth]);

  return (
    <AuthLauncherContext.Provider value={value}>
      {children}
      {s.mounted && (
        <AuthModalHost
          key={s.key}
          open={s.open}
          initialView={s.view}
          next={s.next}
          initialEmail={s.email}
          onClose={() => setS((p) => ({ ...p, open: false }))}
          onAuthenticated={(dest) => { setS((p) => ({ ...p, open: false })); router.push(dest); }}
        />
      )}
    </AuthLauncherContext.Provider>
  );
}

/** Falls back to the plain /login page when used outside the provider. */
export function useAuthLauncher(): Launcher {
  return useContext(AuthLauncherContext) ?? { openAuth: () => { if (typeof window !== "undefined") window.location.assign("/login"); } };
}
