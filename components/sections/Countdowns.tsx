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

type BirthdayEvent = {
  id: string;
  personName: string;
  icon: string;
  name: string;
  date: string;
};

type CalendarEvent =
  | {
      type: "milestone";
      item: Milestone;
      index: number;
      name: string;
      label: string;
      date: string;
      icon: string;
    }
  | { type: "birthday"; item: BirthdayEvent; name: string; label: string; date: string; icon: string }
  | {
      type: "date";
      item: ImportantDate;
      index: number;
      name: string;
      label: string;
      date: string;
      icon: string;
    };

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

function getEventTime(value: string, now: Date) {
  return getNextOccurrence(value, now)?.getTime() ?? Number.POSITIVE_INFINITY;
}

function getDaysUntilLabel(value: string, now: Date) {
  const countdown = getCountdown(value, now);
  if (!countdown) {
    return "Invalid date";
  }

  if (countdown.days === 0) {
    return "today";
  }

  return `in ${countdown.days} ${countdown.days === 1 ? "day" : "days"}`;
}

function displayDateIcon(value: string) {
  return /[★☆♥♡❤✨*]/u.test(value) ? "date" : value;
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
  const calendarEvents: CalendarEvent[] = [
    ...milestones.map((milestone, index) => ({
      type: "milestone" as const,
      item: milestone,
      index,
      name: milestone.name,
      label: milestone.label,
      date: milestone.date,
      icon: displayDateIcon(milestone.icon)
    })),
    ...birthdays.map((birthday) => {
      const turningAge = getTurningAge(birthday.date, now);
      return {
        type: "birthday" as const,
        item: birthday,
        name:
          turningAge === null
            ? birthday.name
            : `${birthday.personName}'s ${formatOrdinal(turningAge)} Birthday`,
        label: "Birthday",
        date: birthday.date,
        icon: birthday.icon
      };
    }),
    ...dates.map((dateItem, index) => ({
      type: "date" as const,
      item: dateItem,
      index,
      name: dateItem.name,
      label: "Important date",
      date: dateItem.date,
      icon: displayDateIcon(dateItem.icon)
    }))
  ].sort((left, right) => getEventTime(left.date, now) - getEventTime(right.date, now));
  const featuredEvent = calendarEvents[0] ?? null;
  const upcomingEvents = calendarEvents.slice(1, 5);

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
        icon: newDateIcon.trim() || "date",
        isRecurring: newDateIsRecurring
      }
    ]);

    resetNewDate();
  };

  return (
    <section
      id="countdowns"
      className="px-4 py-14 sm:px-6 md:py-16"
    >
      <div className="mx-auto w-full max-w-6xl">
      <div className="scroll-reveal mb-6 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div>
        <p className="mb-4 w-fit border border-gold/25 bg-gold-light/45 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-rose-ink">
          calendar slips
        </p>
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
                  icon: "date"
                }
              ])
            }
            className="min-h-11 rounded-full border border-rose/40 bg-warm-white px-4 py-2 text-sm text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
          >
            Add milestone
          </button>
        ) : null}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        {featuredEvent ? (
          <article className="scroll-reveal note-shadow calendar-slip relative border border-gold/25 p-5 sm:p-6">
            {!isEditing ? (
              <span
                aria-hidden="true"
                className="scrapbook-tape absolute -top-3 left-8 h-6 w-28 rotate-[-2deg]"
              />
            ) : null}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {featuredEvent.type === "milestone" ? (
                  <EditableText
                    value={isEditing ? featuredEvent.item.icon : featuredEvent.icon}
                    className="text-xs font-bold uppercase tracking-[0.14em] text-rose-ink"
                    onChange={(icon) => {
                      const next = [...milestones];
                      next[featuredEvent.index] = { ...featuredEvent.item, icon };
                      updateContent("milestones", next);
                    }}
                  />
                ) : featuredEvent.type === "date" ? (
                  <EditableText
                    value={isEditing ? featuredEvent.item.icon : featuredEvent.icon}
                    className="text-xs font-bold uppercase tracking-[0.14em] text-rose-ink"
                    onChange={(icon) => {
                      const next = [...dates];
                      next[featuredEvent.index] = { ...featuredEvent.item, icon };
                      updateContent("dates", next);
                    }}
                  />
                ) : (
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-ink">
                    {featuredEvent.icon}
                  </p>
                )}
                {featuredEvent.type === "milestone" ? (
                  <EditableText
                    value={featuredEvent.item.label}
                    className="mt-2 text-sm font-medium text-text-light"
                    onChange={(label) => {
                      const next = [...milestones];
                      next[featuredEvent.index] = { ...featuredEvent.item, label };
                      updateContent("milestones", next);
                    }}
                  />
                ) : (
                  <p className="mt-2 text-sm font-medium text-text-light">{featuredEvent.label}</p>
                )}
              </div>
              {isEditing && featuredEvent.type !== "birthday" ? (
                <button
                  type="button"
                  onClick={() =>
                    featuredEvent.type === "milestone"
                      ? removeMilestone(featuredEvent.item, featuredEvent.index)
                      : removeDate(featuredEvent.item, featuredEvent.index)
                  }
                  className="min-h-11 shrink-0 rounded-full border border-rose/30 px-3 py-2 text-xs text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
                >
                  Remove
                </button>
              ) : null}
            </div>

            {featuredEvent.type === "milestone" ? (
              <EditableText
                value={featuredEvent.item.name}
                as="h3"
                className="font-serif text-3xl leading-tight text-text sm:text-4xl"
                onChange={(name) => {
                  const next = [...milestones];
                  next[featuredEvent.index] = { ...featuredEvent.item, name };
                  updateContent("milestones", next);
                }}
              />
            ) : featuredEvent.type === "date" ? (
              <EditableText
                value={featuredEvent.item.name}
                as="h3"
                className="font-serif text-3xl leading-tight text-text sm:text-4xl"
                onChange={(name) => {
                  const next = [...dates];
                  next[featuredEvent.index] = { ...featuredEvent.item, name };
                  updateContent("dates", next);
                }}
              />
            ) : (
              <h3 className="font-serif text-3xl leading-tight text-text sm:text-4xl">
                {featuredEvent.name}
              </h3>
            )}

            <div className="mt-3 text-sm text-text-muted">
              {featuredEvent.type === "milestone" ? (
                <EditableDate
                  value={featuredEvent.item.date}
                  ariaLabel={`Date for ${featuredEvent.item.name || "milestone"}`}
                  onChange={(date) => {
                    const next = [...milestones];
                    next[featuredEvent.index] = { ...featuredEvent.item, date };
                    updateContent("milestones", next);
                  }}
                />
              ) : featuredEvent.type === "date" ? (
                <EditableDate
                  value={featuredEvent.item.date}
                  ariaLabel={`Date for ${featuredEvent.item.name || "important date"}`}
                  onChange={(date) => {
                    const next = [...dates];
                    next[featuredEvent.index] = { ...featuredEvent.item, date };
                    updateContent("dates", next);
                  }}
                />
              ) : (
                <p>{formatDate(featuredEvent.date, true)}</p>
              )}
            </div>

            {isEditing && featuredEvent.type === "date" ? (
              <label className="mt-3 inline-flex items-center gap-2 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={Boolean(featuredEvent.item.isRecurring)}
                  onChange={(event) => {
                    const next = [...dates];
                    next[featuredEvent.index] = {
                      ...featuredEvent.item,
                      isRecurring: event.target.checked
                    };
                    updateContent("dates", next);
                  }}
                  className="h-4 w-4 rounded border-gold/35 text-rose-ink focus:ring-rose/30"
                />
                Repeats yearly
              </label>
            ) : null}

            <CountdownTimer value={featuredEvent.date} now={now} />
            <p className="mt-3 text-sm text-text-muted">
              {featuredEvent.type === "milestone"
                ? getTogetherDurationLabel(featuredEvent.date) ?? "Invalid date"
                : getDaysUntilLabel(featuredEvent.date, now)}
            </p>
            {isEditing && featuredEvent.type === "birthday" ? (
              <p className="mt-3 text-sm text-text-muted">Edit birthdays in Profiles section.</p>
            ) : null}
          </article>
        ) : null}

        <div className="scroll-reveal calendar-slip border border-gold/20 p-4">
          <h3 className="font-serif text-2xl text-rose-deep">Upcoming</h3>
          <div className="mt-3 divide-y divide-gold/15">
            {upcomingEvents.length ? (
              upcomingEvents.map((event) => (
                <div key={`${event.type}-${event.name}-${event.date}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {isEditing && event.type === "milestone" ? (
                        <EditableText
                          value={event.item.name}
                          className="font-medium text-text"
                          onChange={(name) => {
                            const next = [...milestones];
                            next[event.index] = { ...event.item, name };
                            updateContent("milestones", next);
                          }}
                        />
                      ) : isEditing && event.type === "date" ? (
                        <EditableText
                          value={event.item.name}
                          className="font-medium text-text"
                          onChange={(name) => {
                            const next = [...dates];
                            next[event.index] = { ...event.item, name };
                            updateContent("dates", next);
                          }}
                        />
                      ) : (
                        <p className="truncate font-medium text-text">{event.name}</p>
                      )}
                      <p className="mt-1 text-sm text-text-muted">
                        {formatDate(
                          event.date,
                          event.type === "birthday" ||
                            (event.type === "date" && Boolean(event.item.isRecurring))
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-semibold text-rose-ink">
                      {getDaysUntilLabel(event.date, now)}
                    </p>
                  </div>
                  {isEditing && event.type !== "birthday" ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {event.type === "milestone" ? (
                        <EditableDate
                          value={event.item.date}
                          ariaLabel={`Date for ${event.item.name || "milestone"}`}
                          onChange={(date) => {
                            const next = [...milestones];
                            next[event.index] = { ...event.item, date };
                            updateContent("milestones", next);
                          }}
                        />
                      ) : (
                        <EditableDate
                          value={event.item.date}
                          ariaLabel={`Date for ${event.item.name || "important date"}`}
                          onChange={(date) => {
                            const next = [...dates];
                            next[event.index] = { ...event.item, date };
                            updateContent("dates", next);
                          }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          event.type === "milestone"
                            ? removeMilestone(event.item, event.index)
                            : removeDate(event.item, event.index)
                        }
                        className="min-h-11 rounded-full border border-rose/30 px-3 py-2 text-xs text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="py-3 text-sm text-text-muted">Add a date to start the calendar.</p>
            )}
          </div>
        </div>
      </div>

      {birthdays.length ? (
        <div className="mt-9">
          <div className="scroll-reveal mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <h3 className="font-serif text-2xl text-rose-deep sm:text-3xl">Birthdays</h3>
            {isEditing ? (
              <p className="text-sm text-text-muted">Edit birthdays in Profiles section.</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {birthdays.map((birthday) => {
              const turningAge = getTurningAge(birthday.date, now);
              const birthdayTitle =
                turningAge === null
                  ? birthday.name
                  : `${birthday.personName}'s ${formatOrdinal(turningAge)} Birthday`;

              return (
                <article
                  key={birthday.id}
                  className="scroll-reveal calendar-slip relative border border-gold/20 p-3 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-rose-ink">{birthday.icon}</span>
                    <p className="font-medium text-text">{birthdayTitle}</p>
                  </div>
                  <p className="text-sm text-text-muted">{formatDate(birthday.date, true)}</p>
                  {turningAge === null ? <p className="mt-1 text-sm text-text-muted">Invalid birthday</p> : null}
                  <p className="mt-2 text-sm font-semibold text-rose-ink">
                    {getDaysUntilLabel(birthday.date, now)}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-9">
        <div className="scroll-reveal mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
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
                  placeholder="date"
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

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {dates.map((dateItem, index) => {
            return (
              <article
                key={`${dateItem.name}-${index}`}
                className="scroll-reveal calendar-slip relative border border-gold/20 p-3 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <EditableText
                    value={isEditing ? dateItem.icon : displayDateIcon(dateItem.icon)}
                    className="text-xs font-bold uppercase tracking-[0.14em] text-rose-ink"
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
                ) : (
                  <p className="mt-2 text-sm font-semibold text-rose-ink">
                    {getDaysUntilLabel(dateItem.date, now)}
                  </p>
                )}
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
