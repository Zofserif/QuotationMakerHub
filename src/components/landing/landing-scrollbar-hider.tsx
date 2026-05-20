"use client";

import { useEffect } from "react";

const landingScrollbarClassName = "landing-scrollbar-hidden";

export function LandingScrollbarHider() {
  useEffect(() => {
    document.documentElement.classList.add(landingScrollbarClassName);

    return () => {
      document.documentElement.classList.remove(landingScrollbarClassName);
    };
  }, []);

  return null;
}
