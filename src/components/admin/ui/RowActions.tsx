"use client";

import { Dropdown } from "react-bootstrap";
import AdminIcon from "./AdminIcon";

export type RowAction = { label: string; onClick?: () => void; tone?: "danger"; hidden?: boolean; divider?: boolean };

/** Compact "⋯" menu for secondary row actions. `fixed` positioning lets the menu escape scrolling table containers. */
export default function RowActions({ label, actions }: { label: string; actions: RowAction[] }) {
  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;
  return (
    <Dropdown align="end" className="ad_rowmenu">
      <Dropdown.Toggle as="button" type="button" className="ad_icon_btn" aria-label={label} id={`rowmenu-${label.replace(/\W+/g, "-")}`}>
        <AdminIcon name="dots" size={18} />
      </Dropdown.Toggle>
      <Dropdown.Menu popperConfig={{ strategy: "fixed" }} renderOnMount className="ad_menu">
        {visible.map((a, i) =>
          a.divider ? <Dropdown.Divider key={`d${i}`} /> : (
            <Dropdown.Item as="button" type="button" key={a.label} className={a.tone === "danger" ? "is_danger" : ""} onClick={a.onClick}>{a.label}</Dropdown.Item>
          ),
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}
