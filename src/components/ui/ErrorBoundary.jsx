import { Component } from "react";
import { C } from "../../lib/theme";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{
        background: C.bg, minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter',sans-serif", color: C.text, padding: 24,
      }}>
        <div style={{
          background: C.panel, borderRadius: 16,
          border: `1px solid ${C.red}44`, padding: 32,
          maxWidth: 480, width: "100%", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💥</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 8 }}>
            Algo fue mal
          </div>
          <div style={{
            fontSize: 12, color: C.muted, marginBottom: 24,
            background: C.card, borderRadius: 8, padding: "10px 14px",
            fontFamily: "monospace", textAlign: "left", lineHeight: 1.6,
            wordBreak: "break-all",
          }}>
            {this.state.error?.message || "Error desconocido"}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: C.orange, color: "#fff", border: "none",
              borderRadius: 10, padding: "10px 24px", fontSize: 13,
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Recargar aplicación
          </button>
        </div>
      </div>
    );
  }
}
