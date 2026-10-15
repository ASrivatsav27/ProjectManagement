import type { Prisma } from "@prisma/client";

// Reusable "select" and "include" shapes, so the same fields are
// returned everywhere and the API never leaks things like passwords.

// Only these user fields are ever sent to the client.
export const userSummary = { id: true, username: true } satisfies Prisma.UserSelect;

export const projectSummary = { id: true, name: true } satisfies Prisma.ProjectSelect;

// A task always comes with its project name and assignee.
export const taskInclude = {
  project: { select: projectSummary },
  assignee: { select: userSummary },
} satisfies Prisma.TaskInclude;

// Activity history: newest first, last 50 only, with who did it.
export const activityLogArgs = {
  orderBy: { createdAt: "desc" },
  take: 50,
  include: { actor: { select: userSummary } },
} satisfies Prisma.ActivityLogFindManyArgs;
