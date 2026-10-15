import { Role } from "@prisma/client";
import { Router } from "express";
import {
  createProjectController,
  deleteProjectController,
  getProjectController,
  getProjectsController,
  updateProjectController,
  updateProjectMembersController,
} from "../controllers/projects.controller.js";
import { authUser } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

const projectsRouter = Router();

projectsRouter.get("/", authUser, getProjectsController);
projectsRouter.post("/", authUser, requireRole(Role.Admin, Role.ProjectManager), createProjectController);
projectsRouter.get("/:id", authUser, getProjectController);
projectsRouter.patch("/:id", authUser, requireRole(Role.Admin, Role.ProjectManager), updateProjectController);
projectsRouter.put("/:id/members", authUser, requireRole(Role.Admin, Role.ProjectManager), updateProjectMembersController);
projectsRouter.delete("/:id", authUser, requireRole(Role.Admin), deleteProjectController);

export default projectsRouter;
