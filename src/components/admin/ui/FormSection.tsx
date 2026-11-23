import type { ReactNode } from "react";

/** A titled card that groups related form fields (used by every admin form). */
export default function FormSection({ title, description, children, id }: { title: string; description?: string; children: ReactNode; id?: string }) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section className="ad_section" id={id} aria-labelledby={headingId}>
      <header>
        <h2 id={headingId}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}
