"use client";

// Firebase (customer accounts) for the browser. One Firebase app per page, created lazily on first use, so pages that
// never touch customer accounts never load Firebase. The web config is PUBLIC by design (it identifies the Firebase
// project; access is controlled by Firebase Auth and server-side token checks), so it lives in NEXT_PUBLIC_ variables.
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { browserLocalPersistence, indexedDBLocalPersistence, initializeAuth, getAuth, type Auth } from "firebase/auth";
import { firebaseWebConfig as config, isCustomerAuthConfigured } from "./publicConfig";

export { isCustomerAuthConfigured };

const APP_NAME = "sara-royal-customers";
let auth: Auth | null = null;

export function getCustomerAuth(): Auth {
  if (auth) return auth;
  if (!isCustomerAuthConfigured()) throw new Error("Customer accounts are not configured");
  const existing = getApps().find((a) => a.name === APP_NAME);
  const app: FirebaseApp = existing ?? initializeApp(config, APP_NAME);
  try {
    // Remembered session in this browser (IndexedDB, falling back to localStorage). No popup/redirect code is loaded.
    auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  } catch {
    auth = getAuth(getApp(APP_NAME)); // already initialised (e.g. fast refresh)
  }
  auth.useDeviceLanguage();
  return auth;
}
