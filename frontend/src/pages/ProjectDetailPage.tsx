import { useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { projectsApi, tasksApi } from "@/api/services";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL, TASK_STATUS_LABEL, type ProjectDetail, type ProjectStatus, type Task, type TaskStatus } from "@/api/types";
import { useCurrentUser } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useProject, useTasks } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDate, timeAgo } from "@/lib/format";
import { canChangeTaskStatus, canDeleteProject, canManageProject } from "@/lib/permissions";
import { ActivityList } from "@/components/ui/Activity";
import { UserChip } from "@/components/ui/Avatar";
import { ArchivedLabel, ProjectStatusLabel } from "@/components/ui/Badges";
import { EmptyState, ErrorState, Flash, Spinner } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/Progress";
import { MembersModal } from "@/components/projects/MembersModal";
import { ProjectFormModal } from "@/components/projects/ProjectFormModal";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { TaskListView } from "@/components/tasks/TaskListView";

type Tab = "tasks" | "board" | "team" | "activity";
const TABS: { id: Tab; label: string; icon: "list" | "columns" | "users" | "activity" }[] = [
  { id: "tasks", label: "Tasks", icon: "list" },
  { id: "board", label: "Board", icon: "columns" },
  { id: "team", label: "Team", icon: "users" },
  { id: "activity", label: "Activity", icon: "activity" },
];

