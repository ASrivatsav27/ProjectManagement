import { useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { TASK_STATUSES, TASK_STATUS_LABEL, type Task, type TaskStatus } from "@/api/types";
import { formatDate, isOverdue } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { PriorityLabel, TaskStatusIcon } from "@/components/ui/Badges";

interface Props {
  tasks: Task[];
  /** Whether the current user may move this task (managers: any; assignees: their own). */
  canMove: (task: Task) => boolean;
  onMove: (task: Task, status: TaskStatus) => void;
}

export function KanbanBoard({ tasks, canMove, onMove }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  const drop = (event: DragEvent, status: TaskStatus) => {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/plain"));
    const task = tasks.find((candidate) => candidate.id === id);

    setDragging(null);
    setOverColumn(null);
    if (task && task.status !== status) onMove(task, status);
  };

  return (
    <div className="kanban" role="list">
      {TASK_STATUSES.map((status) => {
        const column = tasks.filter((task) => task.status === status);

        return (
          <section
            key={status}
            role="listitem"
            aria-label={TASK_STATUS_LABEL[status]}
            className={`kanban-column${overColumn === status ? " is-over" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setOverColumn(status);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setOverColumn(null);
            }}
            onDrop={(event) => drop(event, status)}
          >
            <header className="kanban-column-header">
              <TaskStatusIcon status={status} />
              <strong>{TASK_STATUS_LABEL[status]}</strong>
              <span className="Counter">{column.length}</span>
            </header>
            <div className="kanban-cards">
              {column.map((task) => {
                const movable = canMove(task);
                const overdue = isOverdue(task);

                return (
                  <article
                    key={task.id}
                    className={`kanban-card${dragging === task.id ? " is-dragging" : ""}${movable ? " is-movable" : ""}`}
                    draggable={movable}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", String(task.id));
                      event.dataTransfer.effectAllowed = "move";
                      setDragging(task.id);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setOverColumn(null);
                    }}
                  >
                    <div className="kanban-card-title">
                      {movable && <Icon name="grip" size={14} className="grip" />}
                      <Link to={`/tasks/${task.id}`} className="link-title">
                        {task.title}
                      </Link>
                    </div>
                    <div className="kanban-card-meta">
                      <span className="muted small">#{task.id}</span>
                      <PriorityLabel priority={task.priority} />
                      {task.dueDate && (
                        <span className={`small ${overdue ? "text-danger" : "muted"}`}>
                          <Icon name="calendar" size={12} /> {formatDate(task.dueDate)}
                        </span>
                      )}
                      <span className="grow" />
                      {task.assignee && <Avatar name={task.assignee.username} size={20} />}
                    </div>
                    {movable && (
                      // Native drag-and-drop does not work on touch screens or with a keyboard, so every card also has a menu.
                      <select className="form-control kanban-move" value={task.status} onChange={(event) => onMove(task, event.target.value as TaskStatus)} aria-label={`Move task ${task.title}`}>
                        {TASK_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {TASK_STATUS_LABEL[value]}
                          </option>
                        ))}
                      </select>
                    )}
                  </article>
                );
              })}
              {column.length === 0 && <p className="muted small kanban-empty">No tasks</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
