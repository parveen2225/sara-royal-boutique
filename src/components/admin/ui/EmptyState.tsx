import type { ReactNode } from "react";
import AdminIcon, { type IconName } from "./AdminIcon";

export default function EmptyState({ icon = "box", title, text, action }: { icon?: IconName; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ad_empty" role="status">
      <span className="ad_empty_icon"><AdminIcon name={icon} size={28} /></span>
      <h2 className="ad_empty_title">{title}</h2>
      {text && <p className="ad_empty_text">{text}</p>}
      {action && <div className="ad_empty_action">{action}</div>}
    </div>
  );
}
