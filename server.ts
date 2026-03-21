import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "./db";
import crypto from "crypto";

type PostBody = {
  title: string;
  description: string;
};

type SignupBody = {
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  address?: string;
  email: string;
  phone?: string;
  password: string;
};

type LoginBody = {
  email: string;
  password: string;
};

type RefreshTokenBody = {
  refresh_token: string;
};

type AuthPayload = {
  id: number;
  // email: string;
};

type AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown
> = Request<P, ResBody, ReqBody> & {
  user?: AuthPayload;
  sessionToken?: string;
};

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET is not set");
}

const app = express();

app.use(express.json());
const authenticateSessionToken = async (
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

    const result = await pool.query(
      "SELECT * FROM user_sessions WHERE session_token = $1",
      [sessionToken]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid session token" });
    }

    const session = result.rows[0];

    if (new Date(session.session_expires_at) < new Date()) {
      return res.status(401).json({ message: "Session token has expired" });
    }

    req.user = {
      id: session.user_id,
    };
    req.sessionToken = sessionToken;

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Authentication failed" });
  }
};

// const authenticateToken = (
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res
//       .status(401)
//       .json({ message: "Authorization token is required" });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, jwtSecret) as AuthPayload;
//     req.user = decoded;
//     next();
//   } catch (error) {
//     console.error(error);
//     return res.status(401).json({ message: "Invalid or expired token" });
//   }
// };

