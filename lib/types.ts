export const GALLERY_CATEGORIES = [
  "romantic",
  "fun",
  "travel",
  "walks",
  "car",
  "holidays",
  "events",
  "everyday"
] as const;

export const DREAM_CATEGORIES = ["travel", "experience", "milestone", "everyday"] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];
export type DreamCategory = (typeof DREAM_CATEGORIES)[number];

export interface Hero {
  names: {
    her: string;
    him: string;
  };
  quote: string;
  subtitle: string;
  photoUrl: string;
  photoPublicId: string;
}

export interface Milestone {
  label: string;
  name: string;
  date: string;
  icon: string;
}

export interface ImportantDate {
  name: string;
  date: string;
  icon: string;
  isRecurring?: boolean;
}

export interface GalleryPhoto {
  url: string;
  caption: string;
  category: GalleryCategory;
  publicId: string;
}

export interface StoryEntry {
  id: string;
  date: string;
  title: string;
  body: string;
}

export interface Profile {
  name: string;
  role: string;
  birthday?: string;
  photoUrl: string;
  photoPublicId: string;
  personality: string[];
  favourites: Record<string, string>;
  hobbies: string[];
  gifts: string;
  note: string;
}

export interface Profiles {
  her: Profile;
  him: Profile;
}

export interface Letter {
  salutation: string;
  body: string;
  signature: string;
}

export interface Dream {
  id: string;
  icon: string;
  title: string;
  desc: string;
  category: DreamCategory;
  done: boolean;
}

export interface SiteContent {
  hero: Hero;
  milestones: Milestone[];
  dates: ImportantDate[];
  gallery: GalleryPhoto[];
  story: StoryEntry[];
  profiles: Profiles;
  letter: Letter;
  dreams: Dream[];
}

export const CONTENT_KEYS = [
  "hero",
  "milestones",
  "dates",
  "gallery",
  "story",
  "profiles",
  "letter",
  "dreams"
] as const;

export type ContentKey = (typeof CONTENT_KEYS)[number];

export function isContentKey(value: string): value is ContentKey {
  return CONTENT_KEYS.includes(value as ContentKey);
}
