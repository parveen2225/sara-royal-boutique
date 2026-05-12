"use client";

import { useSyncExternalStore } from "react";
import "./Loader.scss";
import { loadingStore } from "@/lib/loading/loadingStore";

type LoaderProps = {
  show?: boolean;
};

const Loader = ({ show }: LoaderProps) => {
  const storeLoading = useSyncExternalStore(
    loadingStore.subscribe,
    loadingStore.getSnapshot,
    () => false,
  );
  const isLoading = typeof show === "boolean" ? show : storeLoading;
  if (isLoading) {
    return (
      <section className="loader">
        <div className="loader_inner"></div>
      </section>
    );
  } else return <></>;
};

export default Loader;
