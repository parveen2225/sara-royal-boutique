"use client";
import { useEffect } from "react";
import CommonModal from "@/components/common/Modal/CommonModal";
import InputField from "@/components/common/formik/inputField/InputField";
import TextareaField from "@/components/common/formik/textareaField/TextareaField";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { useFormik } from "formik";
import * as Yup from "yup";

export interface NoteData {
  id: string;
  title: string;
  description: string;
}

interface EditNoteModalProps {
  show: boolean;
  handleClose: () => void;
  note?: NoteData | null;
  onSave?: (note: NoteData) => void;
}

const EditNoteModal = ({ show, handleClose, note, onSave }: EditNoteModalProps) => {
  const {
    handleBlur,
    handleChange,
    handleSubmit,
    setValues,
    resetForm,
    values,
    touched,
    errors,
    isValid,
    dirty,
  } = useFormik({
    initialValues: { title: "", description: "" },
    validationSchema: Yup.object({
      title: Yup.string().required("Required"),
      description: Yup.string(),
    }),
    onSubmit: (values) => {
      if (note) {
        onSave?.({ ...note, title: values.title.trim(), description: values.description.trim() });
        resetForm();
        handleClose();
      }
    },
  });

  useEffect(() => {
    if (note && show) {
      setValues({
        title: note.title,
        description: note.description,
      });
    }
  }, [note, setValues, show]);

  const handleCancel = () => {
    resetForm();
    handleClose();
  };

  return (
    <CommonModal
      show={show}
      handleClose={handleCancel}
      heading="Edit Note"
      className="edit_note_modal"
      variant="small"
    >
      <form onSubmit={handleSubmit} className="note_modal_body">
        <div className="mb-3">
          <InputField
            label="Title"
            name="title"
            type="text"
            placeholder="Enter note title"
            value={values.title}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.title && errors.title ? errors.title : undefined}
          />
        </div>

        <div className="mb-4">
          <TextareaField
            label="Description"
            name="description"
            placeholder="Enter note description"
            value={values.description}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.description && errors.description ? errors.description : undefined}
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
            title="Save"
            type="submit"
            disabled={!(isValid && dirty)}
          />
        </div>
      </form>
    </CommonModal>
  );
};

export default EditNoteModal;
