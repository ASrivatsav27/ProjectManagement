import type { Request, Response } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "../config/db.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import redis from "../config/cache.js";

const tokenLifetimeSeconds = 3 * 24 * 60 * 60;

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    return secret;
}

function createAuthToken(user: { id: number; email: string; username: string; role: Role }) {
    return jwt.sign({
        userId: user.id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
    }, getJwtSecret(), { expiresIn: "3d" });
}

function authCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: tokenLifetimeSeconds * 1000,
    };
}

export async function registerController(req: Request, res: Response) {
    const { email, username, password } = req.body
     
    if (!email || !username || !password) {
        return res.status(400).json({
            message: "User Details are required"
        })
    }

    const userAlreadyExists = await prisma.user.findUnique({
        where:{email}
    })

    if (userAlreadyExists) {
        return res.status(409).json({
            message:"User already exists"
        })
    }

    const hashedPassword = await bcrypt.hash(password,10)

    const user = await prisma.user.create({
        data: {
            email,username,password:hashedPassword
        }
    })

    const token = createAuthToken(user);
    res.cookie("jwt_token", token, authCookieOptions());
    
    
    const safeUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
    }

    return res.status(201).json({
        message:"User Registered successfully",safeUser
    })


}

export async function loginController(req:Request,res:Response) {
    const { email, password } = req.body
    
    if (!email || !password) {
        return res.status(400).json({
            message:"Missing credentials"
        })
    }
    
    const user = await prisma.user.findUnique({
        where:{email}
    })

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({
            message: "Invalid email or password"
        })
    }

    const token = createAuthToken(user);
    res.cookie("jwt_token", token, authCookieOptions());
    
       const safeUser =  {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
    }
   
    res.status(200).json({
        message:"Logged in successfully",safeUser
    })


}


export async function logoutController(req: Request, res: Response) {
    const token = req.cookies?.jwt_token;
    const decoded = token ? jwt.decode(token) : null;
    const expiresAt = typeof decoded === "object" && decoded !== null ? decoded.exp : undefined;
    const ttlSeconds = typeof expiresAt === "number" ? expiresAt - Math.floor(Date.now() / 1000) : 0;

    if (token && ttlSeconds > 0) {
        try {
            await redis.set(token, "blacklisted", "EX", ttlSeconds);
        } catch (error) {
            console.error("Could not revoke JWT during logout", error);
            return res.status(503).json({ message: "Logout is temporarily unavailable" });
        }
    }

    return res.clearCookie("jwt_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    }).status(200).json({ message: "Logged out successfully" });
}
