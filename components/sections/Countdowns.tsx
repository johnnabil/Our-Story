"use client";

import { useEffect, useState } from "react";

import { EditableDate } from "@/components/edit/EditableDate";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import { MemoryLoading } from "@/components/ui/MemoryLoading";
import { UndoToast } from "@/components/ui/UndoToast";
import type { ImportantDate, Milestone } from "@/lib/types";
import { parseSafeDate } from "@/lib/utils";

type RemovedCountdownItem =
  | { type: "milestone"; item: Milestone; index: number }
  | { type: "date"; item: ImportantDate; index: number };

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isSameMonthAndDay(left: Date, right: Date) {
  return left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function getNextOccurrence(value: string, now: Date) {
  const parsed = parseSafeDate(value);
  if (!parsed) {
    return null;
  }

  if (isSameMonthAndDay(parsed, now)) {
    return now;
  }

  const next = new Date(now.getFullYear(), parsed.getMonth(), parsed.getDate());
  if (next < now) {
    next.setFullYear(next.getFullYear() + 1);
  }

  return next;
}

function getCountdown(value: string, now: Date) {
  const next = getNextOccurrence(value, now);
  if (!next) {
    return null;
  }

  const remainingMs = Math.max(0, next.getTime() - now.getTime());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function getTogetherDurationLabel(value: string) {
  const parsed = parseSafeDate(value);
  if (!parsed) {
    return null;
  }

  const today = getStartOfToday();
  let totalMonths =
    (today.getFullYear() - parsed.getFullYear()) * 12 + (today.getMonth() - parsed.getMonth());

  if (today.getDate() < parsed.getDate()) {
    totalMonths -= 1;
  }

  totalMonths = Math.max(0, totalMonths);

  if (totalMonths < 12) {
    return `${totalMonths} ${totalMonths === 1 ? "month" : "months"} together`;
  }

  const years = Math.floor(totalMonths / 12);
  return `${years} ${years === 1 ? "year" : "years"} together`;
}

function formatDate(value: string, isRecurring = false) {
  const parsed = parseSafeDate(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(isRecurring ? {} : { year: "numeric" })
  }).format(parsed);
}

function formatOrdinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  const mod10 = value % 10;
  if (mod10 === 1) {
    return `${value}st`;
  }

  if (mod10 === 2) {
    return `${value}nd`;
  }

  if (mod10 === 3) {
    return `${value}rd`;
  }

  return `${value}th`;
}

function getTurningAge(value: string, now: Date) {
  const birthDate = parseSafeDate(value);
  const nextBirthday = getNextOccurrence(value, now);
  if (!birthDate || !nextBirthday) {
    return null;
  }

  return nextBirthday.getFullYear() - birthDate.getFullYear();
}

function formatTimerNumber(value: number) {
  return String(value).padStart(2, "0");
}

function CountdownTimer({ value, now }: { value: string; now: Date }) {
  const countdown = getCountdown(value, now);

  if (!countdown) {
    return <p className="mt-4 text-sm text-text-muted">Invalid date</p>;
  }

  return (
    <div className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-2">
      <div className="min-w-0 rounded-lg border border-gold/20 bg-cream/70 px-1.5 py-2 text-center">
        <p className="truncate font-semibold text-rose-deep">{countdown.days}</p>
        <p
          className="truncate text-[10px] uppercase leading-tight text-text-light"
          aria-label="Days"
        >
          d
        </p>
      </div>
      <div className="min-w-0 rounded-lg border border-gold/20 bg-cream/70 px-1.5 py-2 text-center">
        <p className="truncate font-semibold text-rose-deep">{formatTimerNumber(countdown.hours)}</p>
        <p
          className="truncate text-[10px] uppercase leading-tight text-text-light"
          aria-label="Hours"
        >
          h
        </p>
      </div>
      <div className="min-w-0 rounded-lg border border-gold/20 bg-cream/70 px-1.5 py-2 text-center">
        <p className="font-semibold text-rose-deep">{formatTimerNumber(countdown.minutes)}</p>
        <p
          className="truncate text-[10px] uppercase leading-tight text-text-light"
          aria-label="Minutes"
        >
          m
        </p>
      </div>
      <div className="min-w-0 rounded-lg border border-gold/20 bg-cream/70 px-1.5 py-2 text-center">
        <p className="font-semibold text-rose-deep">{formatTimerNumber(countdown.seconds)}</p>
        <p
          className="truncate text-[10px] uppercase leading-tight text-text-light"
          aria-label="Seconds"
        >
          s
        </p>
      </div>
    </div>
  );
}

