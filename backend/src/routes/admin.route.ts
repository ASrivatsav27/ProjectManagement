import { Role } from "@prisma/client";
import { Router } from "express";
import { updateUserRoleController } from "../controllers/admin.controller.js";
import { authUser } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

const adminRouter = Router();

adminRouter.patch(
  "/users/:userId/role",
  authUser,
  requireRole(Role.Admin),
  updateUserRoleController,
);

export default adminRouter;
