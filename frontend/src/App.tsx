import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { AppShell } from "@/components/layout/AppShell";
import { GuestRoute, ProtectedRoute, RoleRoute } from "@/components/layout/guards";
import { LoginPage, RegisterPage } from "@/pages/AuthPages";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { TaskDetailPage } from "@/pages/TaskDetailPage";
import { TasksPage } from "@/pages/TasksPage";
import { UsersPage } from "@/pages/UsersPage";

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="projects/:id" element={<ProjectDetailPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="tasks/:id" element={<TaskDetailPage />} />
                  <Route element={<RoleRoute roles={["Admin"]} />}>
                    <Route path="users" element={<UsersPage />} />
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
