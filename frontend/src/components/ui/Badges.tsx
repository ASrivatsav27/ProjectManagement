import {
  PROJECT_STATUS_LABEL,
  ROLE_LABEL,
  TASK_STATUS_LABEL,
  type ProjectStatus,
  type Role,
  type TaskPriority,
  type TaskStatus,
} from "@/api/types";
import { Icon } from "./Icon";

const PROJECT_TONE: Record<ProjectStatus, string> = { Planning: "attention", Active: "success", OnHold: "neutral", Completed: "done" };
const TASK_TONE: Record<TaskStatus, string> = { Todo: "neutral", InProgress: "attention", InReview: "accent", Done: "done" };
const PRIORITY_TONE: Record<TaskPriority, string> = { Low: "neutral", Medium: "accent", High: "attention", Critical: "danger" };

export const ProjectStatusLabel = ({ status }: { status: ProjectStatus }) => (
  <span className={`Label Label-${PROJECT_TONE[status]}`}>{PROJECT_STATUS_LABEL[status]}</span>
);

export const TaskStatusLabel = ({ status }: { status: TaskStatus }) => (
  <span className={`Label Label-${TASK_TONE[status]}`}>{TASK_STATUS_LABEL[status]}</span>
);

export const PriorityLabel = ({ priority }: { priority: TaskPriority }) => (
  <span className={`Label Label-${PRIORITY_TONE[priority]}`}>{priority}</span>
);

export const RoleLabel = ({ role }: { role: Role }) => (
  <span className={`Label Label-${role === "Admin" ? "danger" : role === "ProjectManager" ? "accent" : "neutral"}`}>{ROLE_LABEL[role]}</span>
);

export const ArchivedLabel = () => <span className="Label Label-neutral">Archived</span>;

/** Issue-style status glyph used at the start of task rows. */
export function TaskStatusIcon({ status }: { status: TaskStatus }) {
  const config: Record<TaskStatus, { name: "circle" | "circle-dot" | "circle-half" | "check-circle"; color: string }> = {
    Todo: { name: "circle", color: "var(--fg-muted)" },
    InProgress: { name: "circle-dot", color: "var(--attention)" },
    InReview: { name: "circle-half", color: "var(--accent)" },
    Done: { name: "check-circle", color: "var(--done)" },
  };
  const { name, color } = config[status];

  return <Icon name={name} size={16} style={{ color }} aria-label={TASK_STATUS_LABEL[status]} />;
}
