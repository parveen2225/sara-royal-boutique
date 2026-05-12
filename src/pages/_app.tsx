import type { AppProps } from "next/app";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/app/globals.scss";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import Loader from "@/components/common/ui/loader/Loader";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Loader />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

