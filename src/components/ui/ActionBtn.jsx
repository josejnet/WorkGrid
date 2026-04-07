import { useState } from "react";
import { C } from "../../lib/theme";

export default function ActionBtn({ children, onClick, disabled, title, color }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, borderRadius: 7, border: "none",
        background: disabled ? "transparent" : hov ? color + "40" : color + "1a",
        color: disabled ? C.border2 : hov ? color : color + "cc",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13, fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: disabled ? 0.3 : 1,
        transform: hov && !disabled ? "scale(1.12)" : "scale(1)",
        transition: "all 0.12s ease",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
