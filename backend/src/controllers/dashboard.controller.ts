import { ProjectStatus, TaskStatus, type Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { currentUser, visibleProjectsFilter } from "../utils/access.js";


// Makes an object like { Todo: 0, InProgress: 0, InReview: 0, Done: 0 }
// so every status always appears in the response, even with zero tasks.
function zeroCounts<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}


// GET /api/dashboard/summary
// All numbers are counted by the database, nothing is hardcoded.
export async function getDashboardSummaryController(req: Request, res: Response) {
  const user = currentUser(req);

  // Only count projects the user can see, and skip archived ones.
  const projectWhere: Prisma.ProjectWhereInput = { AND: [visibleProjectsFilter(user), { archivedAt: null }] };

  // Only count tasks that belong to those projects.
  const taskWhere: Prisma.TaskWhereInput = { project: projectWhere };

  // Five queries, run at the same time.
  const [projectGroups, projects, taskGroups, overdueTasks, myTasks] = await Promise.all([
    // How many projects per status.
    prisma.project.groupBy({ by: ["status"], where: projectWhere, _count: { _all: true } }),

    // Project names, for the completion list.
    prisma.project.findMany({ where: projectWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),

    // How many tasks per project and per status.
    prisma.task.groupBy({ by: ["projectId", "status"], where: taskWhere, _count: { _all: true } }),

    // Tasks past their due date that are not done.
    prisma.task.count({
      where: { AND: [taskWhere, { dueDate: { lt: new Date() }, status: { not: TaskStatus.Done } }] },
    }),

    // Tasks assigned to the logged-in user.
    prisma.task.count({ where: { AND: [taskWhere, { assigneeId: user.id }] } }),
  ]);

  // Projects per status.
  const projectsByStatus = zeroCounts(Object.values(ProjectStatus));

  for (const group of projectGroups) {
    projectsByStatus[group.status] += group._count._all;
  }

  // Tasks per status overall, and total / done tasks for each project.
  const tasksByStatus = zeroCounts(Object.values(TaskStatus));
  const perProject = new Map<number, { total: number; done: number }>();

  for (const group of taskGroups) {
    const count = group._count._all;

    tasksByStatus[group.status] += count;

    const entry = perProject.get(group.projectId) ?? { total: 0, done: 0 };

    entry.total += count;
    if (group.status === TaskStatus.Done) entry.done += count;

    perProject.set(group.projectId, entry);
  }

  const totalProjects = projects.length;
  const totalTasks = Object.values(tasksByStatus).reduce((sum, count) => sum + count, 0);

  return res.status(200).json({
    data: {
      totalProjects,
      activeProjects: projectsByStatus.Active,
      completedProjects: projectsByStatus.Completed,
      projectsByStatus,
      totalTasks,
      tasksByStatus,
      overdueTasks,
      myTasks,

      // Completion % per project = done tasks / all tasks.
      projectProgress: projects.map((project) => {
        const progress = perProject.get(project.id);

        return {
          id: project.id,
          name: project.name,
          completionPercentage: progress?.total ? Math.round((progress.done / progress.total) * 100) : 0,
        };
      }),
    },
  });
}
