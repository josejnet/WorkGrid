import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider, useApp } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useMobile } from "./lib/useMobile";
import { C } from "./lib/theme";

import Loader            from "./components/ui/Loader";
import ErrorBoundary     from "./components/ui/ErrorBoundary";
import ScrollToTop       from "./components/ui/ScrollToTop";
import Sidebar           from "./components/layout/Sidebar";
import LoginScreen       from "./modules/auth/LoginScreen";
import AccesoPendiente   from "./modules/auth/AccesoPendiente";
import Dashboard         from "./modules/dashboard/Dashboard";
import ProjectsView      from "./modules/projects/ProjectsView";
import ProjectModal      from "./modules/projects/ProjectModal";
import ProjectDetail     from "./modules/tasks/ProjectDetail";
import Settings          from "./modules/settings/Settings";

// ── Inner shell (needs context) ───────────────────────────────────────────────
function Shell() {
  const { authUser, session, loaded, isAdmin, loginWithGoogle, loginWithEmailPassword, handleSaveProject } = useApp();
  const [projectModal,   setProjectModal]   = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const isMobile     = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authUser === undefined)    return <Loader />;
  if (!authUser)                 return <LoginScreen onLogin={loginWithGoogle} onEmailLogin={loginWithEmailPassword} />;
  if (session?.active === false) return <AccesoPendiente />;
  if (!session || !loaded)       return <Loader />;

  async function handleSave(data) {
    await handleSaveProject(data);
    setProjectModal(false);
    setEditingProject(null);
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter',sans-serif", color: C.text, display: "flex" }}>
      <Sidebar
        onNewProject={() => { setEditingProject(null); setProjectModal(true); }}
        isMobile={isMobile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* hamburger — mobile only */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 15,
            background: C.panel, border: `1px solid ${C.border2}`,
            borderRadius: 8, padding: "6px 10px", cursor: "pointer",
            color: C.text, fontSize: 18, lineHeight: 1,
          }}
        >
          ☰
        </button>
      )}

      <div style={{ marginLeft: isMobile ? 0 : 220, flex: 1, minHeight: "100vh" }}>
        <Routes>
          <Route path="/"             element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/projects"     element={<ProjectsView />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          {isAdmin && <Route path="/settings" element={<Settings />} />}
          <Route path="*"             element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>

      <ScrollToTop />

      {projectModal && (
        <ProjectModal
          proyecto={editingProject}
          onClose={() => { setProjectModal(false); setEditingProject(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <ErrorBoundary>
              <Shell />
            </ErrorBoundary>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
