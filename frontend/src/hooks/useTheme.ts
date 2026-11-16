import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/config/constants";

export type ThemeMode = "light" | "dark" | "system";

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

  const setThemeMode = useCallback((mode: ThemeMode) => {
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

  const toggleDarkMode = useCallback(() => {
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
  }, []);

  return { isDarkMode, toggleDarkMode, themeMode, setThemeMode };
}

