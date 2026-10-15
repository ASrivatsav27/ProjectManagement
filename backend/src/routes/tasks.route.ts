import { Role } from "@prisma/client";
import { Router } from "express";
import {
  addTaskCommentController,
  createTaskController,
  deleteTaskController,
  getTaskController,
  getTasksController,
  updateTaskController,
} from "../controllers/tasks.controller.js";
import { authUser } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/require-role.middleware.js";

const tasksRouter = Router();

tasksRouter.get("/", authUser, getTasksController);
tasksRouter.post("/", authUser, requireRole(Role.Admin, Role.ProjectManager), createTaskController);
tasksRouter.get("/:id", authUser, getTaskController);
tasksRouter.patch("/:id", authUser, updateTaskController);
tasksRouter.delete("/:id", authUser, requireRole(Role.Admin, Role.ProjectManager), deleteTaskController);
tasksRouter.post("/:id/comments", authUser, addTaskCommentController);

export default tasksRouter;
