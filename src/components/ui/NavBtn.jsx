import { C } from "../../lib/theme";

export default function NavBtn({ active, onClick, icon, label, muted = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 9,
        padding: "7px 10px 7px 11px",
        borderRadius: 8, border: "none", cursor: "pointer",
        background: active ? C.orange + "18" : "transparent",
        color: C.text,
        fontWeight: active ? 700 : 500,
        fontSize: 12.5,
        fontFamily: "inherit", marginBottom: 1,
        borderLeft: active ? `3px solid ${C.orange}` : "3px solid transparent",
        textAlign: "left",
        opacity: muted ? 0.45 : 1,
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.border + "88"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {icon} {label}
    </button>
  );
}
