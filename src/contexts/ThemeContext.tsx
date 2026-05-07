import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type FontSize = "small" | "medium" | "large";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  autoScroll: boolean;
  setAutoScroll: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    (localStorage.getItem("theme") as Theme) || "dark"
  );
  const [fontSize, setFontSizeState] = useState<FontSize>(() =>
    (localStorage.getItem("fontSize") as FontSize) || "medium"
  );
  const [autoScroll, setAutoScrollState] = useState(() =>
    localStorage.getItem("autoScroll") !== "false"
  );

  const setTheme = (t: Theme) => { setThemeState(t); localStorage.setItem("theme", t); };
  const setFontSize = (s: FontSize) => { setFontSizeState(s); localStorage.setItem("fontSize", s); };
  const setAutoScroll = (v: boolean) => { setAutoScrollState(v); localStorage.setItem("autoScroll", String(v)); };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("text-sm", "text-base", "text-lg");
    const sizeMap: Record<FontSize, string> = { small: "text-sm", medium: "text-base", large: "text-lg" };
    root.classList.add(sizeMap[fontSize]);
  }, [fontSize]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, fontSize, setFontSize, autoScroll, setAutoScroll }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
