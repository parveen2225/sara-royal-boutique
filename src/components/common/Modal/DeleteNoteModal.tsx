"use client";
import CommonModal from "@/components/common/Modal/CommonModal";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";

interface DeleteNoteModalProps {
  show: boolean;
  handleClose: () => void;
  onConfirmDelete?: () => void;
  noteTitle?: string;
}

const DeleteNoteModal = ({
  show,
  handleClose,
  onConfirmDelete,
  noteTitle,
}: DeleteNoteModalProps) => {
  return (
    <CommonModal
      show={show}
      handleClose={handleClose}
      heading="Delete Note"
      className="delete_note_modal"
      variant="small"
    >
      <div className="delete_note_modal_body">
        <p className="delete_note_modal_text">
          Are you sure you want to delete{" "}
          {noteTitle ? (
            <>
              the note <strong>&quot;{noteTitle}&quot;</strong>
            </>
          ) : (
            "this note"
          )}
          ?
        </p>
        <p className="delete_note_modal_subtext">This action cannot be undone.</p>

        <div className="delete_note_modal_actions d-flex justify-content-end gap-3 mt-4">
          <CommonButton
            title="Cancel"
            className="white-btn"
            onClick={handleClose}
          />
          <CommonButton
            title="Delete"
            className="danger_btn"
            onClick={() => {
              onConfirmDelete?.();
              handleClose();
            }}
          />
        </div>
      </div>
    </CommonModal>
  );
};

export default DeleteNoteModal;
