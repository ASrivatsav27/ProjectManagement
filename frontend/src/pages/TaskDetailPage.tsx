import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { tasksApi } from "@/api/services";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_STATUS_LABEL, type ActivityLog, type TaskComment, type TaskPatch, type TaskPriority, type TaskStatus } from "@/api/types";
import { useCurrentUser } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useProject, useTask } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDate, formatDateTime, isOverdue, timeAgo } from "@/lib/format";
import { canChangeTaskStatus, canManageProject } from "@/lib/permissions";
import { ActivityItem, CommentAvatar } from "@/components/ui/Activity";
import { UserChip } from "@/components/ui/Avatar";
import { PriorityLabel, TaskStatusIcon, TaskStatusLabel } from "@/components/ui/Badges";
import { ErrorState, Flash, Spinner } from "@/components/ui/Feedback";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/Modal";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";

type FeedItem = { kind: "comment"; at: string; comment: TaskComment } | { kind: "activity"; at: string; log: ActivityLog };

export function TaskDetailPage() {
  const params = useParams();
  const id = /^\d+$/.test(params.id ?? "") ? Number(params.id) : null;
  const user = useCurrentUser();
  const toast = useToast();
  const navigate = useNavigate();

  const { data: task, error, loading, reload } = useTask(id);
  // The task payload only has the project's id and name; we need the manager and members for permissions and the assignee list.
  const { data: project } = useProject(task?.projectId ?? null);
  useDocumentTitle(task ? `${task.title} · #${task.id}` : undefined);

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  // One chronological timeline of comments and activity, like an issue thread.
  const feed = useMemo<FeedItem[]>(() => {
    if (!task) return [];
    const items: FeedItem[] = [
      ...task.comments.map((item): FeedItem => ({ kind: "comment", at: item.createdAt, comment: item })),
      ...task.activityLogs.map((item): FeedItem => ({ kind: "activity", at: item.createdAt, log: item })),
    ];
    return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [task]);

  if (id === null) return <ErrorState error={new Error("Invalid task ID")} />;
  if (!task && loading) return <Spinner label="Loading task…" />;
  if (!task) return <ErrorState error={error ?? new Error("Task not found")} onRetry={reload} />;

  const archived = project?.archivedAt != null;
  const canManage = !!project && canManageProject(user, project) && !archived;
  const canStatus = !!project && !archived && canChangeTaskStatus(user, task, canManage);
  const overdue = isOverdue(task);

  const update = async (patch: TaskPatch, success: string) => {
    setBusy(true);
    try {
      await tasksApi.update(task.id, patch);
      toast.success(success);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await tasksApi.remove(task.id);
      toast.success("Task deleted");
      navigate(`/projects/${task.projectId}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the task");
      setBusy(false);
      setDeleting(false);
    }
  };

  const postComment = async (event: FormEvent) => {
    event.preventDefault();
    const content = comment.trim();
    if (!content) return;

    setPosting(true);
    try {
      await tasksApi.comment(task.id, content);
      setComment("");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post the comment");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span className="muted">/</span>
        <Link to={`/projects/${task.project.id}`}>{task.project.name}</Link>
        <span className="muted">/</span>
        <span>Task #{task.id}</span>
      </div>

      <div className="page-header">
        <h1 className="grow">
          {task.title} <span className="muted light">#{task.id}</span>
        </h1>
        {canManage && (
          <div className="actions">
            <button className="btn" onClick={() => setEditing(true)}>
              <Icon name="edit" /> Edit
            </button>
            <button className="btn btn-danger-outline" onClick={() => setDeleting(true)}>
              <Icon name="trash" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="issue-meta">
        <span className={`state-pill state-${task.status}`}>
          <TaskStatusIcon status={task.status} /> {TASK_STATUS_LABEL[task.status]}
        </span>
        <span className="muted">
          <strong>{task.assignee?.username ?? "Unassigned"}</strong> · created {timeAgo(task.createdAt)}
        </span>
      </div>

      {archived && <Flash kind="info">This task’s project is archived, so the task is read-only.</Flash>}

      <div className="issue-layout">
        <div className="issue-main">
          <section className="Box">
            <div className="Box-header">
              <strong>Description</strong>
            </div>
            <div className="Box-body">{task.description ? <p className="prewrap">{task.description}</p> : <p className="muted">No description provided.</p>}</div>
          </section>

          <h2 className="section-title">Discussion &amp; activity</h2>
          <ol className="timeline">
            {feed.length === 0 && <li className="muted">Nothing here yet — start the conversation below.</li>}
            {feed.map((item) =>
              item.kind === "activity" ? (
                <li key={`a${item.log.id}`} className="timeline-event">
                  <ul className="activity-list compact">
                    <ActivityItem log={item.log} />
                  </ul>
                </li>
              ) : (
                <li key={`c${item.comment.id}`} className="timeline-comment">
                  <CommentAvatar name={item.comment.author?.username ?? "?"} />
                  <div className="Box comment-box">
                    <div className="Box-header comment-header">
                      <strong>{item.comment.author?.username ?? "Deleted user"}</strong>
                      <span className="muted small" title={formatDateTime(item.comment.createdAt)}>
                        commented {timeAgo(item.comment.createdAt)}
                      </span>
                    </div>
                    <div className="Box-body prewrap">{item.comment.content}</div>
                  </div>
                </li>
              ),
            )}
          </ol>

          <form className="comment-form" onSubmit={postComment}>
            <CommentAvatar name={user.username} />
            <div className="Box comment-box">
              <div className="Box-body">
                <label htmlFor="new-comment" className="sr-only">
                  Add a comment
                </label>
                <textarea id="new-comment" className="form-control" rows={3} placeholder="Leave a comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={5000} />
                <div className="form-actions">
                  <button className="btn btn-primary" disabled={posting || !comment.trim()}>
                    {posting ? "Posting…" : "Comment"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <aside className="issue-side">
          <div className="side-section">
            <h3>Status</h3>
            {canStatus ? (
              <select className="form-control" value={task.status} disabled={busy} onChange={(e) => update({ status: e.target.value as TaskStatus }, "Status updated")} aria-label="Task status">
                {TASK_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {TASK_STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
            ) : (
              <TaskStatusLabel status={task.status} />
            )}
          </div>
          <div className="side-section">
            <h3>Assignee</h3>
            {canManage ? (
              <select className="form-control" value={task.assigneeId ?? ""} disabled={busy} onChange={(e) => update({ assigneeId: e.target.value ? Number(e.target.value) : null }, "Assignee updated")} aria-label="Assignee">
                <option value="">Unassigned</option>
                {project?.members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.username}
                  </option>
                ))}
              </select>
            ) : (
              <UserChip name={task.assignee?.username} />
            )}
          </div>
          <div className="side-section">
            <h3>Priority</h3>
            {canManage ? (
              <select className="form-control" value={task.priority} disabled={busy} onChange={(e) => update({ priority: e.target.value as TaskPriority }, "Priority updated")} aria-label="Priority">
                {TASK_PRIORITIES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            ) : (
              <PriorityLabel priority={task.priority} />
            )}
          </div>
          <div className="side-section">
            <h3>Due date</h3>
            <span className={overdue ? "text-danger" : ""}>
              {task.dueDate ? formatDate(task.dueDate) : <span className="muted">No due date</span>}
              {overdue && " · overdue"}
            </span>
          </div>
          <div className="side-section">
            <h3>Project</h3>
            <Link to={`/projects/${task.project.id}`}>{task.project.name}</Link>
          </div>
          <div className="side-section muted small">
            <div>Created {formatDateTime(task.createdAt)}</div>
            <div>Updated {formatDateTime(task.updatedAt)}</div>
          </div>
        </aside>
      </div>

      {editing && (
        <TaskFormModal
          task={task}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}
      {deleting && <ConfirmDialog title="Delete this task?" message={`“${task.title}” and its comments will be permanently deleted.`} confirmLabel="Delete task" danger busy={busy} onConfirm={remove} onCancel={() => setDeleting(false)} />}
    </div>
  );
}
