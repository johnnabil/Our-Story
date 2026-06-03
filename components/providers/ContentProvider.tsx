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
  updateContent: <K extends ContentKey>(key: K, value: SiteContent[K]) => void;
  flushAll: () => Promise<FlushAllResult>;
}

const ContentContext = createContext<ContentContextValue | undefined>(undefined);

const DEBOUNCE_MS = 300;

export function ContentProvider({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingUpdatesRef = useRef<Map<ContentKey, PendingUpdate>>(new Map());

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

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

  useEffect(() => {
    const abortController = new AbortController();

    const loadContent = async () => {
      try {
        const response = await fetch("/api/content", {
          cache: "no-store",
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error("Failed to fetch site content");
        }

        const initialContent = (await response.json()) as SiteContent;
        setContent(initialContent);
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error(error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadContent();

    return () => {
      abortController.abort();
    };
  }, []);

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

      const timer = setTimeout(() => {
        const latestPending = pendingUpdatesRef.current.get(key);
        if (!latestPending) {
          return;
        }

        pendingUpdatesRef.current.delete(key);
        void persistContent(key, latestPending.value as SiteContent[K]).catch((err: unknown) => {
          console.error(err);
          showError(`Failed to save changes to ${key}.`);
        });
      }, DEBOUNCE_MS);

      pendingUpdatesRef.current.set(key, {
        timer,
        value
      });
    },
    [persistContent, showError]
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

    const failedKeys = (
      await Promise.all(
        pendingEntries.map(async ([key, pending]) => {
          try {
            await persistContent(key, pending.value);
            return null;
          } catch (err) {
            console.error(err);
            showError(`Failed to save changes to ${key}.`);
            return key;
          }
        })
      )
    ).filter((failedKey): failedKey is ContentKey => failedKey !== null);

    return {
      ok: failedKeys.length === 0,
      failedKeys
    };
  }, [persistContent, showError]);

  const contextValue = useMemo<ContentContextValue>(
    () => ({
      content,
      isLoading,
      updateContent,
      flushAll
    }),
    [content, isLoading, updateContent, flushAll]
  );

  return (
    <ContentContext.Provider value={contextValue}>
      {children}
      {error && (
        <div className="fixed bottom-4 left-4 z-50 rounded-md bg-rose px-4 py-2 text-sm text-warm-white shadow-lg">
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
