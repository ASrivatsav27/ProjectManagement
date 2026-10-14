import express, { type Request, type Response } from "express"
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.route.js"
import adminRouter from "./routes/admin.route.js"

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use("/api/auth", authRouter)
app.use("/api/admin", adminRouter)

app.get("/", (req:Request,res:Response) => {
    res.json({
        message:"Server is running"
    })
})



export default app
