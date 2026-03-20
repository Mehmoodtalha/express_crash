import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "./db";

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

type AuthPayload = {
  id: number;
  email: string;
};

type AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown
> = Request<P, ResBody, ReqBody> & {
  user?: AuthPayload;
};

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET is not set");
}

const app = express();

app.use(express.json());

const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Authorization token is required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

app.post(
  "/api/post",
  authenticateToken,
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
  authenticateToken,
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
  authenticateToken,
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
  authenticateToken,
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
  authenticateToken,
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

      res.status(201).json({
        message: "User sign up successful",
        token,
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

      res.status(200).json({
        message: "Logged in successfully",
        token,
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
