import { type ReactNode } from "react";
import { Form } from "react-bootstrap";
import ErrorComponent from "../errorComponent/ErrorComponent";
import "../FormControl.scss";
interface TextareaFieldProps {
  label?: ReactNode;
  name?: string;
  type?: string;
  placeholder?: string;
  error?: ReactNode;
  className?: string;
  value?: string;
  disabled?: boolean;
  righttext?: ReactNode;
  maxLength?: number;
  disableDecimal?: boolean;
  righttextOnclick?: () => void;
  bottomTitle?: ReactNode;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement, Element>) => void;
  onWheel?: (e: React.WheelEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  rows?: number;
}
const TextareaField: React.FC<TextareaFieldProps> = ({
  maxLength,
  label,
  name,
  type,
  placeholder,
  error,
  className,
  value,
  disabled = false,
  onChange,
  onBlur,
  onWheel,
  onPaste,
  disableDecimal,
  rows,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (type == "number" && ["e", "-"].includes(e.key)) {
      e.preventDefault();
    }
    if (disableDecimal && e.key == ".") {
      e.preventDefault();
    }
  };
  return (
    <div
      className={`input_group ${className}`}
    >
      {label && <Form.Label htmlFor={name}>{label}</Form.Label>}
      <div className={`input_group_inner`}>
        <Form.Control
          type='textarea'
          as="textarea"
          rows={rows || 3}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          isInvalid={!!error}
          disabled={disabled}
          maxLength={maxLength}
          onWheel={onWheel}
          onPaste={onPaste}
          onKeyDown={handleKeyDown}
        />
      </div>
      <ErrorComponent error={error} />
    </div>
  );
};
export default TextareaField;
