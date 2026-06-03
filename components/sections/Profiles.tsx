"use client";

import { useState } from "react";

import { EditableImage } from "@/components/edit/EditableImage";
import { EditableDate } from "@/components/edit/EditableDate";
import { EditableTags } from "@/components/edit/EditableTags";
import { EditableText } from "@/components/edit/EditableText";
import { useContent } from "@/components/providers/ContentProvider";
import { useEdit } from "@/components/providers/EditProvider";
import type { Profile, Profiles as ProfilesType } from "@/lib/types";

type ProfileKey = keyof ProfilesType;

interface NewFavouriteState {
  key: string;
  value: string;
}

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
  const [isAddingGift, setIsAddingGift] = useState(false);
  const [newGift, setNewGift] = useState("");

  const updateGifts = (nextGifts: string[]) => {
    onProfileChange({
      ...profile,
      gifts: nextGifts.join("\n")
    });
  };

  return (
    <article className="rounded-2xl border border-gold/25 bg-warm-white p-4 shadow-sm sm:p-6">
      <p className="mb-4 text-xs uppercase tracking-[0.14em] text-text-light">{title}</p>

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-32 max-w-full overflow-hidden rounded-2xl border-4 border-gold/35 aspect-3/4 sm:w-40 md:w-44">
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

        <div>
          <p className="mb-2 text-sm font-medium text-text">Favourites</p>
          <div className="overflow-x-auto rounded-lg border border-gold/20">
            <table className="min-w-80 w-full table-fixed border-collapse text-sm">
              <tbody>
                {favouriteEntries.map(([key, value]) => (
                  <tr key={key} className="border-b border-gold/10 last:border-b-0">
                    <td className="w-2/5 wrap-break-word bg-cream/60 px-3 py-2 font-medium text-text">
                      {key}
                    </td>
                    <td className="w-2/5 wrap-break-word px-3 py-2">
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
                    {isEditing ? (
                      <td className="w-1/5 min-w-16 px-2 py-2 align-top text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onProfileChange({
                              ...profile,
                              favourites: removeFavourite(profile.favourites, key)
                            })
                          }
                          className="w-full whitespace-nowrap rounded border border-rose/30 px-2 py-1 text-[11px] text-rose transition hover:bg-rose/10 sm:text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isEditing ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                placeholder="Key"
                value={newFavouriteState.key}
                onChange={(event) =>
                  setNewFavouriteState({
                    ...newFavouriteState,
                    key: event.target.value
                  })
                }
                className="rounded-md border border-gold/30 bg-cream px-3 py-2 text-sm outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
              />
              <input
                type="text"
                placeholder="Value"
                value={newFavouriteState.value}
                onChange={(event) =>
                  setNewFavouriteState({
                    ...newFavouriteState,
                    value: event.target.value
                  })
                }
                className="rounded-md border border-gold/30 bg-cream px-3 py-2 text-sm outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
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
                className="rounded-md border border-rose/40 px-3 py-2 text-sm text-rose transition hover:bg-rose/10"
              >
                Add
              </button>
            </div>
          ) : null}
        </div>

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

        <div>
          <p className="mb-2 text-sm font-medium text-text">Gifts</p>
          {isEditing ? (
            <div className="space-y-2">
              {giftItems.length ? (
                <ul className="space-y-2">
                  {giftItems.map((gift, index) => (
                    <li key={`${gift}-${index}`} className="flex items-start gap-2">
                      <span className="pt-1 text-rose">•</span>
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
                        onClick={() => {
                          updateGifts(giftItems.filter((_, currentIndex) => currentIndex !== index));
                        }}
                        className="rounded border border-rose/30 px-2 py-1 text-[11px] text-rose transition hover:bg-rose/10 sm:text-xs"
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
                  className="w-full rounded-md border border-rose/60 bg-warm-white px-3 py-2 text-sm outline-none focus:border-rose focus:ring-2 focus:ring-rose/20"
                  placeholder="New gift"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingGift(true)}
                  className="rounded-full border border-dashed border-rose/60 px-3 py-1 text-sm text-rose transition hover:bg-rose/10"
                >
                  + Add gift
                </button>
              )}
            </div>
          ) : giftItems.length ? (
            <ul className="list-disc space-y-1 pl-5 text-text-muted">
              {giftItems.map((gift, index) => (
                <li key={`${gift}-${index}`}>{gift}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-light">No gifts added yet.</p>
          )}
        </div>
      </div>
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
    return (
      <section
        id="profiles"
        className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20"
      >
        <p className="text-text-muted">Loading...</p>
      </section>
    );
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
      className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 md:py-20"
    >
      <h2 className="mb-8 font-serif text-3xl text-rose sm:text-4xl md:text-5xl">Profiles</h2>
      <div className="grid gap-6 lg:grid-cols-2">
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
    </section>
  );
}
