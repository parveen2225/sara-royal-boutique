import { useState } from 'react';
import { ReactNode } from "react";
import { Dropdown } from "react-bootstrap";
import './CustomInputDropdown.scss';
import { ArrowDownIcon } from "../../../../assets/icons/svgIcon";

interface CustomInputDropdownProps {
  error?: ReactNode;
  className?: string;
  label?: ReactNode;
  options?: DropdownOption[];
  defaultSelectedOption?: DropdownOption;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLDivElement | HTMLButtonElement>) => void;
  onErrorClear?: () => void;
}

interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
}

const CustomInputDropdown: React.FC<CustomInputDropdownProps> = ({
  label,
  className = '',
  options = [],
  defaultSelectedOption,
  onChange,
  onBlur,
  onErrorClear
}) => {
  const [selectedOption, setSelectedOption] = useState<DropdownOption>(() => {
    if (defaultSelectedOption) {
      return defaultSelectedOption;
    }
    return options.length > 0 ? options[0] : { value: '', label: '' };
  });

  // When the options (or the default) change and there is no explicit default, select the first option.
  // Done during render, guarded by a change check (not in an effect).
  const [seenOptions, setSeenOptions] = useState(options);
  const [seenDefault, setSeenDefault] = useState(defaultSelectedOption);
  if (seenOptions !== options || seenDefault !== defaultSelectedOption) {
    setSeenOptions(options);
    setSeenDefault(defaultSelectedOption);
    if (!defaultSelectedOption && options.length > 0) setSelectedOption(options[0]);
  }

  const handleSelect = (option: DropdownOption) => {
    setSelectedOption(option);
    if (onChange) {
      onChange({ target: { value: option.value } } as React.ChangeEvent<HTMLInputElement>);
    }
    if (onErrorClear) {
      onErrorClear(); 
    }
  };

  return (
    <div className={`custominput_dropdown ${className}`}>
      {label && <label htmlFor={"filterdropdown"}>{label}</label>}
      <Dropdown className="custominput_dropdownbox">
        <Dropdown.Toggle
          as={"div"}
          id="filterdropdown"
          onBlur={onBlur} 
        >
          <>
            <div>{selectedOption?.label}</div>
            <ArrowDownIcon />
          </>
        </Dropdown.Toggle>
        <Dropdown.Menu align={"end"}>
          {options.map((option, index) => (
            <Dropdown.Item
              key={index}
              onClick={() => handleSelect(option)}
              className={`${selectedOption?.value === option.value ? "active" : ""} ${option.icon ? "icon" : ""}`}
            >
              <span>{option.label}</span>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default CustomInputDropdown;
