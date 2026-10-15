import { Link } from "react-router-dom";
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from "@/api/types";
import { useCurrentUser } from "@/context/AuthContext";
import { useDashboard, useTasks } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ErrorState, Spinner } from "@/components/ui/Feedback";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/Progress";
import { TaskRow } from "@/components/tasks/TaskRow";

const STATUS_COLOR: Record<TaskStatus, string> = {
  Todo: "var(--fg-subtle)",
  InProgress: "var(--attention)",
  InReview: "var(--accent)",
  Done: "var(--done)",
};

function Stat({ icon, label, value, to, tone }: { icon: IconName; label: string; value: number; to: string; tone?: "danger" }) {
  return (
    <Link to={to} className="stat Box">
      <Icon name={icon} size={20} className={tone === "danger" && value > 0 ? "text-danger" : "muted"} />
      <div>
        <div className={`stat-value${tone === "danger" && value > 0 ? " text-danger" : ""}`}>{value}</div>
        <div className="muted small">{label}</div>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  useDocumentTitle("Dashboard");
  const user = useCurrentUser();
  const { data, error, loading, reload } = useDashboard();
  const { data: mine } = useTasks({ assigneeId: user.id, pageSize: 6, sortBy: "dueDate", sortOrder: "asc" }, { pollMs: 30000 });

  if (!data && loading) return <Spinner label="Loading dashboard…" />;
  if (!data) return <ErrorState error={error ?? new Error("No data")} onRetry={reload} />;

  const statusTotal = Math.max(1, data.totalTasks);
  const openMine = (mine?.data ?? []).filter((task) => task.status !== "Done");

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user.username}</h1>
      </div>

      <div className="stat-grid">
        <Stat icon="folder" label="Total projects" value={data.totalProjects} to="/projects" />
        <Stat icon="activity" label="Active projects" value={data.activeProjects} to="/projects?status=Active" />
        <Stat icon="check-circle" label="Completed projects" value={data.completedProjects} to="/projects?status=Completed" />
        <Stat icon="circle-dot" label="Total tasks" value={data.totalTasks} to="/tasks" />
        <Stat icon="alert" label="Overdue tasks" value={data.overdueTasks} to="/tasks" tone="danger" />
        <Stat icon="user" label="Assigned to me" value={data.myTasks} to="/tasks?assignee=me" />
      </div>

      <div className="grid-2">
        <section className="Box">
          <div className="Box-header">
            <strong>Tasks by status</strong>
          </div>
          <div className="Box-body">
            {data.totalTasks === 0 ? (
              <p className="muted">No tasks yet.</p>
            ) : (
              <div className="stack-bar" role="img" aria-label={TASK_STATUSES.map((s) => `${TASK_STATUS_LABEL[s]}: ${data.tasksByStatus[s]}`).join(", ")}>
                {TASK_STATUSES.map((status) => (
                  <span key={status} style={{ width: `${(data.tasksByStatus[status] / statusTotal) * 100}%`, background: STATUS_COLOR[status] }} />
                ))}
              </div>
            )}
            <ul className="legend">
              {TASK_STATUSES.map((status) => (
                <li key={status}>
                  <Link to={`/tasks?status=${status}`}>
                    <span className="dot" style={{ background: STATUS_COLOR[status] }} />
                    <strong>{TASK_STATUS_LABEL[status]}</strong>
                    <span className="muted">{data.tasksByStatus[status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="Box">
          <div className="Box-header">
            <strong>Project completion</strong>
          </div>
          {data.projectProgress.length === 0 ? (
            <p className="muted pad">No projects yet.</p>
          ) : (
            <ul className="Box-list">
              {data.projectProgress.map((project) => (
                <li key={project.id} className="Box-row progress-row">
                  <Link to={`/projects/${project.id}`} className="link-title grow">
                    {project.name}
                  </Link>
                  <div className="progress-cell">
                    <ProgressBar value={project.completionPercentage} label={`${project.name} completion`} />
                    <span className="small muted">{project.completionPercentage}%</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="Box">
        <div className="Box-header">
          <strong>My open tasks</strong>
          <Link to="/tasks?assignee=me" className="small">
            View all
          </Link>
        </div>
        {openMine.length === 0 ? <p className="muted pad">Nothing assigned to you right now. 🎉</p> : <ul className="Box-list">{openMine.map((task) => <TaskRow key={task.id} task={task} />)}</ul>}
      </section>
    </div>
  );
}
