"use client";

import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";

import { useEdit } from "@/components/providers/EditProvider";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  placeholder?: string;
}

function insertPlainTextAtCursor(text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function isEditableEmpty(element: HTMLElement): boolean {
  const normalized = element.innerText.replaceAll("\u200B", "").replaceAll("\n", "");
  return normalized.length === 0;
}

export function EditableText({
  value,
  onChange,
  as = "p",
  className,
  placeholder
}: EditableTextProps) {
  const { isEditing } = useEdit();
  const editableRef = useRef<HTMLDivElement | null>(null);
  const [isEmpty, setIsEmpty] = useState(value.length === 0);
  const ViewTag = as;

  useEffect(() => {
    if (!isEditing || !editableRef.current) {
      return;
    }

    if (document.activeElement === editableRef.current) {
      return;
    }

    if (editableRef.current.innerText !== value) {
      editableRef.current.innerText = value;
    }

    setIsEmpty(isEditableEmpty(editableRef.current));
  }, [isEditing, value]);

  if (!isEditing) {
    return <ViewTag className={className}>{value}</ViewTag>;
  }

  return (
    <div className="group relative">
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        className={`rounded-md border border-rose/60 bg-warm-white/70 px-2 py-1 outline-none transition focus:border-rose focus:ring-2 focus:ring-rose/20 ${
          className ?? ""
        }`}
        onBlur={(event) => {
          const nextValue = event.currentTarget.innerText.trimEnd();
          setIsEmpty(isEditableEmpty(event.currentTarget));
          if (nextValue !== value) {
            onChange(nextValue);
          }
        }}
        onInput={(event) => {
          setIsEmpty(isEditableEmpty(event.currentTarget));
        }}
        onPaste={(event) => {
          event.preventDefault();
          const pastedText = event.clipboardData.getData("text/plain");
          insertPlainTextAtCursor(pastedText);
          setIsEmpty(isEditableEmpty(event.currentTarget));
        }}
        aria-label={placeholder ?? "Editable text"}
      >
        {value}
      </div>
      {placeholder && isEmpty ? (
        <span className="pointer-events-none absolute left-2 top-1 text-text-light">
          {placeholder}
        </span>
      ) : null}
      <span className="pointer-events-none absolute -right-2 -top-2 rounded-full border border-rose/40 bg-cream px-1.5 py-0.5 text-[10px] text-rose-ink opacity-0 transition group-hover:opacity-100">
        edit
      </span>
    </div>
  );
}
