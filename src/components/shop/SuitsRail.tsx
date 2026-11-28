"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Col, Container, Row } from "react-bootstrap";
import SuitCard from "./SuitCard";
import { fetchSuits, type PublicSuitListItem, type SuitQuery } from "@/lib/shopApi";
import "./shop.scss";

type Props = { label: string; title: string; subtitle?: string; query: SuitQuery; id?: string };

/** Home-page section: renders nothing until there is at least one published suit to show. */
export default function SuitsRail({ label, title, subtitle, query, id }: Props) {
  const [items, setItems] = useState<PublicSuitListItem[]>([]);
  const key = JSON.stringify(query);
  useEffect(() => {
    let cancelled = false;
    fetchSuits(JSON.parse(key))
      .then((r) => !cancelled && setItems(r.items))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (items.length === 0) return null;
  return (
    <section className="shop_rail" id={id}>
      <Container>
        <div className="shop_rail_head">
          <span className="shop_eyebrow">{label}</span>
          <h2 className="shop_rail_title">{title}</h2>
          {subtitle && <p className="shop_rail_sub">{subtitle}</p>}
        </div>
        <Row className="g-3 g-xl-4">
          {items.map((s) => (
            // same photo / design thumbnails as Collections; on Home the chosen design also carries into Choose Design / View Details
            <Col key={s.id} xs={6} md={4} lg={3}><SuitCard suit={s} gallery designLinks /></Col>
          ))}
        </Row>
        <div className="text-center mt-4"><Link href="/collections" className="shop_btn shop_btn_outline">Shop all suits</Link></div>
      </Container>
    </section>
  );
}
