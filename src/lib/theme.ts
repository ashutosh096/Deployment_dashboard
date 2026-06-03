export type Theme = "light" | "dark";

const KEY = "deploy_dash_theme";

export function getStoredTheme(): Theme {
  return (localStorage.getItem(KEY) as Theme) ?? "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(KEY, theme);
}