export function Countdowns() {
  const { content, isLoading, updateContent } = useContent();
  const { isEditing } = useEdit();

  const [now, setNow] = useState(() => new Date());
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [newDateName, setNewDateName] = useState("");
  const [newDateValue, setNewDateValue] = useState("");
  const [newDateIcon, setNewDateIcon] = useState("");
  const [newDateIsRecurring, setNewDateIsRecurring] = useState(false);
  const [newDateError, setNewDateError] = useState<string | null>(null);
  const [removedItem, setRemovedItem] = useState<RemovedCountdownItem | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  if (isLoading || !content) {
    return <MemoryLoading id="countdowns" />;
  }

  const milestones = content.milestones;
  const dates = content.dates;
  const herName = content.profiles.her.name || "Her";
  const himName = content.profiles.him.name || "Him";
  const birthdays = [
    {
      id: "her",
      personName: herName,
      icon: "🎂",
      name: `${herName}'s Birthday`,
      date: content.profiles.her.birthday ?? ""
    },
    {
      id: "him",
      personName: himName,
      icon: "🎂",
      name: `${himName}'s Birthday`,
      date: content.profiles.him.birthday ?? ""
    }
  ].filter((birthday) => Boolean(birthday.date));

  const removeMilestone = (milestone: Milestone, index: number) => {
    setRemovedItem({ type: "milestone", item: milestone, index });
    updateContent(
      "milestones",
      milestones.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const removeDate = (dateItem: ImportantDate, index: number) => {
    setRemovedItem({ type: "date", item: dateItem, index });
    updateContent(
      "dates",
      dates.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const restoreRemovedItem = () => {
    if (!removedItem) {
      return;
    }

    if (removedItem.type === "milestone") {
      const next = [...milestones];
      next.splice(Math.min(removedItem.index, next.length), 0, removedItem.item);
      updateContent("milestones", next);
    } else {
      const next = [...dates];
      next.splice(Math.min(removedItem.index, next.length), 0, removedItem.item);
      updateContent("dates", next);
    }

    setRemovedItem(null);
  };

  const resetNewDate = () => {
    setIsDateModalOpen(false);
    setNewDateName("");
    setNewDateValue("");
    setNewDateIcon("");
    setNewDateIsRecurring(false);
    setNewDateError(null);
  };

  const handleAddDate = () => {
    if (!newDateName.trim() || !newDateValue.trim()) {
      setNewDateError("Add a name and date before saving.");
      return;
    }

    updateContent("dates", [
      ...dates,
      {
        name: newDateName.trim(),
        date: newDateValue,
        icon: newDateIcon.trim() || "*",
        isRecurring: newDateIsRecurring
      }
    ]);

    resetNewDate();
  };

  return (
    <section
      id="countdowns"
      className="px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
        <h2 className="font-serif text-4xl leading-tight text-rose-ink sm:text-5xl md:text-6xl">
          Dates We Keep
        </h2>
        </div>
        {isEditing ? (
          <button
            type="button"
            onClick={() =>
              updateContent("milestones", [
                ...milestones,
                {
                  label: "Milestone",
                  name: "New memory",
                  date: new Date().toISOString().slice(0, 10),
                  icon: "*"
                }
              ])
            }
            className="min-h-11 rounded-full border border-rose/40 bg-warm-white px-4 py-2 text-sm text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
          >
            Add milestone
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr] lg:grid-cols-[1.3fr_1fr_1fr]">
        {milestones.map((milestone, index) => {
          const togetherDurationLabel = getTogetherDurationLabel(milestone.date);
          return (
            <article
              key={`${milestone.name}-${index}`}
              className={`rounded-2xl border border-gold/25 bg-warm-white/85 p-4 shadow-sm sm:p-5 ${
                index === 0 ? "md:row-span-2 md:p-6 lg:bg-parchment" : ""
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <EditableText
                  value={milestone.icon}
                  className="text-2xl"
                  onChange={(icon) => {
                    const next = [...milestones];
                    next[index] = { ...milestone, icon };
                    updateContent("milestones", next);
                  }}
                />
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => removeMilestone(milestone, index)}
                    className="min-h-11 rounded-full border border-rose/30 px-3 py-2 text-xs text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <EditableText
                value={milestone.label}
                className="text-sm font-medium text-text-light"
                onChange={(label) => {
                  const next = [...milestones];
                  next[index] = { ...milestone, label };
                  updateContent("milestones", next);
                }}
              />
              <EditableText
                value={milestone.name}
                as="h3"
                className="mt-1 font-serif text-2xl text-text"
                onChange={(name) => {
                  const next = [...milestones];
                  next[index] = { ...milestone, name };
                  updateContent("milestones", next);
                }}
              />
              <div className="mt-3">
                <EditableDate
                  value={milestone.date}
                  ariaLabel={`Date for ${milestone.name || "milestone"}`}
                  onChange={(date) => {
                    const next = [...milestones];
                    next[index] = { ...milestone, date };
                    updateContent("milestones", next);
                  }}
                />
              </div>

              <CountdownTimer value={milestone.date} now={now} />
              <p className="text-sm text-text-muted">
                {togetherDurationLabel ?? "Invalid date"}
              </p>
            </article>
          );
        })}
      </div>

      {birthdays.length ? (
        <div className="mt-14">
          <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <h3 className="font-serif text-2xl text-rose-deep sm:text-3xl">Birthdays</h3>
            {isEditing ? (
              <p className="text-sm text-text-muted">Edit birthdays in Profiles section.</p>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {birthdays.map((birthday) => {
              const turningAge = getTurningAge(birthday.date, now);
              const birthdayTitle =
                turningAge === null
                  ? birthday.name
                  : `${birthday.personName}'s ${formatOrdinal(turningAge)} Birthday`;

              return (
                <article
                  key={birthday.id}
                  className="rounded-2xl border border-gold/20 bg-gold-light/25 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">{birthday.icon}</span>
                    <p className="font-medium text-text">{birthdayTitle}</p>
                  </div>
                  <p className="text-sm text-text-muted">{formatDate(birthday.date, true)}</p>
                  {turningAge === null ? <p className="mt-1 text-sm text-text-muted">Invalid birthday</p> : null}
                  <CountdownTimer value={birthday.date} now={now} />
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-14">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h3 className="font-serif text-2xl text-rose-deep sm:text-3xl">Important Dates</h3>
          {isEditing ? (
            <button
              type="button"
              onClick={() => setIsDateModalOpen(true)}
              className="min-h-11 rounded-full border border-rose/40 bg-warm-white px-4 py-2 text-sm text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
            >
              Add date
            </button>
          ) : null}
        </div>

        {isEditing && isDateModalOpen ? (
          <div className="mb-5 rounded-2xl border border-gold/25 bg-warm-white/85 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px_100px]">
              <label className="block text-sm text-text-muted">
                Name
                <input
                  type="text"
                  value={newDateName}
                  onChange={(event) => {
                    setNewDateName(event.target.value);
                    setNewDateError(null);
                  }}
                  className="mt-1 min-h-11 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
                />
              </label>
              <label className="block text-sm text-text-muted">
                Date
                <input
                  type="date"
                  value={newDateValue}
                  onChange={(event) => {
                    setNewDateValue(event.target.value);
                    setNewDateError(null);
                  }}
                  className="mt-1 min-h-11 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
                />
              </label>
              <label className="block text-sm text-text-muted">
                Icon
                <input
                  type="text"
                  value={newDateIcon}
                  onChange={(event) => setNewDateIcon(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-md border border-gold/35 bg-cream px-3 py-2 text-text outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
                  placeholder="*"
                />
              </label>
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={newDateIsRecurring}
                onChange={(event) => setNewDateIsRecurring(event.target.checked)}
                className="h-4 w-4 rounded border-gold/35 text-rose-ink focus:ring-rose/30"
              />
              Repeats yearly (countdown uses month and day)
            </label>
            {newDateError ? <p className="mt-3 text-sm text-rose-deep">{newDateError}</p> : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={resetNewDate}
                className="min-h-11 rounded-full border border-gold/35 px-4 py-2 text-sm text-text-muted transition hover:bg-cream active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDate}
                className="min-h-11 rounded-full border border-rose/40 px-4 py-2 text-sm text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
              >
                Save date
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {dates.map((dateItem, index) => {
            return (
              <article
                key={`${dateItem.name}-${index}`}
                className="rounded-2xl border border-gold/20 bg-warm-white/85 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <EditableText
                    value={dateItem.icon}
                    className="text-xl"
                    onChange={(icon) => {
                      const next = [...dates];
                      next[index] = { ...dateItem, icon };
                      updateContent("dates", next);
                    }}
                  />
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={() => removeDate(dateItem, index)}
                      className="min-h-11 rounded-full border border-rose/30 px-3 py-2 text-xs text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <EditableText
                  value={dateItem.name}
                  className="font-medium text-text"
                  onChange={(name) => {
                    const next = [...dates];
                    next[index] = { ...dateItem, name };
                    updateContent("dates", next);
                  }}
                />
                <div className="mt-2">
                  {isEditing ? (
                    <EditableDate
                      value={dateItem.date}
                      ariaLabel={`Date for ${dateItem.name || "important date"}`}
                      onChange={(date) => {
                        const next = [...dates];
                        next[index] = { ...dateItem, date };
                        updateContent("dates", next);
                      }}
                    />
                  ) : (
                    <p className="text-sm text-text-muted">
                      {formatDate(dateItem.date, Boolean(dateItem.isRecurring))}
                    </p>
                  )}
                </div>

                {isEditing ? (
                  <label className="mt-2 inline-flex items-center gap-2 text-xs text-text-muted">
                    <input
                      type="checkbox"
                      checked={Boolean(dateItem.isRecurring)}
                      onChange={(event) => {
                        const next = [...dates];
                        next[index] = { ...dateItem, isRecurring: event.target.checked };
                        updateContent("dates", next);
                      }}
                      className="h-4 w-4 rounded border-gold/35 text-rose-ink focus:ring-rose/30"
                    />
                    Repeats yearly (year ignored)
                  </label>
                ) : dateItem.isRecurring ? (
                  <CountdownTimer value={dateItem.date} now={now} />
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      {removedItem ? (
        <UndoToast
          message={removedItem.type === "milestone" ? "Milestone removed." : "Date removed."}
          actionLabel="Undo"
          onAction={restoreRemovedItem}
          onDismiss={() => setRemovedItem(null)}
        />
      ) : null}
      </div>
    </section>
  );
}
