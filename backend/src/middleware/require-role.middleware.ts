import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";

export function requireRole(...allowedRoles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to do this" });
    }

    return next();
  };
}
