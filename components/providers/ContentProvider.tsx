"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import type { ContentKey, SiteContent } from "@/lib/types";

type PendingUpdate = {
  timer: ReturnType<typeof setTimeout>;
  value: SiteContent[ContentKey];
};

export interface FlushAllResult {
  ok: boolean;
  failedKeys: ContentKey[];
}

interface ContentContextValue {
  content: SiteContent | null;
  isLoading: boolean;
  pendingKeys: ContentKey[];
  lastSavedAt: string | null;
  lastSavedKey: ContentKey | null;
  lastSaveError: string | null;
  updateContent: <K extends ContentKey>(key: K, value: SiteContent[K]) => void;
  flushAll: () => Promise<FlushAllResult>;
}

const ContentContext = createContext<ContentContextValue | undefined>(undefined);

const DEBOUNCE_MS = 300;
const CONTENT_SAVE_LABELS: Record<ContentKey, string> = {
  hero: "cover",
  milestones: "milestones",
  dates: "dates",
  gallery: "photos",
  story: "story",
  profiles: "profiles",
  letter: "letter",
  dreams: "dreams"
};

function saveErrorMessage(key: ContentKey) {
  return `Could not save the ${CONTENT_SAVE_LABELS[key]}. Try again.`;
}

export function ContentProvider({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingKeys, setPendingKeys] = useState<ContentKey[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastSavedKey, setLastSavedKey] = useState<ContentKey | null>(null);
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const pendingUpdatesRef = useRef<Map<ContentKey, PendingUpdate>>(new Map());
  const activeSaveCountsRef = useRef<Map<ContentKey, number>>(new Map());

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const syncPendingKeys = useCallback(() => {
    const nextPendingKeys = new Set<ContentKey>(pendingUpdatesRef.current.keys());

    for (const [key, activeSaveCount] of activeSaveCountsRef.current.entries()) {
      if (activeSaveCount > 0) {
        nextPendingKeys.add(key);
      }
    }

    setPendingKeys(Array.from(nextPendingKeys));
  }, []);

  const markSaveStarted = useCallback(
    (key: ContentKey) => {
      activeSaveCountsRef.current.set(key, (activeSaveCountsRef.current.get(key) ?? 0) + 1);
      syncPendingKeys();
    },
    [syncPendingKeys]
  );

  const markSaveFinished = useCallback(
    (key: ContentKey) => {
      const currentCount = activeSaveCountsRef.current.get(key) ?? 0;

      if (currentCount <= 1) {
        activeSaveCountsRef.current.delete(key);
      } else {
        activeSaveCountsRef.current.set(key, currentCount - 1);
      }

      syncPendingKeys();
    },
    [syncPendingKeys]
  );

  const persistContent = useCallback(async <K extends ContentKey>(key: K, value: SiteContent[K]) => {
    const response = await fetch(`/api/content/${key}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ value })
    });

    if (!response.ok) {
      throw new Error(`Failed to persist content key "${key}"`);
    }
  }, []);

  const loadContent = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/content", {
        cache: "no-store",
        signal
      });

      if (!response.ok) {
        throw new Error("Failed to fetch site content");
      }

      const initialContent = (await response.json()) as SiteContent;
      setContent(initialContent);
    } catch (error) {
      if (!signal?.aborted) {
        console.error(error);
        setLoadError("Could not load your story. Check the connection and try again.");
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    void loadContent(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [loadContent]);

  useEffect(() => {
    const pendingUpdates = pendingUpdatesRef.current;

    return () => {
      for (const pending of pendingUpdates.values()) {
        clearTimeout(pending.timer);
      }
      pendingUpdates.clear();
    };
  }, []);

  const updateContent = useCallback(
    <K extends ContentKey>(key: K, value: SiteContent[K]) => {
      setContent((prevContent) => {
        if (!prevContent) {
          return prevContent;
        }

        return {
          ...prevContent,
          [key]: value
        };
      });

      const currentPending = pendingUpdatesRef.current.get(key);
      if (currentPending) {
        clearTimeout(currentPending.timer);
      }

      setLastSaveError(null);

      const timer = setTimeout(() => {
        const latestPending = pendingUpdatesRef.current.get(key);
        if (!latestPending) {
          return;
        }

        pendingUpdatesRef.current.delete(key);
        markSaveStarted(key);

        void persistContent(key, latestPending.value as SiteContent[K])
          .then(() => {
            setLastSavedAt(new Date().toISOString());
            setLastSavedKey(key);
            setLastSaveError(null);
          })
          .catch((err: unknown) => {
            const message = saveErrorMessage(key);
            console.error(err);
            setLastSaveError(message);
            showError(message);
          })
          .finally(() => {
            markSaveFinished(key);
          });
      }, DEBOUNCE_MS);

      pendingUpdatesRef.current.set(key, {
        timer,
        value
      });
      syncPendingKeys();
    },
    [markSaveFinished, markSaveStarted, persistContent, showError, syncPendingKeys]
  );

  const flushAll = useCallback(async (): Promise<FlushAllResult> => {
    const pendingEntries = Array.from(pendingUpdatesRef.current.entries());

    if (!pendingEntries.length) {
      return {
        ok: true,
        failedKeys: []
      };
    }

    for (const [, pending] of pendingEntries) {
      clearTimeout(pending.timer);
    }

    pendingUpdatesRef.current.clear();
    syncPendingKeys();

    const failedKeys = (
      await Promise.all(
        pendingEntries.map(async ([key, pending]) => {
          markSaveStarted(key);
          try {
            await persistContent(key, pending.value);
            setLastSaveError(null);
            return null;
          } catch (err) {
            const message = saveErrorMessage(key);
            console.error(err);
            setLastSaveError(message);
            showError(message);
            return key;
          } finally {
            markSaveFinished(key);
          }
        })
      )
    ).filter((failedKey): failedKey is ContentKey => failedKey !== null);

    if (!failedKeys.length) {
      setLastSavedAt(new Date().toISOString());
      setLastSavedKey(pendingEntries.length === 1 ? pendingEntries[0][0] : null);
      setLastSaveError(null);
    }

    return {
      ok: failedKeys.length === 0,
      failedKeys
    };
  }, [markSaveFinished, markSaveStarted, persistContent, showError, syncPendingKeys]);

  const contextValue = useMemo<ContentContextValue>(
    () => ({
      content,
      isLoading,
      pendingKeys,
      lastSavedAt,
      lastSavedKey,
      lastSaveError,
      updateContent,
      flushAll
    }),
    [
      content,
      isLoading,
      pendingKeys,
      lastSavedAt,
      lastSavedKey,
      lastSaveError,
      updateContent,
      flushAll
    ]
  );

  const loadFailure = !isLoading && !content && loadError;

  return (
    <ContentContext.Provider value={contextValue}>
      {loadFailure ? (
        <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-text">
          <section
            className="max-w-md border border-gold/35 bg-warm-white p-6 text-center shadow-sm"
            role="alert"
            aria-live="assertive"
          >
            <h1 className="font-serif text-3xl text-rose-ink">Could not load this story</h1>
            <p className="mt-3 text-sm text-text-muted">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                void loadContent();
              }}
              className="mt-5 min-h-11 rounded-full border border-rose/40 px-5 py-2 text-sm font-medium text-rose-ink transition hover:bg-rose/10"
            >
              Try again
            </button>
          </section>
        </main>
      ) : (
        children
      )}
      {error && (
        <div
          className="fixed bottom-4 left-4 z-50 rounded-md bg-rose-ink px-4 py-2 text-sm text-warm-white shadow-lg"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          {error}
        </div>
      )}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const context = useContext(ContentContext);

  if (!context) {
    throw new Error("useContent must be used within a ContentProvider");
  }

  return context;
}
