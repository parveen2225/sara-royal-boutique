"use client";

// Loaded on demand (see AuthLauncher): brings its own AuthProvider, so the Firebase SDK is downloaded only when a visitor
// actually opens the auth modal from the header, never for ordinary browsing.
import { AuthProvider } from "./AuthProvider";
import AuthModal, { type AuthModalProps } from "./AuthModal";
import "./account.scss";

export default function AuthModalHost(props: AuthModalProps) {
  return (
    <AuthProvider>
      <AuthModal {...props} />
    </AuthProvider>
  );
}
