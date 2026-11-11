"use client";
/* eslint-disable react-hooks/set-state-in-effect -- Restore an external browser preference after hydration. */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isTheme, type Theme } from "@/lib/themes";
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  error: boolean;
} | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<Theme>("obsidian");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    try {
      const value = localStorage.getItem("katsodi.theme");
      if (isTheme(value)) updateTheme(value);
    } catch {
      setError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const system = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (system.matches ? "paper" : "obsidian") : theme;
    };
    apply();
    if (theme === "system") system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, [theme, ready]);
  function setTheme(value: Theme) {
    updateTheme(value);
    try {
      localStorage.setItem("katsodi.theme", value);
    } catch {
      setError(true);
    }
  }
  return (
    <ThemeContext.Provider value={{ theme, setTheme, error }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is required");
  return context;
}
