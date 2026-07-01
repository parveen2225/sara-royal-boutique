import React, { useEffect, useState } from 'react';
import OtpInput from 'react-otp-input';
import { Form } from 'react-bootstrap';
import './OtpField.scss';

interface OtpProps {
  value: string;
  onChange: (value: string) => void;
  label?: React.ReactNode;
  className?: string;
  classLabel?: string;
  id?: string;
  shouldAutoFocus?: boolean;
  required?: boolean;
  numInputs?: number;
}

const OtpField = (props: OtpProps) => {
  const numInputs = props.numInputs || 6;
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = e.clipboardData.getData('text');
    if (/^[0-9]*$/.test(pasteData)) {
      e.preventDefault();
      const newValue = pasteData.slice(0, numInputs);
      props.onChange(newValue);
    } else {
      e.preventDefault();
    }
  };
  const handleChange = (newValue: string) => {
    const cleanedValue = newValue.replace(/[^0-9]/g, '').slice(0, numInputs);
    props.onChange(cleanedValue);
  };

  useEffect(() => {
    const cleanedValue = props.value.replace(/[^0-9]/g, '');
    if (cleanedValue !== props.value) {
      props.onChange(cleanedValue);
    }
  }, [props.value]);
  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const value = input.value.replace(/[^0-9]/g, ''); // Remove non-numeric characters
    if (value !== input.value) {
      input.value = value; // Update the input field with cleaned value
    }
  };

  return (
    <div className={`OtpIputs ${props.className}`}>
      {props.label && (
        <Form.Label htmlFor={props.id} className={props.classLabel}>
          {props.label}
          {props.required ? <span>*</span> : ''}
        </Form.Label>
      )}
      <OtpInput
        shouldAutoFocus={props.shouldAutoFocus}
        value={props.value}
        onChange={handleChange}
        numInputs={numInputs}
        renderInput={(inputProps: React.InputHTMLAttributes<HTMLInputElement>) => (
          <input
            {...inputProps}
            onPaste={handlePaste}
            onInput={handleInput} 
            type="text" 
            inputMode="numeric"
            placeholder='-'
          />
        )}
      />
     
    </div>
  );
};
export default OtpField;
