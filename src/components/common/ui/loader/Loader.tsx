"use client";

import { useSyncExternalStore } from "react";
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

const Loader = ({ show, variant = DEFAULT_VARIANT }: LoaderProps) => {
  const storeLoading = useSyncExternalStore(
    loadingStore.subscribe,
    loadingStore.getSnapshot,
    () => false,
  );
  const isLoading = typeof show === "boolean" ? show : storeLoading;
  if (isLoading) {
    return (
      <section className={`loader loader--${variant}`}>
        <div className="loader_inner">
          <span className="loader_shine" />
          <Image src={logo} alt="Sara Royal Boutique" className="loader_logo" priority />
        </div>
      </section>
    );
  } else return <></>;
};

export default Loader;
