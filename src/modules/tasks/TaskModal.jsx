import { useEffect, useRef, useState } from "react";
import { C } from "../../lib/theme";
import { getInputStyle, getLabelStyle } from "../../lib/styles";
import { TAREA_VACIA, TALLER_TIPOS, TALLER_PRIOS, TALLER_ESTADOS } from "../../lib/constants";
import Btn from "../../components/ui/Btn";

function ThemedSelect({ value, onChange, options, style, placeholder = "— Seleccionar" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          ...style,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ marginLeft: 8, color: C.muted, fontSize: 12, lineHeight: 1 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 40,
            borderRadius: 8,
            border: `1px solid ${C.border2}`,
            background: C.panel,
            boxShadow: "0 8px 18px rgba(0,0,0,0.2)",
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {options.map(opt => {
            const active = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: "100%",
                  background: active ? C.blue + "22" : "transparent",
                  color: active ? C.blue : C.text,
                  border: "none",
                  borderBottom: `1px solid ${C.border}`,
                  padding: "8px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TaskModal({ tarea, session, users, project, projectId, onClose, onSave }) {
  const today = new Date().toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState(tarea ? { ...tarea } : {
    ...TAREA_VACIA,
    responsable: session?.email || "",
    fechaInicio: today,
    plazo: today,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Read styles at render time — reactive to theme
  const inputStyle = getInputStyle();
  const labelStyle = getLabelStyle();

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
  };

  const REQUIRED = ["titulo", "problema", "solucion", "tipo", "prioridad", "estado", "responsable", "fechaInicio", "plazo"];

  function validate() {
    const errs = {};
    REQUIRED.forEach(k => { if (!form[k] || !String(form[k]).trim()) errs[k] = "Campo obligatorio"; });
    if (form.plazo) {
      if (form.plazo < today) {
        errs.plazo = "El plazo no puede ser anterior a hoy";
      } else if (form.plazo > maxDate) {
        errs.plazo = "El plazo no puede superar los 365 días desde hoy";
      }
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  }

  const row      = { display: "flex", gap: 12 };
  const half     = { flex: 1 };
  const errStyle = { color: C.red, fontSize: 11, marginTop: 3, marginBottom: 0 };
  const fs       = (k) => ({ ...inputStyle, ...(errors[k] ? { borderColor: C.red } : {}) });

  // Admins (role=admin) and the current session user are always eligible,
  // regardless of per-project writeUsers (their assignment bypasses the check).
  const eligible = (users || []).filter(u =>
    u.active !== false && (
      (project?.writeUsers || []).includes(u.email) ||
      u.role === "admin" ||
      u.email === session?.email
    )
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.panel, borderRadius: 18, border: `1px solid ${C.border2}`, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>
            🔧 {tarea?._fid ? "Editar tarea" : "Nueva tarea"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Título *</label>
          <input value={form.titulo} onChange={e => set("titulo", e.target.value)} style={fs("titulo")} placeholder="Descripción breve del problema o mejora" />
          {errors.titulo && <p style={errStyle}>{errors.titulo}</p>}

          <label style={{ ...labelStyle, marginTop: 12 }}>Problema / Contexto *</label>
          <textarea value={form.problema} onChange={e => set("problema", e.target.value)} style={{ ...fs("problema"), minHeight: 72, resize: "vertical" }} placeholder="¿Qué falla o qué se quiere mejorar? ¿Por qué?" />
          {errors.problema && <p style={errStyle}>{errors.problema}</p>}

          <label style={{ ...labelStyle, marginTop: 12 }}>Solución propuesta *</label>
          <textarea value={form.solucion} onChange={e => set("solucion", e.target.value)} style={{ ...fs("solucion"), minHeight: 72, resize: "vertical" }} placeholder="Enfoque técnico o funcional para resolverlo" />
          {errors.solucion && <p style={errStyle}>{errors.solucion}</p>}

          <div style={{ ...row, marginTop: 12 }}>
            <div style={half}>
              <label style={labelStyle}>Tipo *</label>
              <ThemedSelect
                value={form.tipo}
                onChange={v => set("tipo", v)}
                options={TALLER_TIPOS.map(t => ({ value: t, label: t }))}
                style={fs("tipo")}
              />
            </div>
            <div style={half}>
              <label style={labelStyle}>Prioridad *</label>
              <ThemedSelect
                value={form.prioridad}
                onChange={v => set("prioridad", v)}
                options={TALLER_PRIOS.map(p => ({ value: p, label: p }))}
                style={fs("prioridad")}
              />
            </div>
            <div style={half}>
              <label style={labelStyle}>Estado *</label>
              <ThemedSelect
                value={form.estado}
                onChange={v => set("estado", v)}
                options={TALLER_ESTADOS.map(s => ({ value: s, label: s }))}
                style={fs("estado")}
              />
            </div>
          </div>

          <div style={{ ...row, marginTop: 12 }}>
            <div style={half}>
              <label style={labelStyle}>Responsable *</label>
              {eligible.length > 0 ? (
                <ThemedSelect
                  value={form.responsable}
                  onChange={v => set("responsable", v)}
                  options={[
                    { value: "", label: "— Sin asignar" },
                    ...eligible.map(u => ({ value: u.email, label: u.name || u.email })),
                  ]}
                  style={fs("responsable")}
                />
              ) : (
                <input value={form.responsable} onChange={e => set("responsable", e.target.value)} style={fs("responsable")} placeholder="Nombre o email" />
              )}
              {errors.responsable && <p style={errStyle}>{errors.responsable}</p>}
            </div>
            <div style={half}>
              <label style={labelStyle}>Versión</label>
              <input value={form.version ?? ""} onChange={e => set("version", e.target.value)} style={inputStyle} placeholder="Ej: Actual, 1.2.0…" />
            </div>
          </div>

          <div style={{ ...row, marginTop: 12 }}>
            <div style={half}>
              <label style={labelStyle}>Fecha inicio *</label>
              <input type="date" value={form.fechaInicio} onChange={e => set("fechaInicio", e.target.value)} style={fs("fechaInicio")} min={today} max={today} />
              {errors.fechaInicio && <p style={errStyle}>{errors.fechaInicio}</p>}
            </div>
            <div style={half}>
              <label style={labelStyle}>Plazo (deadline) *</label>
              <input type="date" value={form.plazo} onChange={e => set("plazo", e.target.value)} style={fs("plazo")} min={today} max={maxDate} />
              {errors.plazo && <p style={errStyle}>{errors.plazo}</p>}
            </div>
            <div style={half}>
              <label style={labelStyle}>Fecha finalización real</label>
              <input type="date" value={form.fechaFin} onChange={e => set("fechaFin", e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
            <Btn color={C.border2} onClick={onClose} type="button">Cancelar</Btn>
            <Btn type="submit" disabled={saving}>
              {saving ? "Guardando…" : tarea?._fid ? "Guardar cambios" : "Crear tarea"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
