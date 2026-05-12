"use client";
import { useState, type ReactNode } from "react";
import { Form } from "react-bootstrap";
import ErrorComponent from "../errorComponent/ErrorComponent";
import "../FormControl.scss";
import "./InputField.scss";
import { CloseEyeIcon, OpenEyeIcon } from "@/assets/icons/svgIcon";
import CommonButton from "../../ui/commonButton/CommonButton";
interface InputFieldProps {
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
  children?: ReactNode;
  gradientText?: boolean;
}
const InputField: React.FC<InputFieldProps> = ({
  maxLength,
  label,
  name,
  type,
  placeholder,
  error,
  className,
  value,
  bottomTitle,
  righttext,
  righttextOnclick,
  disabled = false,
  onChange,
  onBlur,
  onWheel,
  onPaste,
  disableDecimal,
  children: chlidren,
  gradientText = false,
}) => {
  const [active, setActive] = useState(true);
  const handleTogglePassword = () => {
    setActive(!active);
  };
  const inputType =
    type === "password" ? (active ? "password" : "text") : type || "text";

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
      className={`input_group ${className} ${
        type === "password" ? "passfield" : ""
      }`}
    >
      {label && <Form.Label htmlFor={name}>{label}</Form.Label>}
      <div className={`input_group_inner ${righttext ? "rightpadding" : ""}`}>
        <Form.Control
          type={inputType}
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
        {type === "password" ? (
          <CommonButton
            type="button"
            className="input_group_passbtn"
            onClick={handleTogglePassword}
            ariaLabel={active ? "Show password" : "Hide password"}
          >
            {active ? <CloseEyeIcon /> : <OpenEyeIcon />}
          </CommonButton>
        ) : (
          ""
        )}
        {righttext && (
          <h5
            className={`input_group_inner_righttext ${gradientText ? "gradient-text" : ""}`}
            onClick={righttextOnclick}
          >
            {righttext}
          </h5>
        )}
      </div>
      <ErrorComponent error={error} />
      {bottomTitle && (
        <div className="input_group_btm_title">{bottomTitle}</div>
      )}
      {chlidren}
    </div>
  );
};
export default InputField;
