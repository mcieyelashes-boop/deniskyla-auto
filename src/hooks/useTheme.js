import { useState, useEffect } from "react";

export const THEMES = {
  dark: {
    name: "dark",
    bg: "#07070f",
    bgCard: "rgba(12,12,22,0.7)",
    bgPanel: "#0d0d1a",
    border: "#ffffff0f",
    borderStrong: "#ffffff15",
    text: "#ffffff",
    textMuted: "#ffffff77",
    textDim: "#ffffff44",
    textFaint: "#ffffff22",
    gold: "#F0C040",
    green: "#34D399",
    blue: "#38BDF8",
    purple: "#A78BFA",
    red: "#ef4444",
  },
  light: {
    name: "light",
    bg: "#f8f8ff",
    bgCard: "rgba(255,255,255,0.9)",
    bgPanel: "#ffffff",
    border: "#00000010",
    borderStrong: "#00000018",
    text: "#0a0a14",
    textMuted: "#44444477",
    textDim: "#44444455",
    textFaint: "#44444422",
    gold: "#d4a017",
    green: "#059669",
    blue: "#0284c7",
    purple: "#7c3aed",
    red: "#dc2626",
  },
};

export function useTheme() {
  const [themeName, setThemeName] = useState(() =>
    localStorage.getItem("deniskyla_theme") || "dark"
  );

  const theme = THEMES[themeName] || THEMES.dark;

  useEffect(() => {
    localStorage.setItem("deniskyla_theme", themeName);
    // Apply CSS variables to root for global use
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, val]) => {
      if (key !== "name") root.style.setProperty(`--t-${key}`, val);
    });
    root.setAttribute("data-theme", themeName);
    document.body.style.background = theme.bg;
  }, [themeName, theme]);

  const toggleTheme = () =>
    setThemeName(prev => prev === "dark" ? "light" : "dark");

  return { theme, themeName, toggleTheme };
}
