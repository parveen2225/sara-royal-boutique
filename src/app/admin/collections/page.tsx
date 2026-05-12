"use client";

import { FormEvent, useState } from "react";
import { Card } from "react-bootstrap";
import { useAdmin } from "@/components/admin/AdminProvider";
import CommonTable from "@/components/common/ui/CommonTable/CommonTable";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import CommonModal from "@/components/common/Modal/CommonModal";
import InputField from "@/components/common/formik/inputField/InputField";
import SelectField from "@/components/common/formik/selectField/SelectField";

const FIELDS = [
  { label: "Name", key: "name" },
  { label: "Service", key: "service" },
  { label: "Products", key: "products" },
  { label: "Actions", key: "actions" },
];

export default function CollectionsPage() {
  const { state, addCollection, updateCollection, deleteCollection } = useAdmin();
  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState("custom-designs");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingServiceId, setEditingServiceId] = useState<string>("custom-designs");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const serviceOptions = state.services
    .filter((s) => s.active !== false)
    .map((s) => ({ value: s.id, label: s.title }));

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    addCollection(name.trim(), serviceId);
    setName("");
  };

  const onConfirmDelete = () => {
    if (!deleteId) return;
    deleteCollection(deleteId);
    setDeleteId(null);
  };

  return (
    <section>
      <div className="admin_section_header">
        <h4 className="mb-0">Collections</h4>
      </div>

      <Card className="admin_card p-3 mb-4">
        <form onSubmit={onCreate}>
          <div className="admin_inline_form">
            <div className="admin_inline_form_field">
              <InputField
                label="Collection Name"
                name="name"
                placeholder="e.g. Formal, Summer, Luxury"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="admin_inline_form_field">
              <SelectField
                name="serviceId"
                label="Service"
                value={serviceId}
                options={serviceOptions}
                onChange={(opt) => setServiceId(opt?.value ?? "")}
              />
            </div>
          </div>
          <CommonButton type="submit" className="admin_primary_btn admin_inline_form_btn">
            Add Collection
          </CommonButton>
        </form>
      </Card>

      <CommonTable fields={FIELDS} lastColumnWidth="160px">
        {state.collections.map((item) => {
          const productCount = state.products.filter((p) => p.categoryId === item.id).length;
          const isEditing = editingId === item.id;
          return (
            <tr key={item.id}>
              <td>
                {isEditing ? (
                  <InputField
                    name="editName"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                ) : (
                  item.name
                )}
              </td>
              <td>
                {isEditing ? (
                  <SelectField
                    key={editingId}
                    name="editService"
                    value={editingServiceId}
                    options={serviceOptions}
                    onChange={(opt) => setEditingServiceId(opt?.value ?? "")}
                  />
                ) : (
                  state.services.find((s) => s.id === item.serviceId)?.title ?? item.serviceId
                )}
              </td>
              <td>{productCount}</td>
              <td>
                {isEditing ? (
                  <div className="d-flex gap-2">
                    <CommonButton
                      className="admin_primary_btn admin_sm_btn"
                      type="button"
                      onClick={() => {
                        if (!editingId || !editingName.trim()) return;
                        updateCollection(editingId, editingName.trim(), editingServiceId);
                        setEditingId(null);
                        setEditingName("");
                      }}
                    >
                      Save
                    </CommonButton>
                    <CommonButton
                      className="admin_outline_btn admin_sm_btn"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </CommonButton>
                  </div>
                ) : (
                  <div className="d-flex gap-2">
                    <CommonButton
                      className="admin_outline_btn admin_sm_btn"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingName(item.name);
                        setEditingServiceId(item.serviceId);
                      }}
                    >
                      Edit
                    </CommonButton>
                    <CommonButton
                      className="admin_danger_btn admin_sm_btn"
                      onClick={() => setDeleteId(item.id)}
                    >
                      Delete
                    </CommonButton>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </CommonTable>

      <CommonModal
        show={!!deleteId}
        handleClose={() => setDeleteId(null)}
        heading="Delete Collection"
        backdrop="static"
        className="admin_delete_modal"
      >
        <p className="admin_modal_msg">
          Are you sure you want to delete this collection? All associated data may be affected.
        </p>
        <div className="admin_modal_actions">
          <CommonButton
            className="admin_outline_btn admin_sm_btn"
            onClick={() => setDeleteId(null)}
          >
            Cancel
          </CommonButton>
          <CommonButton className="admin_danger_btn admin_sm_btn" onClick={onConfirmDelete}>
            Delete
          </CommonButton>
        </div>
      </CommonModal>
    </section>
  );
}
