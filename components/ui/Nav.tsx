"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type NavItem = {
  id: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "hero", label: "Home" },
  { id: "countdowns", label: "Countdowns" },
  { id: "gallery", label: "Gallery" },
  { id: "story", label: "Story" },
  { id: "profiles", label: "Profiles" },
  { id: "letter", label: "Letter" },
  { id: "dreams", label: "Dreams" }
];

export function Nav() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setHasScrolled(window.scrollY > 8);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const updateActiveSection = useCallback(() => {
    const sections = NAV_ITEMS
      .map((item) => item.id)
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (!sections.length) {
      return;
    }

    const scrollProbe = window.scrollY + 140;
    const pageBottom = window.scrollY + window.innerHeight;
    const documentBottom = document.documentElement.scrollHeight;

    if (pageBottom >= documentBottom - 2) {
      const lastSection = sections[sections.length - 1];
      setActiveSection(lastSection.id);
      return;
    }

    let nextActive = sections[0].id;
    for (const section of sections) {
      if (section.offsetTop <= scrollProbe) {
        nextActive = section.id;
      } else {
        break;
      }
    }

    setActiveSection(nextActive);
  }, []);

  useEffect(() => {
    let rafId: number | null = null;

    const onViewportChange = () => {
      if (rafId !== null) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        updateActiveSection();
        rafId = null;
      });
    };

    onViewportChange();
    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [updateActiveSection]);

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

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

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

  const wrapperClassName = useMemo(
    () =>
      `sticky top-0 z-40 border-b transition-all ${
        hasScrolled
          ? "border-gold/35 bg-warm-white/80 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`,
    [hasScrolled]
  );

  return (
    <>
      <header className={wrapperClassName}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:hidden">
          <span className="font-serif text-2xl text-rose">Our Story</span>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((previous) => !previous)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            className="rounded-md border border-gold/35 px-3 py-2 text-sm text-text transition hover:bg-cream"
          >
            {isMobileMenuOpen ? "Close" : "Menu"}
          </button>
        </div>

        <nav className="mx-auto hidden max-w-6xl items-center justify-center gap-2 px-4 py-3 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(item.id);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                activeSection === item.id
                  ? "border-rose/45 bg-rose/10 text-rose"
                  : "border-gold/30 text-text-muted hover:border-rose/40 hover:text-rose"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-50 bg-text/75 md:hidden"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsMobileMenuOpen(false);
            }
          }}
          role="presentation"
        >
          <div className="flex h-full w-full flex-col bg-cream px-6 py-8">
            <div className="mb-8 flex items-center justify-between">
              <span className="font-serif text-3xl text-rose">Navigate</span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-md border border-gold/35 px-3 py-2 text-sm text-text transition hover:bg-warm-white"
              >
                Close
              </button>
            </div>

            <nav className="flex flex-1 flex-col justify-center gap-3">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`rounded-xl border px-4 py-3 text-lg transition ${
                    activeSection === item.id
                      ? "border-rose/45 bg-rose/10 text-rose"
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
