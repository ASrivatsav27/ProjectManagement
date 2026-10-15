import { Role, type Prisma } from "@prisma/client";
import type { Request } from "express";
import { unauthorized } from "./http-error.js";

export type AuthUser = NonNullable<Request["user"]>;


// The logged-in user. The authUser middleware puts it on the request.
// This throws if a route forgot to use that middleware.
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized("Authentication required");

  return req.user;
}


// Which projects this user is allowed to SEE.
//   Admin           -> all projects
//   Project manager -> projects they manage or are a member of
//   Team member     -> projects they are a member of
// Add this to every query so nobody can read another project's data.
export function visibleProjectsFilter(user: AuthUser): Prisma.ProjectWhereInput {
  if (user.role === Role.Admin) return {};

  if (user.role === Role.ProjectManager) {
    return { OR: [{ managerId: user.id }, { members: { some: { userId: user.id } } }] };
  }

  return { members: { some: { userId: user.id } } };
}


// Which projects this user is allowed to CHANGE.
//   Admin -> all projects
//   Others -> only projects where they are the manager
export function managedProjectsFilter(user: AuthUser): Prisma.ProjectWhereInput {
  return user.role === Role.Admin ? {} : { managerId: user.id };
}


// Same rule as managedProjectsFilter, but for a project already loaded in memory.
export function canManageProject(user: AuthUser, project: { managerId: number | null }): boolean {
  return user.role === Role.Admin || (user.role === Role.ProjectManager && project.managerId === user.id);
}
