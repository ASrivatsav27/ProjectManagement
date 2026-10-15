import { Role } from "@prisma/client";
import { Router } from "express";
import { getMeController, listUsersController } from "../controllers/users.controller.js";
import { authUser } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

const usersRouter = Router();

usersRouter.get("/me", authUser, getMeController);
usersRouter.get("/", authUser, requireRole(Role.Admin, Role.ProjectManager), listUsersController);

export default usersRouter;
