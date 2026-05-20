"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type FocusEvent,
} from "react";
import {
  ArrowRight,
  Car,
  Camera,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Wrench,
  Zap,
} from "lucide-react";

import type { LandingPageNiche } from "@/lib/landing-pages";
import { cn } from "@/lib/utils";

const nicheIcons = {
  "cctv-security-quotes": Camera,
  "it-solutions-repair-quotes": Laptop,
  "hvac-electrical-repair-quotes": Zap,
  "automotive-detailing-repair-quotes": Car,
};

const autoAdvanceDelayMs = 4000;

const placeholderVisuals: Record<
  string,
  {
    backgroundImage: string;
    patternImage: string;
    patternSize: string;
  }
> = {
  "cctv-security-quotes": {
    backgroundImage:
      "radial-gradient(circle at 20% 18%, rgba(110, 231, 183, 0.62), transparent 28%), radial-gradient(circle at 82% 28%, rgba(20, 184, 166, 0.5), transparent 26%), linear-gradient(135deg, #052e2b 0%, #0f766e 48%, #0f172a 100%)",
    patternImage:
      "linear-gradient(rgba(255, 255, 255, 0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.16) 1px, transparent 1px)",
    patternSize: "34px 34px",
  },
  "it-solutions-repair-quotes": {
    backgroundImage:
      "radial-gradient(circle at 18% 22%, rgba(96, 165, 250, 0.58), transparent 30%), radial-gradient(circle at 82% 16%, rgba(45, 212, 191, 0.36), transparent 24%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 48%, #111827 100%)",
    patternImage:
      "linear-gradient(120deg, rgba(255, 255, 255, 0.18) 1px, transparent 1px), linear-gradient(30deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
    patternSize: "42px 42px",
  },
  "hvac-electrical-repair-quotes": {
    backgroundImage:
      "radial-gradient(circle at 22% 20%, rgba(251, 191, 36, 0.64), transparent 28%), radial-gradient(circle at 78% 30%, rgba(52, 211, 153, 0.5), transparent 28%), linear-gradient(135deg, #451a03 0%, #047857 54%, #111827 100%)",
    patternImage:
      "linear-gradient(135deg, rgba(255, 255, 255, 0.18) 10%, transparent 10%, transparent 50%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.12) 60%, transparent 60%)",
    patternSize: "32px 32px",
  },
  "automotive-detailing-repair-quotes": {
    backgroundImage:
      "radial-gradient(circle at 24% 18%, rgba(16, 185, 129, 0.52), transparent 28%), radial-gradient(circle at 76% 22%, rgba(148, 163, 184, 0.42), transparent 24%), linear-gradient(135deg, #111827 0%, #334155 50%, #064e3b 100%)",
    patternImage:
      "repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.16) 0 1px, transparent 1px 22px)",
    patternSize: "48px 48px",
  },
};

function wrapIndex(index: number, count: number) {
  return (index + count) % count;
}

function getRelativePosition(index: number, activeIndex: number, count: number) {
  let position = index - activeIndex;

  if (position > count / 2) {
    position -= count;
  }

  if (position < -count / 2) {
    position += count;
  }

  return position;
}

function getCardStyle(position: number): CSSProperties {
  const isActive = position === 0;
  const isSidePreview = Math.abs(position) === 1;
  const side = position < 0 ? -1 : 1;
  const translateX = isActive ? 0 : side * 64;
  const scale = isActive ? 1 : isSidePreview ? 0.82 : 0.74;

  return {
    opacity: isActive ? 1 : isSidePreview ? 0.34 : 0,
    transform: `translate(-50%, -50%) translateX(${translateX}%) scale(${scale})`,
    zIndex: isActive ? 30 : isSidePreview ? 20 : 0,
  };
}

function UseCaseCardVisual({ niche }: { niche: LandingPageNiche }) {
  const placeholder =
    placeholderVisuals[niche.slug] ?? placeholderVisuals["cctv-security-quotes"];

  return (
    <>
      {niche.image?.src ? (
        <Image
          alt={niche.image.alt ?? ""}
          className="object-cover"
          fill
          sizes="(max-width: 640px) 78vw, 42rem"
          src={niche.image.src}
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: placeholder.backgroundImage,
          }}
        >
          <span
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: placeholder.patternImage,
              backgroundSize: placeholder.patternSize,
            }}
          />
          <span className="absolute -right-12 -top-12 size-36 rounded-full bg-white/20 blur-3xl" />
          <span className="absolute -bottom-16 left-8 size-44 rounded-full bg-emerald-200/20 blur-3xl" />
        </span>
      )}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/62 to-stone-950/10"
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/18 to-transparent"
      />
    </>
  );
}

