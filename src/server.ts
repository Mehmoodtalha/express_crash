import express from "express";
import { authenticateSessionToken } from "./middleware/auth";
// import { createPost, deletePost, getAllPosts, getPostById, updatePost } from "./controllers/post_controller";
import { signUp, logIn, logOut, refreshToken } from "./controllers/auth_controller";
import postRoutes from "./routes/post_routes";
import authRoutes from "./routes/auth_routes";


const app = express();
app.use(express.json());

app.use("/api", postRoutes);
app.use("/api", authRoutes);


//////////////create post
// app.post(
//   "/api/post",
//   authenticateSessionToken,
//   createPost
// );
// /////////////get all posts
// app.get(
//   "/api/posts",
//   authenticateSessionToken,
//   getAllPosts
// );
// ///////////get post by id
// app.get(
//   "/api/posts/:id",
//   authenticateSessionToken,
//   getPostById
// );
// ////////////update post
// app.put(
//   "/api/posts/:id",
//   authenticateSessionToken,
//   updatePost
// );
// /////////////// delete post
// app.delete(
//   "/api/post/delete/:id",
//   authenticateSessionToken,
//   deletePost
// );
// ////////////// signup
// app.post(
//   "/api/user/signup",
//   signUp
// );
// ////////////// login
// app.post(
//   "/api/user/login",
//   logIn
// );
//////////////// refresh token
// app.post(
//   "/api/user/refresh-token",
//   refreshToken
// );
// ///////////////logout
// app.post(
//   "/api/user/logout",
//   authenticateSessionToken,
//   logOut
// );



app.listen(8000, () => console.log("Server is running on port 8000"));

