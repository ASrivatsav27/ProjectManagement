import { Router } from "express";
import { getDashboardSummaryController } from "../controllers/dashboard.controller.js";
import { authUser } from "../middleware/auth.middleware.js";

const dashboardRouter = Router();

dashboardRouter.get("/summary", authUser, getDashboardSummaryController);

export default dashboardRouter;
