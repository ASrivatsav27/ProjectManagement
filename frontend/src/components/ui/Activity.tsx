import type { ActivityLog } from "@/api/types";
import { formatDateTime, timeAgo } from "@/lib/format";
import { Avatar } from "./Avatar";
import { Icon, type IconName } from "./Icon";

const ACTION_ICON: Record<string, IconName> = {
  "project.created": "folder",
  "project.updated": "edit",
  "project.archived": "archive",
  "project.restored": "refresh",
  "project.members_updated": "users",
  "task.created": "plus",
  "task.status_changed": "circle-half",
  "task.assigned": "user",
  "task.updated": "edit",
  "task.deleted": "trash",
};

export function ActivityItem({ log }: { log: ActivityLog }) {
  return (
    <li className="activity-item">
      <span className="activity-icon">
        <Icon name={ACTION_ICON[log.action] ?? "activity"} size={14} />
      </span>
      <div>
        <div>
          <strong>{log.actor?.username ?? "Someone"}</strong> <span className="muted">{log.details ?? log.action}</span>
        </div>
        <time className="muted small" dateTime={log.createdAt} title={formatDateTime(log.createdAt)}>
          {timeAgo(log.createdAt)}
        </time>
      </div>
    </li>
  );
}

export function ActivityList({ logs, emptyText = "No activity yet." }: { logs: ActivityLog[]; emptyText?: string }) {
  if (logs.length === 0) return <p className="muted pad">{emptyText}</p>;

  return (
    <ul className="activity-list">
      {logs.map((log) => (
        <ActivityItem key={log.id} log={log} />
      ))}
    </ul>
  );
}

export function CommentAvatar({ name }: { name: string }) {
  return <Avatar name={name} size={32} />;
}
