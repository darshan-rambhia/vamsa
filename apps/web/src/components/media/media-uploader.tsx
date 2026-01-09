"use client";

import { useState, useRef } from "react";
import { Button } from "@vamsa/ui/primitives";

interface MediaUploaderProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  progress?: number;
  error?: string | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/tiff",
];

export function MediaUploader({
  onUpload,
  isUploading,
  progress = 0,
  error,
}: MediaUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return "Please upload a valid image file (JPEG, PNG, GIF, WebP, or TIFF)";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 10MB";
    }
    return null;
  };

  const handleFile = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        className={`relative rounded-lg border-2 border-dashed transition-all duration-200 ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50 hover:bg-accent/5"
        } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept={ACCEPTED_FORMATS.join(",")}
          disabled={isUploading}
        />

        {!selectedFile && !isUploading && (
          <button
            type="button"
            className="flex w-full cursor-pointer flex-col items-center justify-center px-6 py-12 text-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg
              className="text-muted-foreground/50 mb-4 h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-foreground mb-2 text-base font-medium">
              Drop your photo here or click to browse
            </p>
            <p className="text-muted-foreground text-sm">
              JPEG, PNG, GIF, WebP, or TIFF (max 10MB)
            </p>
          </button>
        )}

        {selectedFile && !isUploading && preview && (
          <div className="p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              {/* Preview */}
              <div className="border-border h-32 w-32 shrink-0 overflow-hidden rounded-lg border-2">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* File info */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-foreground truncate font-medium">
                  {selectedFile.name}
                </p>
                <p className="text-muted-foreground text-sm">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleUploadClick} size="sm">
                    Upload Photo
                  </Button>
                  <Button onClick={handleClear} variant="outline" size="sm">
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="p-12 text-center">
            <div className="mb-4 flex items-center justify-center">
              <div className="bg-primary/10 flex h-12 w-12 animate-spin items-center justify-center rounded-full">
                <svg
                  className="text-primary h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
            </div>
            <p className="text-foreground mb-2 font-medium">Uploading...</p>
            {progress > 0 && (
              <div className="bg-muted mx-auto h-2 max-w-xs overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error messages */}
      {(validationError || error) && (
        <div className="border-destructive/20 bg-destructive/10 rounded-lg border-2 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="text-destructive h-5 w-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-destructive text-sm">
              {validationError || error}
            </p>
          </div>
        </div>
      )}

      {/* Success message placeholder */}
      {!error && !validationError && !isUploading && !selectedFile && (
        <div className="text-muted-foreground text-center text-sm">
          Select a photo to get started
        </div>
      )}
    </div>
  );
}
