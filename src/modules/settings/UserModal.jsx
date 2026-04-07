import { useState } from "react";
import { C } from "../../lib/theme";
import { getInputStyle, getLabelStyle } from "../../lib/styles";
import Btn from "../../components/ui/Btn";
import { useApp } from "../../context/AppContext";

function AccessToggle({ level, onChange }) {
  const opts = [
    { value: "none",  label: "Sin acceso", color: C.muted },
    { value: "read",  label: "Lectura",    color: C.blue  },
    { value: "write", label: "Escritura",  color: C.green },
  ];
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {opts.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          style={{
            fontSize: 10, padding: "3px 9px", borderRadius: 5,
            border: `1px solid ${level === o.value ? o.color + "88" : C.border}`,
            background: level === o.value ? o.color + "22" : "transparent",
            color: level === o.value ? o.color : C.muted,
            fontWeight: level === o.value ? 700 : 400,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function UserModal({ user, projects = [], onClose, onSave }) {
  const { handleSetUserAccess } = useApp();

  const [form, setForm] = useState(user
    ? { ...user }
    : { name: "", email: "", active: true, role: "user" }
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Read styles at render time — reactive to theme
  const inputStyle = getInputStyle();
  const labelStyle = getLabelStyle();

  // Build initial access map from project arrays
  const email = user?.email || "";
  const initialAccess = {};
  for (const p of projects) {
    if ((p.writeUsers || []).includes(email))     initialAccess[p._fid] = "write";
    else if ((p.readUsers || []).includes(email)) initialAccess[p._fid] = "read";
    else                                           initialAccess[p._fid] = "none";
  }
  const [access, setAccess] = useState(initialAccess);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name?.trim())  errs.name  = "Campo obligatorio";
    if (!form.email?.trim()) errs.email = "Campo obligatorio";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    await onSave(form);

    // Apply access changes for existing users
    if (user?._fid) {
      const targetEmail = form.email;
      for (const p of projects) {
        const newLevel = access[p._fid] || "none";
        const current  = (p.writeUsers || []).includes(targetEmail) ? "write"
                       : (p.readUsers  || []).includes(targetEmail) ? "read"
                       : "none";
        if (newLevel !== current) {
          await handleSetUserAccess(p._fid, targetEmail, newLevel);
        }
      }
    }
    setSaving(false);
  }

  const errStyle = { color: C.red, fontSize: 11, marginTop: 3 };
  const fs = (k) => ({ ...inputStyle, ...(errors[k] ? { borderColor: C.red } : {}) });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.panel, borderRadius: 18, border: `1px solid ${C.border2}`, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>
            👤 {user?._fid ? "Editar usuario" : "Nuevo usuario"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Nombre *</label>
          <input value={form.name} onChange={e => set("name", e.target.value)} style={fs("name")} placeholder="Nombre completo" />
          {errors.name && <p style={errStyle}>{errors.name}</p>}

          <label style={{ ...labelStyle, marginTop: 12 }}>Email *</label>
          <input
            value={form.email}
            onChange={e => set("email", e.target.value)}
            style={{ ...fs("email"), ...(user?._fid ? { opacity: 0.6 } : {}) }}
            placeholder="usuario@ejemplo.com"
            disabled={!!user?._fid}
          />
          {errors.email && <p style={errStyle}>{errors.email}</p>}

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Rol</label>
              <select value={form.role || "user"} onChange={e => set("role", e.target.value)} style={inputStyle}>
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Estado</label>
              <select value={form.active === false ? "inactive" : "active"} onChange={e => set("active", e.target.value === "active")} style={inputStyle}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          {/* ── Acceso a proyectos (sólo en edición) ── */}
          {user?._fid && projects.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                🔐 Acceso a proyectos
              </div>
              <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                {projects.map((p, i) => (
                  <div
                    key={p._fid}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px",
                      borderBottom: i < projects.length - 1 ? `1px solid ${C.border}` : "none",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || C.orange, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ flex: 1, fontSize: 12, color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.nombre}
                    </span>
                    <AccessToggle
                      level={access[p._fid] || "none"}
                      onChange={v => setAccess(prev => ({ ...prev, [p._fid]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
            <Btn color={C.border2} onClick={onClose} type="button">Cancelar</Btn>
            <Btn type="submit" disabled={saving}>
              {saving ? "Guardando…" : user?._fid ? "Guardar cambios" : "Crear usuario"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
