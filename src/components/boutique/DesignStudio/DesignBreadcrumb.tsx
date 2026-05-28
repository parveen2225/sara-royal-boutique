"use client";

import React from "react";
import Link from "next/link";

type Crumb = { label: string; href?: string };

type DesignBreadcrumbProps = {
  items: Crumb[];
};

const DesignBreadcrumb: React.FC<DesignBreadcrumbProps> = ({ items }) => (
  <nav className="ds_breadcrumb" aria-label="Breadcrumb">
    <ol>
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          {item.href && index < items.length - 1 ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span aria-current={index === items.length - 1 ? "page" : undefined}>
              {item.label}
            </span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

export default DesignBreadcrumb;
