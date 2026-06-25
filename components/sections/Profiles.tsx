"use client";

import { useState } from "react";

import { EditableImage } from "@/components/edit/EditableImage";
import { EditableDate } from "@/components/edit/EditableDate";
import { EditableTags } from "@/components/edit/EditableTags";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import { MemoryLoading } from "@/components/ui/MemoryLoading";
import { UndoToast } from "@/components/ui/UndoToast";
import type { Profile, Profiles as ProfilesType } from "@/lib/types";

type ProfileKey = keyof ProfilesType;

interface NewFavouriteState {
  key: string;
  value: string;
}

type RemovedProfileItem =
  | {
      type: "favourite";
      key: string;
      value: string;
    }
  | {
      type: "gift";
      value: string;
      index: number;
    };

function getFoodFavouriteKey(favourites: Record<string, string>) {
  return Object.keys(favourites).find((key) => key.trim().toLowerCase() === "food");
}

function parseFoodItems(foodValue: string | undefined) {
  const value = foodValue?.trim();
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n|,|\||\s*-\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function updateFoodFavourites(
  favourites: Record<string, string>,
  existingFoodKey: string | undefined,
  foodItems: string[]
) {
  const key = existingFoodKey ?? "Food";
  const next = { ...favourites };

  if (!foodItems.length) {
    delete next[key];
    return next;
  }

  next[key] = foodItems.join(", ");
  return next;
}

function updateFavouriteValue(favourites: Record<string, string>, key: string, value: string) {
  return {
    ...favourites,
    [key]: value
  };
}

function removeFavourite(favourites: Record<string, string>, key: string) {
  const next = { ...favourites };
  delete next[key];
  return next;
}

function parseGiftItems(giftsValue: string) {
  return giftsValue
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function visibleGiftSummary(gifts: string[]) {
  return {
    visible: gifts.slice(0, 6),
    remainingCount: Math.max(0, gifts.length - 6)
  };
}

function ProfileCard({
  title,
  profile,
  isEditing,
  onProfileChange,
  newFavouriteState,
  setNewFavouriteState
}: {
  title: string;
  profile: Profile;
  isEditing: boolean;
  onProfileChange: (next: Profile) => void;
  newFavouriteState: NewFavouriteState;
  setNewFavouriteState: (next: NewFavouriteState) => void;
}) {
  const foodFavouriteKey = getFoodFavouriteKey(profile.favourites);
  const foodItems = parseFoodItems(foodFavouriteKey ? profile.favourites[foodFavouriteKey] : undefined);
  const favouriteEntries = Object.entries(profile.favourites).filter(
    ([key]) => key.trim().toLowerCase() !== "food"
  );
  const giftItems = parseGiftItems(profile.gifts);
  const giftSummary = visibleGiftSummary(giftItems);
  const [isAddingGift, setIsAddingGift] = useState(false);
  const [showAllGifts, setShowAllGifts] = useState(false);
  const [newGift, setNewGift] = useState("");
  const [removedProfileItem, setRemovedProfileItem] = useState<RemovedProfileItem | null>(null);

  const updateGifts = (nextGifts: string[]) => {
    onProfileChange({
      ...profile,
      gifts: nextGifts.join("\n")
    });
  };

  const removeFavouriteWithUndo = (key: string, value: string) => {
    setRemovedProfileItem({ type: "favourite", key, value });
    onProfileChange({
      ...profile,
      favourites: removeFavourite(profile.favourites, key)
    });
  };

  const removeGiftWithUndo = (gift: string, index: number) => {
    setRemovedProfileItem({ type: "gift", value: gift, index });
    updateGifts(giftItems.filter((_, currentIndex) => currentIndex !== index));
  };

  const restoreRemovedProfileItem = () => {
    if (!removedProfileItem) {
      return;
    }

    if (removedProfileItem.type === "favourite") {
      onProfileChange({
        ...profile,
        favourites: {
          ...profile.favourites,
          [removedProfileItem.key]: removedProfileItem.value
        }
      });
    } else {
      const next = [...giftItems];
      next.splice(Math.min(removedProfileItem.index, next.length), 0, removedProfileItem.value);
      updateGifts(next);
    }

    setRemovedProfileItem(null);
  };

  return (
    <article className="scroll-reveal notebook-paper relative p-4 sm:p-6">
      <span
        aria-hidden="true"
        className="scrapbook-tape absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-[-1deg]"
      />
      <p className="mb-4 text-sm font-medium text-text-light">{title}</p>

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="scrapbook-polaroid w-32 max-w-full overflow-hidden border border-gold/35 p-2 pb-5 aspect-3/4 sm:w-40 md:w-44">
          <EditableImage
            src={profile.photoUrl}
            alt={profile.name}
            width={320}
            height={426}
            fit="contain"
            sizes="(max-width: 640px) 128px, (max-width: 768px) 160px, 176px"
            className="h-full w-full"
            currentPublicId={profile.photoPublicId}
            onChange={(photoUrl, photoPublicId) =>
              onProfileChange({
                ...profile,
                photoUrl,
                photoPublicId
              })
            }
          />
        </div>

        <EditableText
          value={profile.name}
          as="h3"
          className="font-serif text-2xl text-text sm:text-3xl"
          onChange={(name) =>
            onProfileChange({
              ...profile,
              name
            })
          }
        />
        <EditableText
          value={profile.role}
          className="text-text-muted"
          onChange={(role) =>
            onProfileChange({
              ...profile,
              role
            })
          }
        />

        <div className="w-full max-w-xs text-center">
          <p className="mb-1 text-sm font-medium text-text">Birthday</p>
          {profile.birthday || isEditing ? (
            <EditableDate
              value={profile.birthday ?? ""}
              ariaLabel={`${profile.name || title} birthday`}
              onChange={(birthday) =>
                onProfileChange({
                  ...profile,
                  birthday
                })
              }
              className="text-text-muted"
            />
          ) : (
            <p className="text-sm text-text-muted">Not set</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-text">Personality</p>
          <EditableTags
            tags={profile.personality}
            onChange={(personality) =>
              onProfileChange({
                ...profile,
                personality
              })
            }
          />
        </div>

        {isEditing ? (
          <div>
            <p className="mb-2 text-sm font-medium text-text">Favourites</p>
            <div className="overflow-hidden rounded-lg border border-gold/20">
              <table className="w-full table-fixed border-collapse text-sm">
                <tbody>
                  {favouriteEntries.map(([key, value]) => (
                    <tr key={key} className="border-b border-gold/10 last:border-b-0">
                      <td className="w-[34%] wrap-break-word bg-cream/60 px-2 py-2 font-medium text-text sm:w-2/5 sm:px-3">
                        {key}
                      </td>
                      <td className="w-[46%] wrap-break-word px-2 py-2 sm:w-2/5 sm:px-3">
                        <EditableText
                          value={value}
                          className="text-text-muted"
                          onChange={(nextValue) =>
                            onProfileChange({
                              ...profile,
                              favourites: updateFavouriteValue(profile.favourites, key, nextValue)
                            })
                          }
                        />
                      </td>
                      <td className="w-[20%] px-1 py-2 align-top text-right sm:w-1/5 sm:px-2">
                        <button
                          type="button"
                          aria-label={`Remove ${key}`}
                          onClick={() => removeFavouriteWithUndo(key, value)}
                          className="min-h-11 w-full rounded-full border border-rose/30 px-2 py-2 text-[11px] text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98] sm:px-3 sm:text-xs"
                        >
                          <span aria-hidden className="sm:hidden">
                            x
                          </span>
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                aria-label={`${title} favourite label`}
                placeholder="Key"
                value={newFavouriteState.key}
                onChange={(event) =>
                  setNewFavouriteState({
                    ...newFavouriteState,
                    key: event.target.value
                  })
                }
                className="min-h-11 rounded-md border border-gold/30 bg-cream px-3 py-2 text-sm outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
              />
              <input
                type="text"
                aria-label={`${title} favourite value`}
                placeholder="Value"
                value={newFavouriteState.value}
                onChange={(event) =>
                  setNewFavouriteState({
                    ...newFavouriteState,
                    value: event.target.value
                  })
                }
                className="min-h-11 rounded-md border border-gold/30 bg-cream px-3 py-2 text-sm outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
              />
              <button
                type="button"
                onClick={() => {
                  const key = newFavouriteState.key.trim();
                  if (!key) {
                    return;
                  }

                  onProfileChange({
                    ...profile,
                    favourites: {
                      ...profile.favourites,
                      [key]: newFavouriteState.value.trim() || "-"
                    }
                  });
                  setNewFavouriteState({ key: "", value: "" });
                }}
                className="min-h-11 rounded-full border border-rose/40 px-4 py-2 text-sm text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
              >
                Add
              </button>
            </div>
          </div>
        ) : favouriteEntries.length ? (
          <div>
            <p className="mb-2 text-sm font-medium text-text">Favourites</p>
            <dl className="grid gap-2 sm:grid-cols-2">
              {favouriteEntries.map(([key, value]) => (
                <div key={key} className="border border-gold/20 bg-cream/45 px-3 py-2">
                  <dt className="text-[11px] font-medium text-text-light">{key}</dt>
                  <dd className="mt-1 text-sm leading-snug text-text-muted">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium text-text">Hobbies</p>
          <EditableTags
            tags={profile.hobbies}
            onChange={(hobbies) =>
              onProfileChange({
                ...profile,
                hobbies
              })
            }
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-text">Food</p>
          <EditableTags
            tags={foodItems}
            onChange={(nextFoodItems) =>
              onProfileChange({
                ...profile,
                favourites: updateFoodFavourites(profile.favourites, foodFavouriteKey, nextFoodItems)
              })
            }
          />
        </div>

        {isEditing ? (
          <div>
            <p className="mb-2 text-sm font-medium text-text">Gifts</p>
            <div className="space-y-2">
              {giftItems.length ? (
                <ul className="space-y-2">
                  {giftItems.map((gift, index) => (
                    <li key={`${gift}-${index}`} className="flex items-start gap-2">
                      <span className="pt-1 text-rose-ink">•</span>
                      <div className="min-w-0 flex-1">
                        <EditableText
                          value={gift}
                          placeholder="Gift"
                          className="text-text-muted"
                          onChange={(nextGift) => {
                            const trimmed = nextGift.trim();
                            const next = [...giftItems];
                            if (!trimmed) {
                              next.splice(index, 1);
                            } else {
                              next[index] = trimmed;
                            }
                            updateGifts(next);
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeGiftWithUndo(gift, index)}
                        className="min-h-11 rounded-full border border-rose/30 px-3 py-2 text-[11px] text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98] sm:text-xs"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-light">No gifts added yet.</p>
              )}

              {isAddingGift ? (
                <input
                  autoFocus
                  aria-label={`New gift for ${title}`}
                  value={newGift}
                  onChange={(event) => setNewGift(event.target.value)}
                  onBlur={() => {
                    const trimmed = newGift.trim();
                    if (trimmed) {
                      updateGifts([...giftItems, trimmed]);
                    }
                    setNewGift("");
                    setIsAddingGift(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const trimmed = newGift.trim();
                      if (trimmed) {
                        updateGifts([...giftItems, trimmed]);
                      }
                      setNewGift("");
                      setIsAddingGift(false);
                    }

                    if (event.key === "Escape") {
                      setNewGift("");
                      setIsAddingGift(false);
                    }
                  }}
                  className="min-h-11 w-full rounded-md border border-rose/60 bg-warm-white px-3 py-2 text-sm outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
                  placeholder="New gift"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingGift(true)}
                  className="min-h-11 rounded-full border border-dashed border-rose/60 px-4 py-2 text-sm text-rose-ink transition hover:bg-rose-light/30 active:scale-[0.98]"
                >
                  + Add gift
                </button>
              )}
            </div>
          </div>
        ) : giftSummary.visible.length ? (
          <div>
            <p className="mb-2 text-sm font-medium text-text">Gift notes</p>
            <div className="flex flex-wrap gap-2">
              {(showAllGifts ? giftItems : giftSummary.visible).map((gift) => (
                <span
                  key={gift}
                  className="rounded-full border border-gold/25 bg-gold-light/25 px-3 py-1 text-xs text-text-muted"
                >
                  {gift}
                </span>
              ))}
              {giftSummary.remainingCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllGifts((current) => !current)}
                  className="rounded-full border border-rose/25 bg-rose-light/25 px-3 py-1 text-xs text-rose-ink transition hover:bg-rose-light/45 active:scale-[0.98]"
                >
                  {showAllGifts ? "Show fewer" : `+${giftSummary.remainingCount} more`}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {removedProfileItem ? (
        <UndoToast
          message={
            removedProfileItem.type === "favourite" ? "Favourite removed." : "Gift removed."
          }
          actionLabel="Undo"
          onAction={restoreRemovedProfileItem}
          onDismiss={() => setRemovedProfileItem(null)}
        />
      ) : null}
    </article>
  );
}

export function Profiles() {
  const { content, isLoading, updateContent } = useContent();
  const { isEditing } = useEdit();

  const [newFavouriteHer, setNewFavouriteHer] = useState<NewFavouriteState>({
    key: "",
    value: ""
  });
  const [newFavouriteHim, setNewFavouriteHim] = useState<NewFavouriteState>({
    key: "",
    value: ""
  });

  if (isLoading || !content) {
    return <MemoryLoading id="profiles" />;
  }

  const profiles = content.profiles;

  const updateProfile = (key: ProfileKey, nextProfile: Profile) => {
    updateContent("profiles", {
      ...profiles,
      [key]: nextProfile
    });
  };

  return (
    <section
      id="profiles"
      className="px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
      <div className="scroll-reveal mb-8 max-w-2xl">
        <p className="mb-4 w-fit border border-gold/25 bg-gold-light/45 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-rose-ink">
          open notebook
        </p>
        <h2 className="font-serif text-4xl leading-tight text-rose-ink sm:text-5xl md:text-6xl">Us</h2>
      </div>
      <div className="notebook-cover paper-shadow relative overflow-hidden border border-gold/25 lg:grid lg:grid-cols-2">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-10 -translate-x-1/2 bg-[radial-gradient(circle_at_50%_14px,oklch(25%_0.047_280_/_0.28)_0_3px,transparent_4px),linear-gradient(90deg,transparent,oklch(25%_0.047_280_/_0.14),transparent)] bg-[length:100%_28px,100%_100%] lg:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-archive-ink/16 lg:block"
        />
        <ProfileCard
          title="Her"
          profile={profiles.her}
          isEditing={isEditing}
          onProfileChange={(next) => updateProfile("her", next)}
          newFavouriteState={newFavouriteHer}
          setNewFavouriteState={setNewFavouriteHer}
        />
        <ProfileCard
          title="Him"
          profile={profiles.him}
          isEditing={isEditing}
          onProfileChange={(next) => updateProfile("him", next)}
          newFavouriteState={newFavouriteHim}
          setNewFavouriteState={setNewFavouriteHim}
        />
      </div>
      </div>
    </section>
  );
}
