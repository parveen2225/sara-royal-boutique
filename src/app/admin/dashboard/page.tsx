"use client";

import { Col, Row } from "react-bootstrap";
import { useAdmin } from "@/components/admin/AdminProvider";

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="admin_card admin_stat admin_stat_animated">
      <div className="admin_stat_icon_wrap">{icon}</div>
      <p className="admin_stat_value">{value}</p>
      <p className="admin_stat_label">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { state } = useAdmin();

  return (
    <section>
      <div className="admin_section_header">
        <h4 className="mb-0">Dashboard</h4>
      </div>
      <Row className="g-3">
        <Col md={4} sm={6}>
          <StatCard label="Total Products" value={state.products.length} icon="👗" />
        </Col>
        <Col md={4} sm={6}>
          <StatCard
            label="Active Services"
            value={state.services.filter((s) => s.active).length}
            icon="✂️"
          />
        </Col>
        <Col md={4} sm={6}>
          <StatCard label="Total Collections" value={state.collections.length} icon="📁" />
        </Col>
      </Row>
    </section>
  );
}
