// Public Firebase web config (NOT secret: it only identifies the Firebase project). No Firebase import here, so the
// header can check whether customer accounts are switched on without loading the Firebase SDK on every page.
// Literal process.env.NEXT_PUBLIC_* reads so Next.js inlines them at build time.
export const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? "",
};

/** True when the owner has configured the Firebase web app (all four values present). */
export const isCustomerAuthConfigured = () =>
  Boolean(firebaseWebConfig.apiKey && firebaseWebConfig.authDomain && firebaseWebConfig.projectId && firebaseWebConfig.appId);

/** Pages where the header must look exactly as before (owner's instruction): no account link there. */
export const isAccountLinkHiddenOn = (pathname: string | null | undefined) =>
  !pathname || /^\/(collections|about)(\/|$)/i.test(pathname) || pathname.startsWith("/admin");
