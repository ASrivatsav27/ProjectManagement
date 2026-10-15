import type { AuthUser, Project, Task } from "@/api/types";

// These mirror the backend rules (utils/access.ts) so the UI only offers actions the API will accept.
// The backend remains the source of truth - these helpers never replace server-side checks.

export const isAdmin = (user: AuthUser | null) => user?.role === "Admin";

export const canCreateProject = (user: AuthUser | null) => user?.role === "Admin" || user?.role === "ProjectManager";

export const canManageProject = (user: AuthUser | null, project: Pick<Project, "managerId">) =>
  !!user && (user.role === "Admin" || (user.role === "ProjectManager" && project.managerId === user.id));

export const canDeleteProject = isAdmin;

/** Managers can change anything; an assignee can change only the status of their own task. */
export const canChangeTaskStatus = (user: AuthUser | null, task: Pick<Task, "assigneeId">, canManage: boolean) =>
  !!user && (canManage || task.assigneeId === user.id);
