import { useEffect, useState } from "react";

const themeStorageKey = "theme";

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
}

export default function Settings() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem(themeStorageKey);
    const prefersDark = storedTheme === "dark";

    setIsDark(prefersDark);
    applyTheme(prefersDark);
  }, []);

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.checked;

    setIsDark(nextValue);
    localStorage.setItem(themeStorageKey, nextValue ? "dark" : "light");
    applyTheme(nextValue);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 text-white">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <p className="mt-2 text-slate-300">
        Customize how the app looks and feels.
      </p>
      <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800/60 p-6">
        <label className="flex items-center justify-between gap-4">
          <span className="text-lg">Dark Mode</span>
          <span className="relative inline-flex h-6 w-11 items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={isDark}
              onChange={handleToggle}
              aria-label="Toggle dark mode"
            />
            <span className="absolute inset-0 rounded-full bg-slate-600 transition-colors peer-checked:bg-slate-400" />
            <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      </div>
    </div>
  );
}
