import { NextFunction, Request, Response } from "express";
import redisClient from "../db/redis";

export type RedisSessionData = {
  userId: number;
  refreshToken: string;
};

export type AuthPayload = {
  id: number;
  // email: string;
};

export type AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown
> = Request<P, ResBody, ReqBody> & {
  user?: AuthPayload;
  sessionToken?: string;
};

export const authenticateSessionToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Session token is required" });
    }

    const sessionToken = authHeader.split(" ")[1];

    const sessionData = await redisClient.get(`session:${sessionToken}`);

    if (!sessionData) {
      return res
        .status(401)
        .json({ message: "Invalid or expired session token" });
    }

    const session = JSON.parse(sessionData) as RedisSessionData;

    req.user = {
      id: session.userId,
    };
    req.sessionToken = sessionToken;

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Authentication failed" });
  }
};
