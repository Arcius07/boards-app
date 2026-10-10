const KEY = "boards-theme";

export function getTheme() {
  try {
    return localStorage.getItem(KEY) || "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
}