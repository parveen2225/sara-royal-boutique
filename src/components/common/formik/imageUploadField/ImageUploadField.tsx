"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { uploadImages } from "@/lib/api/upload";
import ErrorComponent from "../errorComponent/ErrorComponent";
import "./ImageUploadField.scss";

interface ImageUploadFieldProps {
  label?: string;
  name?: string;
  values?: string[];
  error?: React.ReactNode;
  onChange?: (dataUrls: string[]) => void;
  previewFallback?: string;
  accept?: string;
  maxImages?: number;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label = "Product Images",
  name = "imageUrls",
  values = [],
  error,
  onChange,
  previewFallback = "/images/Designer_Suits5.webp",
  accept = "image/*",
  maxImages = 10,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const available = maxImages - values.length;
      const toProcess = fileArr.slice(0, available);
      if (toProcess.length === 0) return;

      setUploading(true);
      setUploadError("");
      uploadImages(toProcess)
        .then((urls) => {
          onChange?.([...values, ...urls.filter(Boolean)]);
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : "Upload failed";
          setUploadError(msg);
        })
        .finally(() => setUploading(false));
    },
    [values, maxImages, onChange],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    onChange?.(values.filter((_, i) => i !== index));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const canAddMore = values.length < maxImages;

  return (
    <div className={`input_group image_upload_field ${error ? "has-error" : ""}`}>
      {label && (
        <label className="form-label image_upload_label">
          {label}
          {values.length > 0 && (
            <span className="image_upload_count">
              {values.length}/{maxImages}
            </span>
          )}
        </label>
      )}

      <div className="image_upload_strip">
        {values.map((src, idx) => (
          <div key={idx} className="image_upload_thumb">
            <div className="image_upload_thumb_inner">
              <Image
                src={src || previewFallback}
                alt={`Image ${idx + 1}`}
                fill
                className="image_upload_thumb_img"
                unoptimized={src.startsWith("data:")}
              />
              {idx === 0 && <span className="image_upload_primary_badge">Main</span>}
            </div>
            <button
              type="button"
              className="image_upload_remove_btn"
              onClick={() => removeImage(idx)}
              aria-label={`Remove image ${idx + 1}`}
            >
              ✕
            </button>
          </div>
        ))}

        {canAddMore && (
          <div
            className={`image_upload_add_tile ${isDragging ? "dragging" : ""}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Add images"
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              id={name}
              name={name}
              type="file"
              accept={accept}
              multiple
              className="image_upload_input"
              onChange={onInputChange}
              tabIndex={-1}
            />
            <span className="image_upload_add_icon">{isDragging ? "↓" : "+"}</span>
            <span className="image_upload_add_text">
              {uploading ? "Uploading..." : values.length === 0 ? "Add Images" : "Add More"}
            </span>
          </div>
        )}
      </div>

      {values.length === 0 && (
        <p className="image_upload_hint_text">
          Click the tile or drag & drop — JPG, PNG, WEBP · Multiple allowed
        </p>
      )}

      {uploadError && <small className="text-danger d-block mt-1">{uploadError}</small>}
      <ErrorComponent error={error} />
    </div>
  );
};

export default ImageUploadField;
