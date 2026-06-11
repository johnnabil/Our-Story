"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type NavItem = {
  id: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "hero", label: "Home" },
  { id: "letter", label: "Letter" },
  { id: "story", label: "Story" },
  { id: "gallery", label: "Photos" },
  { id: "countdowns", label: "Dates" },
  { id: "dreams", label: "Dreams" },
  { id: "profiles", label: "Us" }
];

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Nav() {
  const [activeSection, setActiveSection] = useState("hero");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuDialogRef = useRef<HTMLDivElement | null>(null);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    window.requestAnimationFrame(() => {
      mobileMenuButtonRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const sections = NAV_ITEMS
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);

    if (!sections.length) {
      return;
    }

    const visibleSections = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        const nextActive = [...visibleSections.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        if (nextActive) {
          setActiveSection(nextActive);
        }
      },
      {
        rootMargin: "-28% 0px -58% 0px",
        threshold: [0.01, 0.18, 0.4, 0.65]
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const focusable = mobileMenuDialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    } else {
      mobileMenuDialogRef.current?.focus();
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileMenu();
        return;
      }

      if (event.key !== "Tab" || !mobileMenuDialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        mobileMenuDialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !mobileMenuDialogRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (!active || active === last || !mobileMenuDialogRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen, closeMobileMenu]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");

    const handleMediaChange = () => {
      if (mediaQuery.matches) {
        setIsMobileMenuOpen(false);
      }
    };

    handleMediaChange();
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gold/25 bg-warm-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:hidden">
          <span className="font-serif text-2xl text-rose-ink">Our Story</span>
          <button
            ref={mobileMenuButtonRef}
            type="button"
            onClick={() => setIsMobileMenuOpen((previous) => !previous)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-dialog"
            className="min-h-11 rounded-full border border-rose/30 bg-warm-white px-4 py-2 text-sm text-text transition hover:border-rose/50 hover:bg-rose-light/30 active:scale-[0.98]"
          >
            {isMobileMenuOpen ? "Close" : "Menu"}
          </button>
        </div>

        <nav className="mx-auto hidden h-16 max-w-6xl items-center justify-between gap-5 px-4 md:flex">
          <a
            href="#hero"
            onClick={(event) => {
              event.preventDefault();
              scrollToSection("hero");
            }}
            className="font-serif text-2xl text-rose-ink transition hover:text-rose-deep"
          >
            Our Story
          </a>
          <div className="flex items-center gap-1.5">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(item.id);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-[0.98] ${
                activeSection === item.id
                  ? "border-rose/45 bg-rose-light/45 text-rose-ink"
                  : "border-transparent text-text-muted hover:border-rose/30 hover:text-rose-ink"
              }`}
            >
              {item.label}
            </a>
          ))}
          </div>
        </nav>
      </header>

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-50 bg-text/75 md:hidden"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeMobileMenu();
            }
          }}
          role="presentation"
        >
          <div
            ref={mobileMenuDialogRef}
            id="mobile-navigation-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            tabIndex={-1}
            className="flex h-full w-full flex-col bg-cream px-6 py-8 outline-none"
          >
            <div className="mb-8 flex items-center justify-between">
              <span className="font-serif text-3xl text-rose-ink">Navigate</span>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="min-h-11 rounded-full border border-rose/30 px-4 py-2 text-sm text-text transition hover:bg-warm-white active:scale-[0.98]"
              >
                Close
              </button>
            </div>

            <nav className="flex flex-1 flex-col justify-center gap-3" aria-label="Mobile site navigation">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(item.id);
                    closeMobileMenu();
                  }}
                  className={`min-h-11 rounded-2xl border px-4 py-3 text-lg transition active:scale-[0.98] ${
                    activeSection === item.id
                      ? "border-rose/45 bg-rose-light/45 text-rose-ink"
                      : "border-gold/30 bg-warm-white text-text-muted"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
