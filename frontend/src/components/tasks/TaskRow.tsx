import { Link } from "react-router-dom";
import type { Task } from "@/api/types";
import { formatDate, isOverdue, timeAgo } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { PriorityLabel, TaskStatusIcon, TaskStatusLabel } from "@/components/ui/Badges";

export function TaskRow({ task, showProject = true }: { task: Task; showProject?: boolean }) {
  const overdue = isOverdue(task);

  return (
    <li className="Box-row task-row">
      <span className="task-row-icon">
        <TaskStatusIcon status={task.status} />
      </span>
      <div className="grow">
        <div className="task-row-title">
          <Link to={`/tasks/${task.id}`} className="link-title">
            {task.title}
          </Link>
          <PriorityLabel priority={task.priority} />
          <TaskStatusLabel status={task.status} />
        </div>
        <div className="meta">
          <span>#{task.id}</span>
          {showProject && (
            <Link to={`/projects/${task.project.id}`} className="link-muted">
              {task.project.name}
            </Link>
          )}
          <span>{task.assignee ? `assigned to ${task.assignee.username}` : "unassigned"}</span>
          {task.dueDate && (
            <span className={overdue ? "text-danger" : ""}>
              <Icon name="calendar" size={12} /> {overdue ? "Overdue · " : "Due "}
              {formatDate(task.dueDate)}
            </span>
          )}
          <span>updated {timeAgo(task.updatedAt)}</span>
        </div>
      </div>
    </li>
  );
}
