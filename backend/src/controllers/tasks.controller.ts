import { TaskPriority, TaskStatus, type Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { canManageProject, currentUser, managedProjectsFilter, visibleProjectsFilter } from "../utils/access.js";
import { logActivity } from "../utils/activity.js";
import { badRequest, forbidden, notFound } from "../utils/http-error.js";
import { activityLogArgs, taskInclude, userSummary } from "../utils/selects.js";
import {
  paginationMeta,
  parseDate,
  parseEnum,
  parseId,
  parseNullableId,
  parseOptionalText,
  parsePagination,
  parseRequiredText,
  parseSort,
  queryText,
  readBody,
} from "../utils/validation.js";

// Fields a client may sort tasks by.
const SORT_FIELDS = ["createdAt", "updatedAt", "dueDate", "title", "priority", "status"] as const;


// A task can only be assigned to someone who is a member of its project.
async function assertProjectMember(projectId: number, userId: number) {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { userId: true },
  });

  if (!membership) throw badRequest("Assignee must be a member of the project");
}


// GET /api/tasks
// Tasks from projects the user can see, with filters, search, sorting and pagination.
export async function getTasksController(req: Request, res: Response) {
  const user = currentUser(req);
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const { sortBy, sortOrder } = parseSort(req.query, SORT_FIELDS, "createdAt");
  const { projectId, assigneeId, status, priority, search } = req.query;

  // Start with the visibility rule, then add a filter for each query param that was sent.
  const where: Prisma.TaskWhereInput = { project: visibleProjectsFilter(user) };

  if (projectId !== undefined) where.projectId = parseId(projectId, "projectId");
  if (assigneeId !== undefined) where.assigneeId = parseId(assigneeId, "assigneeId");
  if (status !== undefined) where.status = parseEnum(TaskStatus, status, "task status");
  if (priority !== undefined) where.priority = parseEnum(TaskPriority, priority, "task priority");

  const term = queryText(search);
  if (term) where.title = { contains: term, mode: "insensitive" };

  // Tasks without a due date always go last.
  const primaryOrder: Prisma.TaskOrderByWithRelationInput =
    sortBy === "dueDate" ? { dueDate: { sort: sortOrder, nulls: "last" } } : { [sortBy]: sortOrder };

  // Sorting by id as well keeps the order stable between pages.
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: [primaryOrder, { id: sortOrder }],
      include: taskInclude,
    }),
    prisma.task.count({ where }),
  ]);

  return res.status(200).json({ data: tasks, pagination: paginationMeta(page, pageSize, total) });
}


// GET /api/tasks/:id
// One task with its comments and its own activity history.
export async function getTaskController(req: Request, res: Response) {
  const user = currentUser(req);
  const id = parseId(req.params.id, "task ID");

  // The visibility filter blocks tasks from projects the user is not part of.
  const task = await prisma.task.findFirst({
    where: { id, project: visibleProjectsFilter(user) },
    include: {
      ...taskInclude,
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: userSummary } } },
      activityLogs: { ...activityLogArgs, where: { taskId: id } },
    },
  });

  if (!task) throw notFound("Task not found");

  return res.status(200).json({ data: task });
}


// POST /api/tasks
// Admin or the project's manager creates a task.
export async function createTaskController(req: Request, res: Response) {
  const user = currentUser(req);
  const body = readBody(req);

  // 1. Validate all input first.
  const title = parseRequiredText(body.title, "Task title");
  const projectId = parseId(body.projectId, "projectId");
  const description = parseOptionalText(body.description, "Description");
  const priority = body.priority === undefined ? TaskPriority.Medium : parseEnum(TaskPriority, body.priority, "task priority");
  const status = body.status === undefined ? TaskStatus.Todo : parseEnum(TaskStatus, body.status, "task status");
  const dueDate = parseDate(body.dueDate, "dueDate");
  const assigneeId = parseNullableId(body.assigneeId, "assigneeId");

  // 2. The project must exist, not be archived, and be managed by this user.
  const project = await prisma.project.findFirst({
    where: { AND: [{ id: projectId, archivedAt: null }, managedProjectsFilter(user)] },
    select: { id: true },
  });

  if (!project) throw notFound("Project not found or you cannot manage it");

  if (assigneeId !== null) await assertProjectMember(projectId, assigneeId);

  // 3. Create the task and log it in one transaction.
  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: { title, description, projectId, assigneeId, createdById: user.id, priority, status, dueDate },
      include: taskInclude,
    });

    await logActivity(tx, {
      action: "task.created",
      projectId,
      taskId: created.id,
      actorId: user.id,
      details: `Task "${created.title}" created${created.assignee ? ` and assigned to ${created.assignee.username}` : ""}`,
    });

    return created;
  });

  return res.status(201).json({ message: "Task created", data: task });
}


