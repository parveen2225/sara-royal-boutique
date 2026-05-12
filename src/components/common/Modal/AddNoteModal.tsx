"use client";
import CommonModal from "@/components/common/Modal/CommonModal";
import InputField from "@/components/common/formik/inputField/InputField";
import TextareaField from "@/components/common/formik/textareaField/TextareaField";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { useFormik } from "formik";
import * as Yup from "yup";

interface AddNoteModalProps {
  show: boolean;
  handleClose: () => void;
  onAddNote?: (note: { title: string; description: string }) => void;
}

const AddNoteModal = ({ show, handleClose, onAddNote }: AddNoteModalProps) => {
  const formik = useFormik({
    initialValues: { title: "", description: "" },
    validationSchema: Yup.object({
      title: Yup.string().required("Required"),
      description: Yup.string(),
    }),
    onSubmit: (values) => {
      onAddNote?.({ title: values.title.trim(), description: values.description.trim() });
      formik.resetForm();
      handleClose();
    },
  });

  const handleCancel = () => {
    formik.resetForm();
    handleClose();
  };

  return (
    <CommonModal
      show={show}
      handleClose={handleCancel}
      heading="New Note"
      className="add_note_modal"
      variant="small"
    >
      <form onSubmit={formik.handleSubmit} className="note_modal_body">
        <div className="mb-3">
          <InputField
            label="Title"
            name="title"
            type="text"
            placeholder="Enter note title"
            value={formik.values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.title && formik.errors.title ? formik.errors.title : undefined}
          />
        </div>

        <div className="mb-4">
          <TextareaField
            label="Description"
            name="description"
            placeholder="Enter note description"
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.description && formik.errors.description ? formik.errors.description : undefined}
            rows={4}
          />
        </div>

        <div className="note_modal_actions d-flex justify-content-end gap-3">
          <CommonButton
            title="Cancel"
            className="white-btn"
            onClick={handleCancel}
          />
          <CommonButton
            title="Add Note"
            type="submit"
            disabled={!(formik.isValid && formik.dirty)}
          />
        </div>
      </form>
    </CommonModal>
  );
};

export default AddNoteModal;
