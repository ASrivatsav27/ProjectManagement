import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { currentUser } from "../utils/access.js";

// GET /api/users/me
// The signed-in user (used by the frontend to restore a session after a page refresh).
export async function getMeController(req: Request, res: Response) {
  return res.status(200).json({ data: currentUser(req) });
}

// GET /api/users
// Directory of users for assigning team members and for the admin screen.
// Admin and project manager only (the route enforces it). Passwords are never selected.
export async function listUsersController(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, createdAt: true },
    orderBy: { username: "asc" },
    take: 500,
  });

  return res.status(200).json({ data: users });
}
