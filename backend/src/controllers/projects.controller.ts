import { ProjectStatus, Role, TaskStatus, type Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { currentUser, managedProjectsFilter, visibleProjectsFilter, type AuthUser } from "../utils/access.js";
import { logActivity } from "../utils/activity.js";
import { badRequest, notFound } from "../utils/http-error.js";
import { activityLogArgs, userSummary } from "../utils/selects.js";
import {
  assertDateOrder,
  paginationMeta,
  parseDate,
  parseEnum,
  parseId,
  parseOptionalText,
  parsePagination,
  parseRequiredText,
  queryText,
  readBody,
} from "../utils/validation.js";

const MANAGE_ERROR = "Project not found or you cannot manage it";


// Decides who becomes the manager of a new project.
//   Admin sends managerId -> that user (must have the ProjectManager role)
//   Anyone else           -> themselves
async function resolveManagerId(user: AuthUser, requested: unknown): Promise<number> {
  const hasRequest = requested !== undefined && requested !== null && requested !== "";

  if (user.role !== Role.Admin || !hasRequest) return user.id;

  const managerId = parseId(requested, "managerId");

  // Admin picked themselves, nothing to check.
  if (managerId === user.id) return managerId;

  const manager = await prisma.user.findFirst({
    where: { id: managerId, role: Role.ProjectManager },
    select: { id: true },
  });

  if (!manager) throw badRequest("Manager must be a project manager");

  return managerId;
}


// GET /api/projects
// List of projects the user can see, with filters and pagination.
export async function getProjectsController(req: Request, res: Response) {
  const user = currentUser(req);
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const { status, search, includeArchived } = req.query;

  // Collect filters in a list, then combine them with AND.
  const filters: Prisma.ProjectWhereInput[] = [visibleProjectsFilter(user)];

  if (includeArchived !== "true") filters.push({ archivedAt: null });

  if (status !== undefined) filters.push({ status: parseEnum(ProjectStatus, status, "project status") });

  const term = queryText(search);
  if (term) filters.push({ name: { contains: term, mode: "insensitive" } });

  const where: Prisma.ProjectWhereInput = { AND: filters };

  // Fetch the page and the total count at the same time.
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      include: {
        manager: { select: userSummary },
        _count: { select: { members: true, tasks: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  return res.status(200).json({ data: projects, pagination: paginationMeta(page, pageSize, total) });
}


// GET /api/projects/:id
// One project with its manager, members, recent activity and progress.
export async function getProjectController(req: Request, res: Response) {
  const user = currentUser(req);
  const id = parseId(req.params.id, "project ID");

  // The visibility filter means a user cannot open a project they are not part of.
  const project = await prisma.project.findFirst({
    where: { AND: [{ id }, visibleProjectsFilter(user)] },
    include: {
      manager: { select: userSummary },
      members: { include: { user: { select: { ...userSummary, email: true } } } },
      activityLogs: activityLogArgs,
      _count: { select: { tasks: true } },
    },
  });

  if (!project) throw notFound("Project not found");

  // Progress = done tasks / all tasks.
  const totalTasks = project._count.tasks;
  const doneTasks = await prisma.task.count({ where: { projectId: id, status: TaskStatus.Done } });

  const progress = {
    totalTasks,
    doneTasks,
    completionPercentage: totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100),
  };

  return res.status(200).json({ data: { ...project, progress } });
}


// POST /api/projects
// Admin or project manager creates a project.
export async function createProjectController(req: Request, res: Response) {
  const user = currentUser(req);
  const body = readBody(req);

  // 1. Validate all input first.
  const name = parseRequiredText(body.name, "Project name");
  const description = parseOptionalText(body.description, "Description");
  const startDate = parseDate(body.startDate, "startDate");
  const deadline = parseDate(body.deadline, "deadline");

  assertDateOrder(startDate, deadline);

  const managerId = await resolveManagerId(user, body.managerId);

  // 2. Create the project, add the manager as a member, and log it.
  //    All inside one transaction: either everything is saved or nothing is.
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        name,
        description,
        startDate,
        deadline,
        createdById: user.id,
        managerId,
        members: { create: [{ userId: managerId }] },
      },
      include: { manager: { select: userSummary } },
    });

    await logActivity(tx, {
      action: "project.created",
      projectId: created.id,
      actorId: user.id,
      details: `Project "${created.name}" created`,
    });

    return created;
  });

  return res.status(201).json({ message: "Project created", data: project });
}


