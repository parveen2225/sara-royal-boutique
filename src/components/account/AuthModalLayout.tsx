"use client";

// Shared look of every auth view: brand emblem (or a status icon), eyebrow, title, lead and a gold ornament.
import type { ReactNode } from "react";
import Image from "next/image";
import logoIcon from "../../../public/images/logo_icon.png";
import { AUTH_TITLE_ID } from "./authModalContext";

export function AuthModalLayout({ eyebrow, title, lead, icon, children }: { eyebrow: string; title: string; lead?: ReactNode; icon?: ReactNode; children?: ReactNode }) {
  return (
    <>
      <header className="acct_head">
        <span className={`acct_emblem ${icon ? "is_icon" : ""}`}>
          {icon ?? <Image src={logoIcon} alt="" width={38} height={40} />}
        </span>
        <p className="acct_eyebrow">{eyebrow}</p>
        <h2 className="acct_title" id={AUTH_TITLE_ID}>{title}</h2>
        {lead && <p className="acct_lead">{lead}</p>}
        <span className="acct_ornament" aria-hidden="true"><i /></span>
      </header>
      {children}
    </>
  );
}
