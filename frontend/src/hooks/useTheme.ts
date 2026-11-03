import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/config/constants";

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === "light") {
        setIsDarkMode(false);
        document.documentElement.classList.remove("dark");
      } else {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem(STORAGE_KEYS.THEME, "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem(STORAGE_KEYS.THEME, "light");
      }
      return next;
    });
  }, []);

  return { isDarkMode, toggleDarkMode };
}
