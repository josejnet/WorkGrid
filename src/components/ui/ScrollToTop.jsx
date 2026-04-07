import { useState, useEffect } from "react";
import { C } from "../../lib/theme";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      onClick={handleClick}
      title="Volver al inicio"
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: C.panel,
        border: `1px solid ${C.border2}`,
        color: C.muted,
        fontSize: 18,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.25s ease, color 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = C.orange;
        e.currentTarget.style.borderColor = C.orange + "88";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = C.muted;
        e.currentTarget.style.borderColor = C.border2;
      }}
    >
      ↑
    </button>
  );
}