// PATCH /api/projects/:id
// Update details, status or archive state. Only fields that are sent are changed.
export async function updateProjectController(req: Request, res: Response) {
  const user = currentUser(req);
  const id = parseId(req.params.id, "project ID");
  const body = readBody(req);

  // Load the current values. Also checks the user is allowed to manage this project.
  const existing = await prisma.project.findFirst({
    where: { AND: [{ id }, managedProjectsFilter(user)] },
    select: { startDate: true, deadline: true, status: true, archivedAt: true },
  });

  if (!existing) throw notFound(MANAGE_ERROR);

  // `data` holds what we will save. `changes` is only for the activity log text.
  const data: Prisma.ProjectUpdateInput = {};
  const changes: string[] = [];

  if (body.name !== undefined) {
    data.name = parseRequiredText(body.name, "Project name");
    changes.push("name");
  }

  if (body.description !== undefined) {
    data.description = parseOptionalText(body.description, "Description");
    changes.push("description");
  }

  if (body.status !== undefined) {
    const status = parseEnum(ProjectStatus, body.status, "project status");

    data.status = status;

    if (status !== existing.status) changes.push(`status (${existing.status} to ${status})`);
  }

  // If only one date is sent, compare it with the saved value of the other.
  const startDate = body.startDate === undefined ? existing.startDate : parseDate(body.startDate, "startDate");
  const deadline = body.deadline === undefined ? existing.deadline : parseDate(body.deadline, "deadline");

  assertDateOrder(startDate, deadline);

  if (body.startDate !== undefined) {
    data.startDate = startDate;
    changes.push("startDate");
  }

  if (body.deadline !== undefined) {
    data.deadline = deadline;
    changes.push("deadline");
  }

  // Archiving stores the time it happened. Un-archiving clears it.
  let archived: boolean | undefined;

  if (body.archived !== undefined) {
    if (typeof body.archived !== "boolean") throw badRequest("archived must be true or false");

    archived = body.archived;
    data.archivedAt = archived ? (existing.archivedAt ?? new Date()) : null;
  }

  // Nothing valid was sent.
  if (Object.keys(data).length === 0) throw badRequest("No valid fields to update");

  // Save the change and its activity log together.
  const updatedProject = await prisma.$transaction(async (tx) => {
    const result = await tx.project.update({ where: { id }, data });
    const base = { projectId: id, actorId: user.id } as const;

    if (changes.length > 0) {
      await logActivity(tx, { ...base, action: "project.updated", details: `Updated ${changes.join(", ")}` });
    }

    // Log archive / restore only if the state really changed.
    if (archived !== undefined && archived !== (existing.archivedAt !== null)) {
      await logActivity(tx, { ...base, action: archived ? "project.archived" : "project.restored" });
    }

    return result;
  });

  return res.status(200).json({ message: "Project updated", data: updatedProject });
}


// PUT /api/projects/:id/members
// Replaces the whole member list with the list that was sent.
export async function updateProjectMembersController(req: Request, res: Response) {
  const user = currentUser(req);
  const id = parseId(req.params.id, "project ID");
  const { userIds } = readBody(req);

  if (!Array.isArray(userIds)) throw badRequest("userIds must be an array of user IDs");

  const requestedIds = userIds.map((value) => parseId(value, "user ID in userIds"));

  const project = await prisma.project.findFirst({
    where: { AND: [{ id }, managedProjectsFilter(user)] },
    select: { managerId: true },
  });

  if (!project) throw notFound(MANAGE_ERROR);

  // The manager always stays a member. Set() removes duplicate IDs.
  const ids = [...new Set(project.managerId === null ? requestedIds : [...requestedIds, project.managerId])];

  // Make sure every user really exists.
  const existingUsers = await prisma.user.count({ where: { id: { in: ids } } });

  if (existingUsers !== ids.length) throw badRequest("One or more users do not exist");

  const members = await prisma.$transaction(async (tx) => {
    // Remove members who are not in the new list.
    await tx.projectMember.deleteMany({ where: { projectId: id, userId: { notIn: ids } } });

    // Add the new ones. skipDuplicates ignores people who are already members.
    await tx.projectMember.createMany({
      data: ids.map((userId) => ({ projectId: id, userId })),
      skipDuplicates: true,
    });

    // Someone removed from the project must not keep tasks assigned to them.
    const { count: unassigned } = await tx.task.updateMany({
      where: { projectId: id, assigneeId: { notIn: ids } },
      data: { assigneeId: null },
    });

    await logActivity(tx, {
      action: "project.members_updated",
      projectId: id,
      actorId: user.id,
      details: `Team set to ${ids.length} member(s); ${unassigned} task(s) unassigned`,
    });

    return tx.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: userSummary } },
    });
  });

  return res.status(200).json({ message: "Project members updated", data: members });
}


// DELETE /api/projects/:id
// Admin only (the route enforces it).
// Tasks, members and activity logs are removed automatically (cascade in the schema).
export async function deleteProjectController(req: Request, res: Response) {
  const id = parseId(req.params.id, "project ID");

  const { count } = await prisma.project.deleteMany({ where: { id } });

  if (count === 0) throw notFound("Project not found");

  return res.status(200).json({ message: "Project deleted" });
}
