import { useCallback, useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "auto";

const getInitialMode = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "auto";
  }

  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "auto") {
    return stored;
  }

  return "auto";
};

const resolveTheme = (
  mode: ThemeMode,
  prefersDark: boolean
): "light" | "dark" => {
  if (mode === "auto") {
    return prefersDark ? "dark" : "light";
  }
  return mode;
};

const applyThemeMode = (mode: ThemeMode) => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveTheme(mode, prefersDark);

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolved);

  if (mode === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = mode;
  }

  document.documentElement.style.colorScheme = resolved;
};

const getNextMode = (current: ThemeMode): ThemeMode => {
  if (current === "light") {
    return "dark";
  }
  if (current === "dark") {
    return "auto";
  }
  return "light";
};

const getModeLabel = (mode: ThemeMode): string => {
  if (mode === "auto") {
    return "Auto";
  }
  if (mode === "dark") {
    return "Dark";
  }
  return "Light";
};

const ThemeToggle = () => {
  const [mode, setMode] = useState<ThemeMode>("auto");

  useEffect(() => {
    const initialMode = getInitialMode();
    setMode(initialMode);
    applyThemeMode(initialMode);
  }, []);

  useEffect(() => {
    if (mode !== "auto") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("auto");

    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const nextMode = getNextMode(prev);
      applyThemeMode(nextMode);
      window.localStorage.setItem("theme", nextMode);
      return nextMode;
    });
  }, []);

  const label =
    mode === "auto"
      ? "Theme mode: auto (system). Click to switch to light mode."
      : `Theme mode: ${mode}. Click to switch mode.`;

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={label}
      title={label}
      className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] shadow-[0_8px_22px_rgba(30,90,72,0.08)] transition hover:-translate-y-0.5"
    >
      {getModeLabel(mode)}
    </button>
  );
};

export default ThemeToggle;
