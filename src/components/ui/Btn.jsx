import { C } from "../../lib/theme";

export default function Btn({
  children, onClick, color = C.orange, size = "md",
  style = {}, disabled = false, type = "button",
}) {
  const pad = size === "sm" ? "5px 12px" : size === "lg" ? "11px 24px" : "8px 16px";
  const fs  = size === "sm" ? 12 : size === "lg" ? 15 : 13;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? C.border : color,
        border: "none", borderRadius: 8,
        color: "#fff", fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        padding: pad, fontSize: fs,
        fontFamily: "inherit",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
