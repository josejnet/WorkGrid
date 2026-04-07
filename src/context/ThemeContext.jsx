import { createContext, useContext, useState } from "react";
import { applyTheme } from "../lib/theme";

const ThemeContext = createContext(null);

function getInitialDark() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("theme") !== "light";
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(getInitialDark);

  function toggleTheme() {
    setIsDark(prev => {
      const next = !prev;
      // Mutate C synchronously before React re-renders
      applyTheme(next);
      localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.style.setProperty("--bg", next ? "#0a0f1e" : "#c8d4de");
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
