import { Role } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";

export async function updateUserRoleController(req: Request, res: Response) {
  const userId = Number(req.params.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: "A valid user ID is required" });
  }

  const requestedRole: unknown = req.body?.role;
  if (
    typeof requestedRole !== "string" ||
    !Object.values(Role).includes(requestedRole as Role)
  ) {
    return res.status(400).json({
      message: `Role must be one of: ${Object.values(Role).join(", ")}`,
    });
  }

  if (req.user?.id === userId) {
    return res.status(400).json({ message: "You cannot change your own role" });
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (existingUser.role === Role.Admin && requestedRole !== Role.Admin) {
    const adminCount = await prisma.user.count({ where: { role: Role.Admin } });
    if (adminCount <= 1) {
      return res.status(409).json({ message: "The last admin cannot be demoted" });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: requestedRole as Role },
    select: { id: true, email: true, username: true, role: true },
  });

  return res.status(200).json({ message: "User role updated", user });
}
