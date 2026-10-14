import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db.js";
import redis from "../config/cache.js";

export async function authUser(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.jwt_token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not configured");
    return res.status(500).json({ message: "Authentication is unavailable" });
  }

  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  if (typeof decoded === "string" || typeof decoded.userId !== "string") {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    if (await redis.get(token)) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  } catch (error) {
    console.error("Redis token revocation check failed", error);
    return res.status(503).json({ message: "Authentication is temporarily unavailable" });
  }

  const userId = Number(decoded.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, role: true },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  req.user = user;
  return next();
}
