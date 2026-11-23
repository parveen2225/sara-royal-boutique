"use client";

import { useEffect, useState } from "react";
import { Col, Form, Row } from "react-bootstrap";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import ImageListEditor from "@/components/admin/suits/ImageListEditor";
import { errorMessage, type SuitImage } from "@/lib/api/suitsApi";
import { settingsApi, type AdminSettings } from "@/lib/api/returnsApi";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";

export default function SettingsPage() {
  const [s, setS] = useState<AdminSettings | null>(null);
  const [logo, setLogo] = useState<SuitImage[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    settingsApi.get().then((r) => { if (!cancelled) { setS(r); setLogo(r.logo ? [r.logo] : []); } }).catch((e) => !cancelled && setError(errorMessage(e)));
    return () => { cancelled = true; };
  }, []);

  if (!s) return error ? <div className="admin_error_banner" role="alert">{error}</div> : null;
  const set = (k: keyof AdminSettings, v: string) => setS({ ...s, [k]: v });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setNotice(""); setSaving(true);
    try {
      const saved = await settingsApi.save({
        whatsappNumber: s.whatsappNumber, boutiqueName: s.boutiqueName, businessAddress: s.businessAddress, contactNumber: s.contactNumber, email: s.email, invoiceFooter: s.invoiceFooter,
        logo: logo[0] ? { url: logo[0].url, publicId: logo[0].publicId } : null,
        gst: s.gst,
      });
      setS(saved); setLogo(saved.logo ? [saved.logo] : []);
      setNotice("Settings saved. Invoices already issued keep the details they were issued with.");
    } catch (err) {
      setError(errorMessage(err, "Could not save the settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <PageHeader title="Settings" subtitle="Ordering number and invoice details. Changes apply to new orders and invoices only." />
      {error && <div className="admin_error_banner mb-3" role="alert">{error}</div>}
      {notice && <div className="admin_success_banner" role="status">{notice}</div>}
      <Form className="admin_form" onSubmit={save} noValidate>
        <Row className="g-3">
          <Col lg={6}>
            <div className="admin_card admin_card_pad">
              <h6>Ordering</h6>
              <Form.Label htmlFor="st-wa">Order-receiving WhatsApp number</Form.Label>
              <Form.Control id="st-wa" value={s.whatsappNumber} placeholder="+91 98765 43210" onChange={(e) => set("whatsappNumber", e.target.value)} />
              <Form.Text className="text-muted">Include the country code. The website and the mobile app both use this number for “Buy on WhatsApp” and cart checkout. Saved as digits (e.g. 919876543210). Leave empty to switch WhatsApp ordering off.</Form.Text>
            </div>
          </Col>
          <Col lg={6}>
            <div className="admin_card admin_card_pad">
              <h6>Invoice branding</h6>
              <Form.Label htmlFor="st-name">Boutique name</Form.Label>
              <Form.Control id="st-name" value={s.boutiqueName} maxLength={120} onChange={(e) => set("boutiqueName", e.target.value)} className="mb-2" />
              <Form.Label htmlFor="st-addr">Business address</Form.Label>
              <Form.Control as="textarea" rows={2} id="st-addr" value={s.businessAddress} maxLength={500} onChange={(e) => set("businessAddress", e.target.value)} className="mb-2" />
              <Row className="g-2">
                <Col sm={6}><Form.Label htmlFor="st-phone">Contact number</Form.Label><Form.Control id="st-phone" value={s.contactNumber} maxLength={30} onChange={(e) => set("contactNumber", e.target.value)} /></Col>
                <Col sm={6}><Form.Label htmlFor="st-email">Email</Form.Label><Form.Control id="st-email" type="email" value={s.email} maxLength={254} onChange={(e) => set("email", e.target.value)} /></Col>
              </Row>
              <Form.Label htmlFor="st-foot" className="mt-2">Invoice footer</Form.Label>
              <Form.Control id="st-foot" value={s.invoiceFooter} maxLength={500} onChange={(e) => set("invoiceFooter", e.target.value)} />
            </div>
          </Col>
          <Col lg={6}>
            <div className="admin_card admin_card_pad">
              <ImageListEditor label="Invoice logo" hint="Shown at the top of PDF invoices (optional). Replacing or removing it does not change invoices already issued." images={logo} max={1} onChange={setLogo} />
            </div>
          </Col>
          <Col lg={6}>
            <div className="admin_card admin_card_pad">
              <h6>GST (optional)</h6>
              <Form.Check id="st-gst" type="switch" label="Show GSTIN on invoices" checked={s.gst.enabled} onChange={(e) => setS({ ...s, gst: { ...s.gst, enabled: e.target.checked } })} />
              <p className="small text-muted my-2">Off by default. When on, invoices print your GSTIN only: this app never assumes a tax rate and never adds a GST amount. Turn it on only after your accountant has confirmed your GST setup. Existing invoices are not changed.</p>
              {s.gst.enabled && (
                <Row className="g-2">
                  <Col sm={6}><Form.Label htmlFor="st-gstin">GSTIN (15 characters)</Form.Label><Form.Control id="st-gstin" value={s.gst.gstin} maxLength={15} onChange={(e) => setS({ ...s, gst: { ...s.gst, gstin: e.target.value.toUpperCase() } })} /></Col>
                  <Col sm={6}><Form.Label htmlFor="st-legal">Legal name</Form.Label><Form.Control id="st-legal" value={s.gst.legalName} maxLength={160} onChange={(e) => setS({ ...s, gst: { ...s.gst, legalName: e.target.value } })} /></Col>
                </Row>
              )}
            </div>
          </Col>
          <Col xs={12}><CommonButton type="submit" className="admin_primary_btn" disabled={saving} isLoading={saving}>Save settings</CommonButton></Col>
        </Row>
      </Form>
    </section>
  );
}
