"use client";

import { useMemo } from "react";

import { useEdit } from "@/components/providers/EditProvider";
import { parseSafeDate } from "@/lib/utils";

interface EditableDateProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

function formatDate(value: string) {
  if (!value) {
    return "";
  }

  const parsedDate = parseSafeDate(value);
  if (!parsedDate) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(parsedDate);
}

export function EditableDate({ value, onChange, className, ariaLabel = "Editable date" }: EditableDateProps) {
  const { isEditing } = useEdit();

  const dateInputValue = useMemo(() => {
    if (!value) {
      return "";
    }

    return value.slice(0, 10);
  }, [value]);

  if (isEditing) {
    return (
      <input
        type="date"
        value={dateInputValue}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className={`rounded-md border border-rose/60 bg-warm-white px-2 py-1 text-sm outline-none focus:border-rose focus:ring-2 focus:ring-rose/20 ${
          className ?? ""
        }`}
      />
    );
  }

  return <time className={className}>{formatDate(value)}</time>;
}
