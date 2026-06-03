"use client";

import { useEffect, useRef, useState } from "react";

import { useEdit } from "@/components/providers/EditProvider";

interface EditableRichTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function EditableRichText({
  value,
  onChange,
  placeholder,
  className
}: EditableRichTextProps) {
  const { isEditing } = useEdit();
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (!isEditing || !textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [draft, isEditing]);

  if (!isEditing) {
    return <p className={`whitespace-pre-wrap ${className ?? ""}`}>{value}</p>;
  }

  return (
    <textarea
      ref={textareaRef}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== value) {
          onChange(draft);
        }
      }}
      rows={4}
      placeholder={placeholder}
      className={`w-full resize-none rounded-md border border-rose/60 bg-warm-white px-3 py-2 outline-none transition focus:border-rose focus:ring-2 focus:ring-rose/20 ${className ?? ""}`}
    />
  );
}
