const themeStorageKey = "theme";

export type Theme = "light" | "dark";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return null;
}

export function getPreferredTheme(): Theme {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export function resolveTheme(): Theme {
  return getStoredTheme() ?? getPreferredTheme();
}

export function applyTheme(theme: Theme) {
  const isDark = theme === "dark";

  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: Theme) {
  window.localStorage.setItem(themeStorageKey, theme);
  applyTheme(theme);
}

export function initializeTheme() {
  if (typeof document === "undefined") {
    return;
  }

  applyTheme(resolveTheme());
}