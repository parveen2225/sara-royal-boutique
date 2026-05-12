import { Head, Html, Main, NextScript } from "next/document";
import Document from "next/document";
import { getThemeInitScript } from "@/lib/theme/themeInit";

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" suppressHydrationWarning>
        <Head>
          <script
            id="theme-init"
            dangerouslySetInnerHTML={{ __html: getThemeInitScript() }}
          />
        </Head>
        <body suppressHydrationWarning>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

