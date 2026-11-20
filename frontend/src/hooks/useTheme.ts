import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/config/constants";

export type ThemeMode = "light" | "dark" | "system";

/**
 * Executes a state-updating callback wrapped in the View Transitions API
 * with directional circular ripple animation at 700ms:
 * - Switching to Dark: Ripples OUTWARD from the toggle button (expanding
 *   ::view-transition-new(root) clipPath from 0px to maxRadius on top).
 * - Switching to Light: Ripples INWARD TOWARD the toggle button (shrinking
 *   ::view-transition-old(root) clipPath from maxRadius to 0px on top,
 *   so the dark canvas collapses back into the button revealing the light page).
 */
function animateThemeTransition(
  updateThemeState: () => void,
  targetIsDark: boolean,
  event?: React.MouseEvent | MouseEvent
) {
  if (
    typeof document === "undefined" ||
    !("startViewTransition" in document) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    updateThemeState();
    return;
  }

  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = (document as any).startViewTransition(() => {
    updateThemeState();
  });

  transition.ready
    .then(() => {
      if (targetIsDark) {
        // Light -> Dark: ripple OUTWARD from button
        // New dark canvas expands outward on top
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 700,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      } else {
        // Dark -> Light: ripple INWARD toward button
        // Old dark canvas collapses back into the button on top
        document.documentElement.animate(
          {
            clipPath: [
              `circle(${endRadius}px at ${x}px ${y}px)`,
              `circle(0px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 700,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
            pseudoElement: "::view-transition-old(root)",
          }
        );
      }
    })
    .catch(() => {
      // Fallback silently if transition fails
    });
}

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeMode | null;
      if (saved === "light") {
        setIsDarkMode(false);
        setThemeModeState("light");
        document.documentElement.classList.remove("dark");
      } else if (saved === "system") {
        setThemeModeState("system");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setIsDarkMode(prefersDark);
        if (prefersDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else {
        setIsDarkMode(true);
        setThemeModeState("dark");
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const applyThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    if (mode === "light") {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
      localStorage.setItem(STORAGE_KEYS.THEME, "light");
    } else if (mode === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
      localStorage.setItem(STORAGE_KEYS.THEME, "dark");
    } else {
      localStorage.setItem(STORAGE_KEYS.THEME, "system");
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const setThemeMode = useCallback(
    (mode: ThemeMode, event?: React.MouseEvent | MouseEvent) => {
      let targetIsDark = false;
      if (mode === "dark") {
        targetIsDark = true;
      } else if (mode === "system") {
        targetIsDark =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
      }

      animateThemeTransition(
        () => {
          applyThemeMode(mode);
        },
        targetIsDark,
        event
      );
    },
    [applyThemeMode]
  );

  const toggleDarkMode = useCallback(
    (event?: React.MouseEvent | MouseEvent) => {
      const targetIsDark = !isDarkMode;
      animateThemeTransition(
        () => {
          setIsDarkMode((prev) => {
            const next = !prev;
            if (next) {
              document.documentElement.classList.add("dark");
              localStorage.setItem(STORAGE_KEYS.THEME, "dark");
              setThemeModeState("dark");
            } else {
              document.documentElement.classList.remove("dark");
              localStorage.setItem(STORAGE_KEYS.THEME, "light");
              setThemeModeState("light");
            }
            return next;
          });
        },
        targetIsDark,
        event
      );
    },
    [isDarkMode]
  );

  return { isDarkMode, toggleDarkMode, themeMode, setThemeMode };
}
