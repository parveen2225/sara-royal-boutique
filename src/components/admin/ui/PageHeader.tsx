import type { ReactNode } from "react";

/** Consistent page heading: title (h1), optional count badge and subtitle, and the page's primary actions on the right. */
export default function PageHeader({ title, subtitle, count, actions }: { title: string; subtitle?: ReactNode; count?: number | null; actions?: ReactNode }) {
  return (
    <header className="ad_page_header">
      <div className="ad_page_header_text">
        <h1 className="ad_title">
          {title}
          {typeof count === "number" && <span className="ad_count_badge" aria-label={`${count} total`}>{count}</span>}
        </h1>
        {subtitle && <p className="ad_subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ad_page_actions">{actions}</div>}
    </header>
  );
}
