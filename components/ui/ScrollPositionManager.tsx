"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY_PREFIX = "our-story:scroll:";

function getStorageKey(pathname: string) {
  return `${STORAGE_KEY_PREFIX}${pathname}`;
}

function parseSavedScroll(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function ScrollPositionManager() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const revealIfVisible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.88 && rect.bottom > 0) {
        element.classList.add("is-visible");
        element.dataset.revealed = "true";
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            if (entry.target instanceof HTMLElement) {
              entry.target.dataset.revealed = "true";
            }
          }
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12
      }
    );

    const observeRevealElements = () => {
      document.querySelectorAll<HTMLElement>(".scroll-reveal, .story-ink-line").forEach((element) => {
        revealIfVisible(element);
        observer.observe(element);
      });
    };

    observeRevealElements();

    const mutationObserver = new MutationObserver(observeRevealElements);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const key = getStorageKey(pathname);
    const savedTop = parseSavedScroll(window.sessionStorage.getItem(key));

    if (savedTop === null) {
      return;
    }

    const rootElement = document.documentElement;
    const previousScrollBehavior = rootElement.style.scrollBehavior;
    rootElement.style.scrollBehavior = "auto";

    let canceled = false;
    let timeoutId: number | null = null;
    let rafId: number | null = null;
    let attempt = 0;

    const restore = () => {
      if (canceled) {
        return;
      }

      attempt += 1;

      const maxScrollTop = Math.max(0, rootElement.scrollHeight - window.innerHeight);
      const targetTop = Math.min(savedTop, maxScrollTop);

      window.scrollTo({
        top: targetTop,
        behavior: "auto"
      });

      const isCloseEnough = Math.abs(window.scrollY - targetTop) <= 2;
      if (isCloseEnough || attempt >= 10) {
        rootElement.style.scrollBehavior = previousScrollBehavior;
        return;
      }

      timeoutId = window.setTimeout(() => {
        rafId = window.requestAnimationFrame(restore);
      }, attempt < 4 ? 60 : 160);
    };

    rafId = window.requestAnimationFrame(restore);

    return () => {
      canceled = true;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      rootElement.style.scrollBehavior = previousScrollBehavior;
    };
  }, [pathname]);

  useEffect(() => {
    const key = getStorageKey(pathname);

    let rafId: number | null = null;

    const persist = () => {
      if (rafId !== null) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        window.sessionStorage.setItem(key, String(window.scrollY));
        rafId = null;
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persist();
      }
    };

    persist();
    const intervalId = window.setInterval(persist, 750);
    window.addEventListener("beforeunload", persist);
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.clearInterval(intervalId);
      window.removeEventListener("beforeunload", persist);
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname]);

  return null;
}
