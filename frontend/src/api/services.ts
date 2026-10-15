import { http } from "./client";
import type {
  AuthUser,
  DashboardSummary,
  DirectoryUser,
  Paginated,
  ProjectDetail,
  ProjectInput,
  ProjectListItem,
  ProjectMemberRow,
  ProjectPatch,
  ProjectQuery,
  Role,
  Task,
  TaskComment,
  TaskDetail,
  TaskInput,
  TaskPatch,
  TaskQuery,
} from "./types";

interface One<T> {
  data: T;
  message?: string;
}

export const authApi = {
  me: (signal?: AbortSignal) => http.get<One<AuthUser>>("/users/me", { signal, silent401: true }).then((r) => r.data),
  login: (email: string, password: string) =>
    http.post<{ safeUser: AuthUser }>("/auth/login", { email, password }, { silent401: true }).then((r) => r.safeUser),
  register: (username: string, email: string, password: string) =>
    http.post<{ safeUser: AuthUser }>("/auth/register", { username, email, password }, { silent401: true }).then((r) => r.safeUser),
  logout: () => http.post<{ message: string }>("/auth/logout"),
};

export const usersApi = {
  list: (signal?: AbortSignal) => http.get<{ data: DirectoryUser[] }>("/users", { signal }).then((r) => r.data),
  setRole: (userId: number, role: Role) =>
    http.patch<{ user: Pick<DirectoryUser, "id" | "email" | "username" | "role"> }>(`/admin/users/${userId}/role`, { role }),
};

export const projectsApi = {
  list: (query: ProjectQuery, signal?: AbortSignal) => http.get<Paginated<ProjectListItem>>("/projects", { query, signal }),
  get: (id: number, signal?: AbortSignal) => http.get<One<ProjectDetail>>(`/projects/${id}`, { signal }).then((r) => r.data),
  create: (input: ProjectInput) => http.post<One<ProjectListItem>>("/projects", input).then((r) => r.data),
  update: (id: number, patch: ProjectPatch) => http.patch<One<ProjectListItem>>(`/projects/${id}`, patch).then((r) => r.data),
  setMembers: (id: number, userIds: number[]) =>
    http.put<One<ProjectMemberRow[]>>(`/projects/${id}/members`, { userIds }).then((r) => r.data),
  remove: (id: number) => http.delete<{ message: string }>(`/projects/${id}`),
};

export const tasksApi = {
  list: (query: TaskQuery, signal?: AbortSignal) => http.get<Paginated<Task>>("/tasks", { query, signal }),
  get: (id: number, signal?: AbortSignal) => http.get<One<TaskDetail>>(`/tasks/${id}`, { signal }).then((r) => r.data),
  create: (input: TaskInput) => http.post<One<Task>>("/tasks", input).then((r) => r.data),
  update: (id: number, patch: TaskPatch) => http.patch<One<Task>>(`/tasks/${id}`, patch).then((r) => r.data),
  remove: (id: number) => http.delete<{ message: string }>(`/tasks/${id}`),
  comment: (id: number, content: string) => http.post<One<TaskComment>>(`/tasks/${id}/comments`, { content }).then((r) => r.data),
};

export const dashboardApi = {
  summary: (signal?: AbortSignal) => http.get<One<DashboardSummary>>("/dashboard/summary", { signal }).then((r) => r.data),
};
