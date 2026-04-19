import { useState } from "react";
import { C } from "../../lib/theme";
import Btn from "../../components/ui/Btn";
import { useApp } from "../../context/AppContext";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SCANNED_FIELDS = [
  { key: "url",          label: "URL del proyecto" },
  { key: "notasTecnicas", label: "Notas técnicas" },
];

export default function BackupRevincular() {
  const { projects, handleSaveProject } = useApp();

  const [oldDomain, setOldDomain] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [preview,   setPreview]   = useState(null);  // null | { items, scanned, old, neu }
  const [applying,  setApplying]  = useState(false);
  const [applied,   setApplied]   = useState(false);

  // ── Escaneo ───────────────────────────────────────────────────────────────

  function scan() {
    const old = oldDomain.trim().replace(/\/$/, "");
    const neu = newDomain.trim().replace(/\/$/, "");
    if (!old || !neu) return;
    setApplied(false);

    const re    = new RegExp(escapeRegex(old), "g");
    const items = [];

    for (const p of projects) {
      const hits = [];
      for (const { key, label } of SCANNED_FIELDS) {
        const val = p[key];
        if (val && typeof val === "string" && val.includes(old)) {
          hits.push({ key, label, before: val, after: val.replace(re, neu) });
        }
      }
      if (hits.length) items.push({ project: p, hits });
    }

    setPreview({ items, scanned: projects.length, old, neu });
  }

  // ── Aplicar ───────────────────────────────────────────────────────────────

  async function applyReplacements() {
    if (!preview?.items.length) return;
    setApplying(true);
    for (const { project, hits } of preview.items) {
      const patch = {};
      hits.forEach(h => { patch[h.key] = h.after; });
      await handleSaveProject({ _fid: project._fid, ...patch });
    }
    setApplying(false);
    setApplied(true);
    // Re-scan con el nuevo dominio para reflejar estado actual
    setPreview(prev => ({
      ...prev,
      items: [],
      applied: true,
    }));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 720 }}>

      {/* ── Inputs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Dominio origen (antiguo)", val: oldDomain, set: setOldDomain, ph: "https://antiguo.vercel.app" },
          { label: "Dominio destino (nuevo)",  val: newDomain, set: setNewDomain, ph: "https://nuevo.vercel.app" },
        ].map(({ label, val, set, ph }) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>
              {label}
            </div>
            <input
              value={val}
              onChange={e => { set(e.target.value); setPreview(null); setApplied(false); }}
              placeholder={ph}
              style={{
                width: "100%", padding: "9px 12px", fontSize: 13,
                background: C.card, border: `1px solid ${C.border2}`,
                borderRadius: 8, color: C.text, fontFamily: "monospace", outline: "none",
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 28 }}>
        <Btn
          onClick={scan}
          disabled={!oldDomain.trim() || !newDomain.trim() || oldDomain.trim() === newDomain.trim()}
          color={C.border2}
        >
          🔍 Escanear proyectos
        </Btn>
      </div>

      {/* ── Resultados del escaneo ── */}
      {preview && (
        <div style={{ marginBottom: 28 }}>
          {preview.applied ? (
            <div style={{ padding: "14px 16px", background: C.green + "12", border: `1px solid ${C.green}44`, borderRadius: 10, fontSize: 13, color: C.green, fontWeight: 600 }}>
              ✓ Reemplazos aplicados. Los proyectos han sido actualizados.
            </div>
          ) : preview.items.length === 0 ? (
            <div style={{ padding: "14px 16px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, color: C.muted }}>
              No se encontraron referencias a <code style={{ color: C.text }}>{preview.old}</code> en los {preview.scanned} proyectos escaneados.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                <span style={{ color: C.orange, fontWeight: 700 }}>{preview.items.length}</span> proyecto{preview.items.length !== 1 ? "s" : ""} con referencias — {preview.scanned} escaneados
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {preview.items.map(({ project, hits }) => (
                  <div key={project._fid} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: project.color, flexShrink: 0, display: "inline-block" }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{project.nombre}</span>
                    </div>
                    {hits.map(h => (
                      <div key={h.key} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{h.label}</div>
                        <div style={{ fontSize: 12, color: C.red,   fontFamily: "monospace", wordBreak: "break-all", marginBottom: 3 }}>
                          — {h.before}
                        </div>
                        <div style={{ fontSize: 12, color: C.green, fontFamily: "monospace", wordBreak: "break-all" }}>
                          + {h.after}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <Btn onClick={applyReplacements} disabled={applying}>
                {applying ? "Aplicando…" : `Aplicar ${preview.items.reduce((a, i) => a + i.hits.length, 0)} reemplazo${preview.items.reduce((a, i) => a + i.hits.length, 0) !== 1 ? "s" : ""}`}
              </Btn>
            </>
          )}
        </div>
      )}

      {/* ── WorkGrid CLI — instrucciones manuales ── */}
      <div style={{ padding: "16px 18px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 10 }}>
          ⚡ WorkGrid CLI — actualización manual
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8, marginBottom: 12 }}>
          El WorkGrid CLI guarda las URLs de los proyectos en el <strong style={{ color: C.text }}>localStorage del navegador</strong>.
          No pueden actualizarse automáticamente desde aquí. Sigue estos pasos en cada navegador/dispositivo que use el CLI:
        </div>
        <ol style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            "Abre el WorkGrid CLI y ve a la sección Configuración.",
            "Localiza el proyecto con la URL antigua y pulsa el botón de eliminar (✕).",
            "En el formulario de nuevo proyecto, introduce la URL nueva y el mismo token de API.",
            "Pulsa Conectar para verificar y guardar.",
          ].map((step, i) => (
            <li key={i} style={{ fontSize: 12, color: C.muted }}>{step}</li>
          ))}
        </ol>
        {newDomain.trim() && (
          <div style={{ marginTop: 12, padding: "8px 12px", background: C.panel, borderRadius: 7, border: `1px solid ${C.border2}` }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Nueva URL base del proyecto:</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <code style={{ fontSize: 12, color: C.text, flex: 1, wordBreak: "break-all" }}>{newDomain.trim().replace(/\/$/, "")}/api/taller</code>
              <button
                onClick={() => navigator.clipboard?.writeText(newDomain.trim().replace(/\/$/, "") + "/api/taller")}
                style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, background: "none", color: C.muted, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
              >
                Copiar
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
