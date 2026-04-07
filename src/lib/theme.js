const DARK = {
  bg: "#0a0f1e", panel: "#0e1628", card: "#111f35", sidebar: "#0e1628",
  border: "#1a2d45", border2: "#243650",
  text: "#dce8f5", muted: "#7aaabe",
  orange: "#f97316", green: "#22c55e", blue: "#3b82f6",
  purple: "#a855f7", red: "#ef4444", yellow: "#eab308",
};

const LIGHT = {
  bg: "#c8d4de", panel: "#ffffff", card: "#edf1f6", sidebar: "#9aafc0",
  border: "#b8c8d8", border2: "#8faabf",
  text: "#0f172a", muted: "#1e3a52",
  orange: "#ea6c00", green: "#16a34a", blue: "#2563eb",
  purple: "#7c3aed", red: "#dc2626", yellow: "#b45309",
};

// Mutable object — mutated in-place by applyTheme() before each React re-render
export const C = { ...DARK };

export function applyTheme(isDark) {
  Object.assign(C, isDark ? DARK : LIGHT);
}

// Initialize from localStorage immediately (before first render)
if (typeof window !== "undefined") {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    applyTheme(false);
    document.documentElement.style.setProperty("--bg", "#c8d4de");
  }
}

export const PROJECT_COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7",
  "#ef4444", "#eab308", "#06b6d4", "#ec4899",
];
