import { C } from "./theme";

// Functions that read C at render time — safe with theme switching
export function getInputStyle(overrides = {}) {
  return {
    background: C.card,
    border: `1px solid ${C.border2}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: C.text,
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    ...overrides,
  };
}

export function getLabelStyle(overrides = {}) {
  return {
    fontSize: 11,
    color: C.muted,
    fontWeight: 600,
    display: "block",
    marginBottom: 5,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    ...overrides,
  };
}