// PATCH /api/tasks/:id
// Managers can edit everything. Assigned team members can only change the status.
export async function updateTaskController(req: Request, res: Response) {
  const user = currentUser(req);
  const id = parseId(req.params.id, "task ID");
  const body = readBody(req);

  // Find the task (only if the user can see its project).
  const task = await prisma.task.findFirst({
    where: { id, project: visibleProjectsFilter(user) },
    include: { project: { select: { managerId: true, archivedAt: true } } },
  });

  if (!task) throw notFound("Task not found");

  // Permission checks.
  const canManage = canManageProject(user, task.project);

  if (!canManage && task.assigneeId !== user.id) throw forbidden("You can only update tasks assigned to you");

  if (!canManage && Object.keys(body).some((key) => key !== "status")) {
    throw forbidden("You can only change task status");
  }

  // Archived projects are read-only.
  if (task.project.archivedAt) throw badRequest("Project is archived");

  // Build `data` from only the fields that were sent.
  const data: Prisma.TaskUncheckedUpdateInput = {};

  // Remember these two so we can compare them with the old values for the activity log.
  let nextStatus: TaskStatus | undefined;
  let nextAssigneeId: number | null | undefined;

  if (body.title !== undefined) data.title = parseRequiredText(body.title, "Task title");
  if (body.description !== undefined) data.description = parseOptionalText(body.description, "Description");
  if (body.priority !== undefined) data.priority = parseEnum(TaskPriority, body.priority, "task priority");
  if (body.dueDate !== undefined) data.dueDate = parseDate(body.dueDate, "dueDate");

  if (body.status !== undefined) {
    nextStatus = parseEnum(TaskStatus, body.status, "task status");
    data.status = nextStatus;
  }

  if (body.assigneeId !== undefined) {
    // null means "unassign".
    nextAssigneeId = parseNullableId(body.assigneeId, "assigneeId");

    if (nextAssigneeId !== null) await assertProjectMember(task.projectId, nextAssigneeId);

    data.assigneeId = nextAssigneeId;
  }

  // Nothing valid was sent.
  if (Object.keys(data).length === 0) throw badRequest("No valid fields to update");

  // Save the change and its activity logs together.
  const updatedTask = await prisma.$transaction(async (tx) => {
    const result = await tx.task.update({ where: { id }, data, include: taskInclude });
    const base = { projectId: task.projectId, taskId: id, actorId: user.id } as const;

    // Log status only if it really changed.
    if (nextStatus !== undefined && nextStatus !== task.status) {
      await logActivity(tx, {
        ...base,
        action: "task.status_changed",
        details: `Status changed from ${task.status} to ${nextStatus}`,
      });
    }

    // Log assignment only if the assignee really changed.
    if (nextAssigneeId !== undefined && nextAssigneeId !== task.assigneeId) {
      await logActivity(tx, {
        ...base,
        action: "task.assigned",
        details: result.assignee ? `Assigned to ${result.assignee.username}` : "Unassigned",
      });
    }

    // One log line for everything else (title, description, priority, due date).
    const otherFields = Object.keys(data).filter((key) => key !== "status" && key !== "assigneeId");

    if (otherFields.length > 0) {
      await logActivity(tx, { ...base, action: "task.updated", details: `Updated ${otherFields.join(", ")}` });
    }

    return result;
  });

  return res.status(200).json({ message: "Task updated", data: updatedTask });
}


// DELETE /api/tasks/:id
// Only an admin or the project's manager can delete a task.
export async function deleteTaskController(req: Request, res: Response) {
  const user = currentUser(req);
  const id = parseId(req.params.id, "task ID");

  const task = await prisma.task.findFirst({
    where: { id, project: visibleProjectsFilter(user) },
    select: { title: true, projectId: true, project: { select: { managerId: true } } },
  });

  if (!task) throw notFound("Task not found");

  if (!canManageProject(user, task.project)) {
    throw forbidden("Only an admin or project manager can delete tasks");
  }

  await prisma.$transaction(async (tx) => {
    // The log has no taskId because the task is about to be deleted.
    // The title is kept in the text so the history is still readable.
    await logActivity(tx, {
      action: "task.deleted",
      projectId: task.projectId,
      actorId: user.id,
      details: `Task "${task.title}" deleted`,
    });

    await tx.task.delete({ where: { id } });
  });

  return res.status(200).json({ message: "Task deleted" });
}


// POST /api/tasks/:id/comments
// Anyone who can see the task can comment on it.
export async function addTaskCommentController(req: Request, res: Response) {
  const user = currentUser(req);
  const id = parseId(req.params.id, "task ID");
  const content = parseRequiredText(readBody(req).content, "Comment");

  const task = await prisma.task.findFirst({
    where: { id, project: visibleProjectsFilter(user) },
    select: { id: true },
  });

  if (!task) throw notFound("Task not found");

  const comment = await prisma.taskComment.create({
    data: { taskId: id, authorId: user.id, content },
    include: { author: { select: userSummary } },
  });

  return res.status(201).json({ message: "Comment added", data: comment });
}
