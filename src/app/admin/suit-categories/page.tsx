"use client";

import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonModal from "@/components/common/Modal/CommonModal";
import AdminDeleteConfirmModal from "@/components/admin/modal/AdminDeleteConfirmModal/AdminDeleteConfirmModal";
import { errorMessage, suitsApi, type SuitCategory } from "@/lib/api/suitsApi";
import "@/components/admin/suits/suits.scss";
import PageHeader from "@/components/admin/ui/PageHeader";
import EmptyState from "@/components/admin/ui/EmptyState";
import AdminIcon from "@/components/admin/ui/AdminIcon";
import { useCurrentAdmin } from "@/lib/admin/useCurrentAdmin";

const FIELDS = [
  { label: "Name", key: "name" },
  { label: "Suits", key: "count" },
  { label: "Status", key: "status" },
  { label: "Actions", key: "actions" },
];

type Draft = { id?: string; name: string; description: string; active: boolean };

export default function SuitCategoriesPage() {
  const [items, setItems] = useState<SuitCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState("");
  const [toDelete, setToDelete] = useState<SuitCategory | null>(null);
  const [search, setSearch] = useState("");
  const { user } = useCurrentAdmin();
  const canManage = Boolean(user?.permissions.products); // same permission the category API enforces

  const [reloadTick, setReloadTick] = useState(0);
  const load = () => setReloadTick((t) => t + 1);
  useEffect(() => {
    let cancelled = false;
    suitsApi
      .categories()
      .then((c) => {
        if (cancelled) return;
        setItems(c);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(errorMessage(e, "Could not load categories."));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const save = async () => {
    if (!draft) return;
    setDraftError("");
    if (!draft.name.trim()) return setDraftError("Category name is required.");
    try {
      if (draft.id) await suitsApi.updateCategory(draft.id, { name: draft.name, description: draft.description, active: draft.active });
      else await suitsApi.createCategory({ name: draft.name, description: draft.description, active: draft.active });
      setNotice(draft.id ? "Category updated." : "Category added.");
      setDraft(null);
      load();
    } catch (e) {
      setDraftError(errorMessage(e));
    }
  };

  const toggle = async (c: SuitCategory) => {
    setError("");
    try {
      await suitsApi.updateCategory(c.id, { active: !c.active });
      setNotice(`${c.name} ${c.active ? "deactivated" : "activated"}.`);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const remove = async () => {
    const c = toDelete;
    setToDelete(null);
    if (!c) return;
    setError("");
    try {
      await suitsApi.deleteCategory(c.id, c.suitCount > 0);
      setNotice(`${c.name} deleted${c.suitCount ? ` and removed from ${c.suitCount} suit(s)` : ""}.`);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const openCreate = () => { setDraftError(""); setDraft({ name: "", description: "", active: true }); };
  const term = search.trim().toLowerCase();
  const shown = term ? items.filter((c) => c.name.toLowerCase().includes(term) || c.description.toLowerCase().includes(term)) : items;
  const empty = items.length === 0 ? (
    <EmptyState icon="tag" title="No Categories Yet" text="Create your first category to organise your unstitched suits."
      action={canManage ? <CommonButton className="admin_primary_btn" onClick={openCreate}>Create Category</CommonButton> : undefined} />
  ) : (
    <EmptyState icon="search" title="No Matching Results" text="Try adjusting your search or filters."
      action={<CommonButton className="admin_outline_btn" onClick={() => setSearch("")}>Clear Filters</CommonButton>} />
  );

  return (
    <section>
      <PageHeader title="Categories" count={items.length} subtitle="Group your unstitched suits so customers can browse them. Inactive categories are hidden from the website." actions={canManage ? <CommonButton className="admin_primary_btn" onClick={openCreate}>+ Add Category</CommonButton> : undefined} />
      {error && <div className="admin_error_banner mb-3" role="alert">{error}</div>}
      {notice && <div className="admin_success_banner" role="status">{notice}</div>}

      {items.length > 0 && (
        <div className="ad_toolbar">
          <label className="ad_search">
            <AdminIcon name="search" size={16} />
            <Form.Control aria-label="Search categories" placeholder="Search categories" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
      )}

      <CommonTable fields={FIELDS} loader={loading} lastColumnWidth="260px" empty={empty}>
        {shown.map((c) => (
          <tr key={c.id}>
            <td><strong>{c.name}</strong>{c.description && <small className="d-block text-muted">{c.description}</small>}</td>
            <td>{c.suitCount}</td>
            <td><span className={`admin_status_badge ${c.active ? "active" : "inactive"}`}>{c.active ? "Active" : "Inactive"}</span></td>
            <td>
              <div className="admin_row_actions">
                <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => { setDraftError(""); setDraft({ id: c.id, name: c.name, description: c.description, active: c.active }); }}>Edit</CommonButton>
                <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => toggle(c)}>{c.active ? "Deactivate" : "Activate"}</CommonButton>
                <CommonButton className="admin_danger_btn admin_sm_btn" onClick={() => setToDelete(c)}>Delete</CommonButton>
              </div>
            </td>
          </tr>
        ))}
      </CommonTable>

      {draft && (
        <CommonModal show handleClose={() => setDraft(null)} heading={draft.id ? "Edit category" : "Add category"} backdrop="static" className="admin_delete_confirm_modal">
          {draftError && <div className="admin_error_banner mb-2" role="alert">{draftError}</div>}
          <Form className="admin_form" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Form.Label htmlFor="cat-name">Name *</Form.Label>
            <Form.Control id="cat-name" value={draft.name} maxLength={80} autoFocus onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mb-2" />
            <Form.Label htmlFor="cat-desc">Description</Form.Label>
            <Form.Control id="cat-desc" value={draft.description} maxLength={500} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="mb-2" />
            <Form.Check id="cat-active" type="checkbox" label="Active (visible to customers)" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="mb-3" />
            <div className="admin_delete_confirm_actions">
              <CommonButton className="admin_outline_btn admin_sm_btn" onClick={() => setDraft(null)}>Cancel</CommonButton>
              <CommonButton type="submit" className="admin_primary_btn admin_sm_btn">Save</CommonButton>
            </div>
          </Form>
        </CommonModal>
      )}

      <AdminDeleteConfirmModal
        show={!!toDelete}
        heading="Delete category"
        message={toDelete ? (toDelete.suitCount > 0 ? `“${toDelete.name}” is assigned to ${toDelete.suitCount} suit(s). Deleting it removes the category from those suits; the suits themselves stay.` : `Delete the category “${toDelete.name}”?`) : ""}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
      />
    </section>
  );
}
