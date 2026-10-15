export type Role = "Admin" | "ProjectManager" | "TeamMember";
export type ProjectStatus = "Planning" | "Active" | "OnHold" | "Completed";
export type TaskStatus = "Todo" | "InProgress" | "InReview" | "Done";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export const ROLES: Role[] = ["Admin", "ProjectManager", "TeamMember"];
export const PROJECT_STATUSES: ProjectStatus[] = ["Planning", "Active", "OnHold", "Completed"];
export const TASK_STATUSES: TaskStatus[] = ["Todo", "InProgress", "InReview", "Done"];
export const TASK_PRIORITIES: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

export const ROLE_LABEL: Record<Role, string> = { Admin: "Admin", ProjectManager: "Project Manager", TeamMember: "Team Member" };
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  Planning: "Planning",
  Active: "Active",
  OnHold: "On Hold",
  Completed: "Completed",
};
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  Todo: "To Do",
  InProgress: "In Progress",
  InReview: "In Review",
  Done: "Done",
};

export interface UserSummary {
  id: number;
  username: string;
}

export interface AuthUser extends UserSummary {
  email: string;
  role: Role;
}

export interface DirectoryUser extends AuthUser {
  createdAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  startDate: string | null;
  deadline: string | null;
  status: ProjectStatus;
  archivedAt: string | null;
  createdById: number;
  managerId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListItem extends Project {
  manager: UserSummary | null;
  _count: { members: number; tasks: number };
}

export interface ProjectMemberRow {
  projectId: number;
  userId: number;
  joinedAt: string;
  user: UserSummary & { email?: string };
}

export interface ActivityLog {
  id: number;
  projectId: number;
  taskId: number | null;
  actorId: number | null;
  action: string;
  details: string | null;
  createdAt: string;
  actor: UserSummary | null;
}

export interface ProjectProgress {
  totalTasks: number;
  doneTasks: number;
  completionPercentage: number;
}

export interface ProjectDetail extends Project {
  manager: UserSummary | null;
  members: ProjectMemberRow[];
  activityLogs: ActivityLog[];
  _count: { tasks: number };
  progress: ProjectProgress;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  projectId: number;
  assigneeId: number | null;
  createdById: number;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: number; name: string };
  assignee: UserSummary | null;
}

export interface TaskComment {
  id: number;
  taskId: number;
  authorId: number | null;
  content: string;
  createdAt: string;
  author: UserSummary | null;
}

export interface TaskDetail extends Task {
  comments: TaskComment[];
  activityLogs: ActivityLog[];
}

export interface DashboardSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  projectsByStatus: Record<ProjectStatus, number>;
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  overdueTasks: number;
  myTasks: number;
  projectProgress: { id: number; name: string; completionPercentage: number }[];
}

// ---- request payloads ----
export interface ProjectInput {
  name: string;
  description?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  managerId?: number;
}

export interface ProjectPatch {
  name?: string;
  description?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  status?: ProjectStatus;
  archived?: boolean;
}

export interface TaskInput {
  title: string;
  projectId: number;
  description?: string | null;
  assigneeId?: number | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
}

export type TaskPatch = Partial<Omit<TaskInput, "projectId">>;

export interface TaskQuery {
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "updatedAt" | "dueDate" | "title" | "priority" | "status";
  sortOrder?: "asc" | "desc";
  projectId?: number;
  assigneeId?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
}

export interface ProjectQuery {
  page?: number;
  pageSize?: number;
  status?: ProjectStatus;
  search?: string;
  includeArchived?: boolean;
}
