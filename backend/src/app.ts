import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.route.js";
import adminRouter from "./routes/admin.route.js";
import dashboardRouter from "./routes/dashboard.route.js";
import projectsRouter from "./routes/projects.route.js";
import tasksRouter from "./routes/tasks.route.js";
import usersRouter from "./routes/users.route.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/users", usersRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/dashboard", dashboardRouter);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Server is running" });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