function UseCaseCardContent({
  active,
  niche,
}: {
  active: boolean;
  niche: LandingPageNiche;
}) {
  const Icon = nicheIcons[niche.slug as keyof typeof nicheIcons] ?? Wrench;

  return (
    <span className="relative z-10 flex h-full flex-col justify-end p-5 text-white sm:p-6">
      <span className={cn(!active && "mb-3")}>
        <span
          className={cn(
            "flex items-center justify-center rounded-md border border-white/28 bg-white/88 text-emerald-800 shadow-sm backdrop-blur transition-colors",
            active ? "size-11" : "size-10",
          )}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <span
          className={cn(
            "mt-4 block font-semibold leading-7 drop-shadow-sm",
            active ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
          )}
        >
          {niche.label}
        </span>
        {active ? (
          <span className="mt-3 block max-w-lg text-sm leading-6 text-white/86">
            {niche.introTitle}
          </span>
        ) : null}
      </span>
      {active ? (
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-100">
          See how to implement
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      ) : null}
    </span>
  );
}

export function UseCaseCarousel({ niches }: { niches: LandingPageNiche[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const currentIndex = niches.length > 0 ? activeIndex % niches.length : 0;
  const canLoop = niches.length > 1;

  const move = useCallback(
    (direction: "previous" | "next") => {
      if (!canLoop) {
        return;
      }

      setActiveIndex((currentIndex) =>
        wrapIndex(currentIndex + (direction === "next" ? 1 : -1), niches.length),
      );
    },
    [canLoop, niches.length],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    if (!canLoop || isPaused || prefersReducedMotion) {
      return;
    }

    const timerId = window.setInterval(() => {
      move("next");
    }, autoAdvanceDelayMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [canLoop, isPaused, move, prefersReducedMotion]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget;

    if (
      nextFocusedElement instanceof Node &&
      event.currentTarget.contains(nextFocusedElement)
    ) {
      return;
    }

    setIsPaused(false);
  };

  return (
    <div
      className="mt-10"
      onBlurCapture={handleBlur}
      onFocusCapture={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative mx-auto h-[27rem] max-w-5xl overflow-hidden sm:h-[24rem]">
        <button
          aria-label="Previous use cases"
          className="absolute left-1 top-1/2 z-40 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-700 shadow-sm backdrop-blur transition-colors hover:border-emerald-200 hover:bg-white hover:text-emerald-800 disabled:pointer-events-none disabled:opacity-40 sm:left-5"
          disabled={!canLoop}
          onClick={() => move("previous")}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <button
          aria-label="Next use cases"
          className="absolute right-1 top-1/2 z-40 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-700 shadow-sm backdrop-blur transition-colors hover:border-emerald-200 hover:bg-white hover:text-emerald-800 disabled:pointer-events-none disabled:opacity-40 sm:right-5"
          disabled={!canLoop}
          onClick={() => move("next")}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
        <ul aria-label="Business use cases" className="list-none p-0">
          {niches.map((niche, index) => {
            const position = getRelativePosition(index, currentIndex, niches.length);
            const isActive = position === 0;
            const isVisible = Math.abs(position) <= 1;
            const cardClassName = cn(
              "group relative block h-full w-full overflow-hidden rounded-md border text-left transition-colors",
              isActive
                ? "border-white/70 shadow-xl shadow-stone-300/80 ring-1 ring-stone-950/5"
                : "border-white/60 shadow-md shadow-stone-300/70 hover:border-emerald-100",
            );

            return (
              <li
                aria-hidden={!isVisible}
                className={cn(
                  "absolute left-1/2 top-1/2 h-[21rem] w-[78%] max-w-xl transition-all duration-500 ease-out motion-reduce:transition-none sm:h-72 sm:w-[72%]",
                  !isVisible && "pointer-events-none",
                )}
                key={niche.slug}
                style={getCardStyle(position)}
              >
                {isActive ? (
                  <Link className={cardClassName} href={`/${niche.slug}`}>
                    <UseCaseCardVisual niche={niche} />
                    <UseCaseCardContent active niche={niche} />
                  </Link>
                ) : (
                  <button
                    aria-label={`Focus ${niche.label}`}
                    className={cardClassName}
                    onClick={() => setActiveIndex(index)}
                    tabIndex={isVisible ? 0 : -1}
                    type="button"
                  >
                    <UseCaseCardVisual niche={niche} />
                    <UseCaseCardContent active={false} niche={niche} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div
        aria-label="Use-case carousel slides"
        className="mt-4 flex justify-center gap-2"
      >
        {niches.map((niche, index) => {
          const isActive = index === currentIndex;

          return (
            <button
              aria-current={isActive ? "true" : undefined}
              aria-label={`Show ${niche.label}`}
              className={cn(
                "h-2 rounded-full transition-all",
                isActive
                  ? "w-6 bg-emerald-600"
                  : "w-2 bg-stone-300 hover:bg-stone-400",
              )}
              key={niche.slug}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          );
        })}
      </div>
    </div>
  );
}
