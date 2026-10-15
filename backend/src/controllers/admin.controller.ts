import { Role } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { currentUser } from "../utils/access.js";
import { badRequest, conflict, notFound } from "../utils/http-error.js";
import { parseEnum, parseId, readBody } from "../utils/validation.js";


// PATCH /api/admin/users/:userId/role
// Admin changes another user's role.
export async function updateUserRoleController(req: Request, res: Response) {
  const actor = currentUser(req);
  const userId = parseId(req.params.userId, "user ID");
  const role = parseEnum(Role, readBody(req).role, "role");

  // An admin cannot change their own role (prevents locking yourself out).
  if (actor.id === userId) throw badRequest("You cannot change your own role");

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!target) throw notFound("User not found");

  // Never demote the last remaining admin.
  if (target.role === Role.Admin && role !== Role.Admin) {
    const adminCount = await prisma.user.count({ where: { role: Role.Admin } });

    if (adminCount <= 1) throw conflict("The last admin cannot be demoted");
  }

  // `select` keeps the password hash out of the response.
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, username: true, role: true },
  });

  return res.status(200).json({ message: "User role updated", user });
}
