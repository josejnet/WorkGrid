import { useState } from "react";
import { C } from "../../lib/theme";
import { PROJECT_COLORS } from "../../lib/theme";
import { getInputStyle, getLabelStyle } from "../../lib/styles";
import Btn from "../../components/ui/Btn";

export default function ProjectModal({ proyecto, onClose, onSave }) {
  const inputStyle = getInputStyle();
  const labelStyle = getLabelStyle();
  const [form, setForm] = useState(proyecto
    ? { ...proyecto }
    : { nombre: "", descripcion: "", color: PROJECT_COLORS[0], url: "" }
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.panel, borderRadius: 18, border: `1px solid ${C.border2}`, width: "100%", maxWidth: 660, padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>
            📁 {proyecto?._fid ? "Editar proyecto" : "Nuevo proyecto"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Nombre *</label>
          <input value={form.nombre} onChange={e => set("nombre", e.target.value)} style={inputStyle} placeholder="Nombre del proyecto" required />

          <label style={labelStyle}>Descripción</label>
          <input value={form.descripcion || ""} onChange={e => set("descripcion", e.target.value)} style={inputStyle} placeholder="Descripción breve (opcional)" />

          <label style={labelStyle}>URL</label>
          <input value={form.url || ""} onChange={e => set("url", e.target.value)} style={inputStyle} placeholder="https://..." />

          <label style={labelStyle}>Color</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {PROJECT_COLORS.map(c => (
              <button key={c} type="button" onClick={() => set("color", c)}
                style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: form.color === c ? `3px solid ${C.text}` : `3px solid transparent`, cursor: "pointer", outline: "none", padding: 0 }} />
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
            <Btn color={C.border2} onClick={onClose} type="button">Cancelar</Btn>
            <Btn type="submit" disabled={saving || !form.nombre.trim()}>
              {saving ? "Guardando…" : proyecto?._fid ? "Guardar" : "Crear proyecto"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
