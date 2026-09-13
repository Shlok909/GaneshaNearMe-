"use client";

import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Preview = { id: string; url: string; name: string; file: File };
const supportedTypes = ["image/jpeg", "image/png", "image/webp"];

export function ImagePicker({
  id,
  label,
  max,
  error,
  onCountChange,
  onFilesChange,
  required = true,
}: {
  id: string;
  label: string;
  max: number;
  error?: string;
  onCountChange?: (count: number) => void;
  onFilesChange?: (files: File[]) => void;
  required?: boolean;
}) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [fileError, setFileError] = useState("");
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const currentUrls = urls.current;
    return () => {
      currentUrls.forEach((url) => URL.revokeObjectURL(url));
      currentUrls.clear();
    };
  }, []);
  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const remaining = max - previews.length;
    const valid = files.filter(
      (file) =>
        supportedTypes.includes(file.type) &&
        file.size > 0 &&
        file.size <= 5 * 1024 * 1024,
    );
    const message =
      valid.length !== files.length
        ? "Choose JPG, PNG or WebP images up to 5 MB. Empty files are not supported."
        : files.length > remaining
          ? `You can add up to ${max} photos here.`
          : "";
    setFileError(message);
    const additions = valid.slice(0, remaining).map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { id: url, url, name: file.name, file };
    });
    const next = [...previews, ...additions];
    setPreviews(next);
    onCountChange?.(next.length);
    onFilesChange?.(next.map((preview) => preview.file));
    event.target.value = "";
  }
  return (
    <div className="image-picker">
      <div className="upload-title">
        <label htmlFor={id}>
          {label}
          {required && <span className="required-mark"> *</span>}
        </label>
        <span>
          {previews.length}/{max}
        </span>
      </div>
      {previews.length < max && (
        <label className="upload-area" htmlFor={id}>
          <ImagePlus size={25} />
          <strong>Click to add photos</strong>
          <span>JPG, PNG or WebP · up to 5 MB</span>
          <input
            className="sr-only"
            id={id}
            name={id}
            type="file"
            accept={supportedTypes.join(",")}
            multiple
            onChange={pick}
            aria-invalid={!!(error || fileError)}
            aria-describedby={`${id}-hint`}
          />
        </label>
      )}
      {previews.length === max && (
        <span id={id} tabIndex={-1} className="sr-only">
          Maximum of {max} photos selected
        </span>
      )}
      {previews.length > 0 && (
        <div className="upload-previews">
          {previews.map((preview) => (
            <div key={preview.id} className="upload-preview">
              <Image
                src={preview.url}
                alt={`Selected photo: ${preview.name}`}
                fill
                sizes="100px"
                unoptimized
              />
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove ${preview.name}`}
                onClick={() => {
                  URL.revokeObjectURL(preview.url);
                  urls.current.delete(preview.url);
                  const next = previews.filter(
                    (item) => item.id !== preview.id,
                  );
                  setPreviews(next);
                  onCountChange?.(next.length);
                  onFilesChange?.(next.map((preview) => preview.file));
                  setFileError("");
                }}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      <p
        id={`${id}-hint`}
        className={error || fileError ? "field-error" : "field-hint"}
      >
        {fileError ||
          error ||
          `Add 1–${max} clear photos. JPEG, PNG or WebP, up to 5 MB each.`}
      </p>
    </div>
  );
}