app.post(
  "/api/post",
  // authenticateToken,
  authenticateSessionToken,

  async (req: AuthenticatedRequest<{}, unknown, PostBody>, res: Response) => {
    try {
      const { title, description } = req.body;

      const result = await pool.query(
        "INSERT INTO posts (title, description) VALUES ($1, $2) RETURNING *",
        [title, description]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("POST ERROR:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  }
);

app.get(
  "/api/posts",
  // authenticateToken,
  authenticateSessionToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await pool.query("SELECT * FROM posts ORDER BY id ASC");
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  }
);

app.get(
  "/api/posts/:id",
  // authenticateToken,
  authenticateSessionToken,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    try {
      const id = Number(req.params.id);
      const result = await pool.query("SELECT * FROM posts WHERE id = $1", [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.status(200).json({
        message: "Success",
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to get post by id" });
    }
  }
);

app.put(
  "/api/posts/:id",
  // authenticateToken,
  authenticateSessionToken,
  async (
    req: AuthenticatedRequest<{ id: string }, unknown, PostBody>,
    res: Response
  ) => {
    try {
      const id = Number(req.params.id);
      const { title, description } = req.body;

      const result = await pool.query(
        "UPDATE posts SET title = $1, description = $2 WHERE id = $3 RETURNING *",
        [title, description, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Post cannot be updated" });
      }

      res.status(200).json({
        message: "Post updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update post by id" });
    }
  }
);

app.delete(
  "/api/post/delete/:id",
  // authenticateToken,
  authenticateSessionToken,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    try {
      const id = Number(req.params.id);
      const result = await pool.query(
        "DELETE FROM posts WHERE id = $1 RETURNING *",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.status(200).json({
        message: "Post deleted successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  }
);

app.post(
  "/api/user/signup",
  async (req: Request<{}, {}, SignupBody>, res: Response) => {
    try {
      const {
        first_name,
        last_name,
        dob,
        gender,
        address,
        email,
        phone,
        password,
      } = req.body;

      if (!first_name || !last_name || !dob || !gender || !email || !password) {
        return res.status(400).json({ message: "Required fields are missing" });
      }

      if (password.length < 8) {
        return res
          .status(400)
          .json({ message: "Password must be at least 8 characters" });
      }

      const existingUser = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ message: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        "INSERT INTO users (first_name, last_name, dob, gender, address, email, phone, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, first_name, last_name, dob, gender, address, email, phone, created_at",
        [
          first_name,
          last_name,
          dob,
          gender,
          address ?? null,
          email,
          phone ?? null,
          hashedPassword,
        ]
      );

      const user = result.rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email },
        jwtSecret,
        { expiresIn: "1d" }
      );

      const session_token = crypto.randomBytes(32).toString("hex");
      const session_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const refresh_token = crypto.randomBytes(32).toString("hex");
      const refresh_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const session_result = await pool.query(
        "INSERT INTO user_sessions (user_id, session_token, refresh_token, session_expires_at, refresh_expires_at) VALUES ($1, $2, $3, $4, $5)",
        [user.id, session_token, refresh_token, session_expires_at, refresh_expires_at]
      );


      res.status(201).json({
        message: "User sign up successful",
        token,
        session_token,
        refresh_token,
        user,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "User sign up failed" });
    }
  }
);

app.post(
  "/api/user/login",
  async (req: Request<{}, {}, LoginBody>, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);

      if (result.rows.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const user = result.rows[0];
      const isPasswordMatch = await bcrypt.compare(password, user.password);

      if (!isPasswordMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        jwtSecret,
        { expiresIn: "1d" }
      );

      const session_token = crypto.randomBytes(32).toString("hex");
      const session_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const refresh_token = crypto.randomBytes(32).toString("hex");
      const refresh_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const session_result = await pool.query(
        "INSERT INTO user_sessions (user_id, session_token, refresh_token, session_expires_at, refresh_expires_at) VALUES ($1, $2, $3, $4, $5)",
        [user.id, session_token, refresh_token, session_expires_at, refresh_expires_at]
      );
      res.status(200).json({
        message: "Logged in successfully",
        token,
        session_token,
        refresh_token,
        data: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          dob: user.dob,
          gender: user.gender,
          address: user.address,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Login failed" });
    }
  }
);

app.post(
  "/api/user/refresh-token",
  async (req: Request<{}, {}, RefreshTokenBody>, res: Response) => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({ message: "Refresh token is required" });
      }

      const sessionResult = await pool.query(
        "SELECT * FROM user_sessions WHERE refresh_token = $1",
        [refresh_token]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const session = sessionResult.rows[0];

      if (new Date(session.refresh_expires_at) < new Date()) {
        return res.status(401).json({ message: "Refresh token has expired" });
      }

      const new_session_token = crypto.randomBytes(32).toString("hex");
      const new_refresh_token = crypto.randomBytes(32).toString("hex");
      const new_session_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const new_refresh_expires_at = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      );

      await pool.query(
        "UPDATE user_sessions SET session_token = $1, refresh_token = $2, session_expires_at = $3, refresh_expires_at = $4 WHERE id = $5",
        [
          new_session_token,
          new_refresh_token,
          new_session_expires_at,
          new_refresh_expires_at,
          session.id,
        ]
      );

      res.status(200).json({
        message: "Tokens refreshed successfully",
        session_token: new_session_token,
        refresh_token: new_refresh_token,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to refresh token" });
    }
  }
);

app.post(
  "/api/user/logout",
  authenticateSessionToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.sessionToken) {
        return res.status(401).json({ message: "Session token is required" });
      }

      const result = await pool.query(
        "DELETE FROM user_sessions WHERE session_token = $1 RETURNING *",
        [req.sessionToken]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Logout failed" });
    }
  }
);



app.listen(8000, () => console.log("Server is running on port 8000"));


///////////////////////login /////////////////////////

// app.post("/api/user/login", async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         if (!email || !password) {
//             return res.status(400).json({ message: "Email and password are required" });
//         }

//         const result = await pool.query(
//             "SELECT * FROM users WHERE email = $1",
//             [email]
//         );

//         if (result.rows.length === 0) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }

//         const user = result.rows[0];

//         const isPasswordMatch = await bcrypt.compare(password, user.password);

//         if (!isPasswordMatch) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }

//         const token = jwt.sign(
//             { id: user.id, email: user.email },
//             process.env.JWT_SECRET,
//             { expiresIn: "1d" }
//         );

//         res.status(200).json({
//             message: "Logged in successfully",
//             token,
//             data: {
//                 id: user.id,
//                 first_name: user.first_name,
//                 last_name: user.last_name,
//                 dob: user.dob,
//                 gender: user.gender,
//                 address: user.address,
//                 email: user.email,
//                 phone: user.phone,
//                 created_at: user.created_at,
//             },
//         });
//     } catch (e) {
//         console.error(e);
//         res.status(500).json({ message: "Login failed" });
//     }
// });