export function ProjectDetailPage() {
  const params = useParams();
  const id = /^\d+$/.test(params.id ?? "") ? Number(params.id) : null;
  const user = useCurrentUser();
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();

  const { data: project, error, loading, reload } = useProject(id);
  useDocumentTitle(project?.name);

  const [editing, setEditing] = useState(false);
  const [managingTeam, setManagingTeam] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "archive" | null>(null);
  const [busy, setBusy] = useState(false);
  const [taskListKey, setTaskListKey] = useState(0);

  const tab = (TABS.find((candidate) => candidate.id === search.get("tab"))?.id ?? "tasks") as Tab;

  if (id === null) return <ErrorState error={new Error("Invalid project ID")} />;
  if (!project && loading) return <Spinner label="Loading project…" />;
  if (!project) return <ErrorState error={error ?? new Error("Project not found")} onRetry={reload} />;

  const canManage = canManageProject(user, project);
  const archived = project.archivedAt !== null;

  const run = async (action: () => Promise<unknown>, success: string, after?: () => void) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      after?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const changeStatus = (status: ProjectStatus) => run(() => projectsApi.update(project.id, { status }), `Status set to ${PROJECT_STATUS_LABEL[status]}`, reload);
  const toggleArchive = () => run(() => projectsApi.update(project.id, { archived: !archived }), archived ? "Project restored" : "Project archived", reload);
  const remove = () => run(() => projectsApi.remove(project.id), "Project deleted", () => navigate("/projects", { replace: true }));

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span className="muted">/</span>
        <strong>{project.name}</strong>
        <ProjectStatusLabel status={project.status} />
        {archived && <ArchivedLabel />}
      </div>

      {archived && (
        <Flash kind="info">
          This project is archived. Its tasks are read-only{canManage ? " until you restore it" : ""}.
        </Flash>
      )}

      <div className="page-header project-header">
        <div className="grow">
          <h1>{project.name}</h1>
          {project.description && <p className="muted description">{project.description}</p>}
        </div>
        {canManage && (
          <div className="actions">
            <button className="btn" onClick={() => setEditing(true)}>
              <Icon name="edit" /> Edit
            </button>
            <button className="btn" onClick={() => (archived ? toggleArchive() : setConfirm("archive"))} disabled={busy}>
              <Icon name="archive" /> {archived ? "Restore" : "Archive"}
            </button>
            {canDeleteProject(user) && (
              <button className="btn btn-danger-outline" onClick={() => setConfirm("delete")}>
                <Icon name="trash" /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div className="Box summary-box">
        <div className="summary-item">
          <span className="muted small">Progress</span>
          <div className="progress-cell wide">
            <ProgressBar value={project.progress.completionPercentage} label="Project completion" />
            <strong>{project.progress.completionPercentage}%</strong>
          </div>
          <span className="muted small">
            {project.progress.doneTasks} of {project.progress.totalTasks} tasks done
          </span>
        </div>
        <div className="summary-item">
          <span className="muted small">Manager</span>
          <UserChip name={project.manager?.username} />
        </div>
        <div className="summary-item">
          <span className="muted small">Start</span>
          <strong>{formatDate(project.startDate)}</strong>
        </div>
        <div className="summary-item">
          <span className="muted small">Deadline</span>
          <strong>{formatDate(project.deadline)}</strong>
        </div>
        <div className="summary-item">
          <span className="muted small">Status</span>
          {canManage && !archived ? (
            <select className="form-control form-control-sm" value={project.status} onChange={(e) => changeStatus(e.target.value as ProjectStatus)} disabled={busy} aria-label="Project status">
              {PROJECT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {PROJECT_STATUS_LABEL[value]}
                </option>
              ))}
            </select>
          ) : (
            <ProjectStatusLabel status={project.status} />
          )}
        </div>
      </div>

      <nav className="underline-nav" aria-label="Project sections">
        {TABS.map((item) => (
          <button key={item.id} className={tab === item.id ? "selected" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => setSearch({ tab: item.id }, { replace: true })}>
            <Icon name={item.icon} /> {item.label}
            {item.id === "tasks" && <span className="Counter">{project._count.tasks}</span>}
            {item.id === "team" && <span className="Counter">{project.members.length}</span>}
          </button>
        ))}
        {canManage && !archived && (
          <button className="btn btn-primary btn-sm nav-action" onClick={() => setCreatingTask(true)}>
            <Icon name="plus" size={14} /> New task
          </button>
        )}
      </nav>

      {tab === "tasks" && <TaskListView key={taskListKey} projectId={project.id} assignees={project.members.map((member) => member.user)} />}
      {tab === "board" && <BoardTab project={project} canManage={canManage} />}
      {tab === "team" && <TeamTab project={project} canManage={canManage && !archived} onManage={() => setManagingTeam(true)} />}
      {tab === "activity" && (
        <div className="Box">
          <div className="Box-header">
            <strong>Recent activity</strong>
          </div>
          <ActivityList logs={project.activityLogs} />
        </div>
      )}

      {editing && (
        <ProjectFormModal
          project={project}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}
      {managingTeam && (
        <MembersModal
          project={project}
          onClose={() => setManagingTeam(false)}
          onSaved={() => {
            setManagingTeam(false);
            reload();
            setTaskListKey((n) => n + 1);
          }}
        />
      )}
      {creatingTask && (
        <TaskFormModal
          projectId={project.id}
          onClose={() => setCreatingTask(false)}
          onSaved={(task) => {
            setCreatingTask(false);
            navigate(`/tasks/${task.id}`);
          }}
        />
      )}
      {confirm === "archive" && (
        <ConfirmDialog title="Archive this project?" message="Archived projects are hidden from lists and their tasks become read-only. You can restore it later." confirmLabel="Archive project" busy={busy} onConfirm={toggleArchive} onCancel={() => setConfirm(null)} />
      )}
      {confirm === "delete" && (
        <ConfirmDialog title="Delete this project?" message={`“${project.name}” and all of its tasks, comments and activity will be permanently deleted. This cannot be undone.`} confirmLabel="Delete project" danger busy={busy} onConfirm={remove} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

function TeamTab({ project, canManage, onManage }: { project: ProjectDetail; canManage: boolean; onManage: () => void }) {
  return (
    <div className="Box">
      <div className="Box-header">
        <strong>Team members</strong>
        {canManage && (
          <button className="btn btn-sm" onClick={onManage}>
            <Icon name="users" size={14} /> Manage team
          </button>
        )}
      </div>
      {project.members.length === 0 ? (
        <EmptyState icon="users" title="No team members yet" />
      ) : (
        <ul className="Box-list">
          {project.members.map((member) => (
            <li key={member.userId} className="Box-row member-row">
              <UserChip name={member.user.username} />
              {member.userId === project.managerId && <span className="Label Label-accent">Manager</span>}
              <span className="muted small grow">{member.user.email}</span>
              <span className="muted small">Joined {timeAgo(member.joinedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BoardTab({ project, canManage }: { project: ProjectDetail; canManage: boolean }) {
  const user = useCurrentUser();
  const toast = useToast();
  const archived = project.archivedAt !== null;
  const inFlight = useRef(0);

  // The backend caps pageSize at 100, which is plenty for one board.
  const { data, error, loading, reload, setData } = useTasks({ projectId: project.id, pageSize: 100, sortBy: "updatedAt", sortOrder: "desc" }, { pollMs: 15000, shouldPoll: () => inFlight.current === 0 });

  const canMove = (task: Task) => !archived && canChangeTaskStatus(user, task, canManage);

  const move = async (task: Task, status: TaskStatus) => {
    if (task.status === status) return;
    const previous = task.status;

    // Optimistic update: the card jumps immediately, then we confirm with the server.
    const apply = (next: TaskStatus) => setData((page) => ({ ...page, data: page.data.map((item) => (item.id === task.id ? { ...item, status: next } : item)) }));
    apply(status);
    inFlight.current++;

    try {
      await tasksApi.update(task.id, { status });
      toast.success(`Moved to ${TASK_STATUS_LABEL[status]}`);
    } catch (err) {
      apply(previous);
      toast.error(err instanceof Error ? err.message : "Could not move the task");
    } finally {
      inFlight.current--;
    }
  };

  if (!data && loading) return <Spinner label="Loading board…" />;
  if (!data) return <ErrorState error={error ?? new Error("No data")} onRetry={reload} />;

  return (
    <div>
      <p className="muted small board-hint">
        {canManage ? "Drag cards between columns to change their status." : "Drag your own tasks between columns to update their status."} The board refreshes automatically.
      </p>
      {data.pagination.total > data.data.length && <Flash kind="info">Showing the {data.data.length} most recently updated of {data.pagination.total} tasks.</Flash>}
      <KanbanBoard tasks={data.data} canMove={canMove} onMove={move} />
    </div>
  );
}

