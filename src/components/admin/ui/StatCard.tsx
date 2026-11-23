import Link from "next/link";
import type { ReactNode } from "react";
import AdminIcon, { type IconName } from "./AdminIcon";

type Props = { label: string; value: ReactNode; hint?: string; icon?: IconName; href?: string; tone?: "default" | "good" | "warn" | "bad" | "info"; size?: "md" | "hero"; title?: string };

/** KPI tile. Linked tiles are real links (keyboard-focusable); the tone also adds a text-visible cue, never colour alone. */
export default function StatCard({ label, value, hint, icon, href, tone = "default", size = "md", title }: Props) {
  const body = (
    <>
      <span className="ad_stat_top">
        {icon && <span className="ad_stat_icon"><AdminIcon name={icon} size={16} /></span>}
        <span className="ad_stat_label">{label}</span>
        {href && <AdminIcon name="right" size={14} className="ad_stat_go" />}
      </span>
      <span className="ad_stat_value">{value}</span>
      {hint && <span className="ad_stat_hint">{hint}</span>}
    </>
  );
  const cls = `ad_stat ad_stat_${tone} ad_stat_${size}`;
  return href ? <Link href={href} className={`${cls} is_link`} title={title}>{body}</Link> : <div className={cls} title={title}>{body}</div>;
}
