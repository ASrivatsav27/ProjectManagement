import { Router } from "express";
import { registerController,loginController,logoutController } from "../controllers/auth.controller.js";
import { authUser } from "../middleware/auth.middleware.js";
const authRouter = Router()

authRouter.post('/register',registerController)
authRouter.post('/login',loginController)
authRouter.post('/logout',authUser,logoutController)

export default authRouter
