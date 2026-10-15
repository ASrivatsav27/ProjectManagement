import type { Prisma } from "@prisma/client";

// The kinds of events we record in the activity history.
export type ActivityAction =
  | "project.created"
  | "project.updated"
  | "project.archived"
  | "project.restored"
  | "project.members_updated"
  | "task.created"
  | "task.updated"
  | "task.status_changed"
  | "task.assigned"
  | "task.deleted";

type ActivityEntry = {
  action: ActivityAction;
  projectId: number;
  actorId: number;
  taskId?: number | null;
  details?: string | null;
};


// Saves one row in the activity history.
// Pass the transaction client (tx), so the log is saved together with the change.
// If the change fails and rolls back, the log row rolls back too.
export function logActivity(db: Prisma.TransactionClient, entry: ActivityEntry) {
  return db.activityLog.create({
    data: {
      action: entry.action,
      projectId: entry.projectId,
      actorId: entry.actorId,
      taskId: entry.taskId ?? null,
      details: entry.details ?? null,
    },
  });
}
