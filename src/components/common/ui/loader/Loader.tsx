"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import "./Loader.scss";
import { loadingStore } from "@/lib/loading/loadingStore";
import Image from "next/image";
import logo from "../../../../../public/images/logo_icon.png";

type LoaderVariant = "breathe" | "shineSweep";

type LoaderProps = {
  show?: boolean;
  variant?: LoaderVariant;
};

// Change this value anytime to try another creative loader style.
const DEFAULT_VARIANT: LoaderVariant = "shineSweep";

// Must match the opacity transition duration in Loader.scss.
const FADE_OUT_MS = 400;

const Loader = ({ show, variant = DEFAULT_VARIANT }: LoaderProps) => {
  const storeLoading = useSyncExternalStore(
    loadingStore.subscribe,
    loadingStore.getSnapshot,
    loadingStore.getServerSnapshot,
  );
  const isLoading = typeof show === "boolean" ? show : storeLoading;

  // Mark the app "ready" once the window has fully finished loading
  // (markup, images, fonts, scripts) so the loader keeps covering the
  // page for that entire stretch, with no gap and no flicker.
  useEffect(() => {
    if (document.readyState === "complete") {
      loadingStore.markAppReady();
      return;
    }
    const onLoad = () => loadingStore.markAppReady();
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  // Keep the loader mounted slightly past isLoading turning false so the
  // opacity transition can play instead of the overlay disappearing instantly.
  const [mounted, setMounted] = useState(isLoading);
  if (isLoading && !mounted) setMounted(true); // a new load re-mounts it (adjusted during render)
  const leaving = mounted && !isLoading; // fading out

  useEffect(() => {
    if (isLoading || !mounted) return;
    const timer = setTimeout(() => setMounted(false), FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading, mounted]);

  if (!mounted) return null;

  return (
    <section
      className={`loader loader--${variant} ${leaving ? "loader--leaving" : ""}`}
    >
      <div className="loader_inner">
        <span className="loader_shine" />
        <Image src={logo} alt="Sara Royal Boutique" className="loader_logo" priority />
      </div>
    </section>
  );
};

export default Loader;
