import { Router } from "express";
import { authenticateSessionToken } from "../middleware/auth";
import {
    createPost,
    deletePost,
    getAllPosts,
    getPostById,
    updatePost,
} from "../controllers/post_controller";

const router = Router();

router.post("/post", authenticateSessionToken, createPost);
router.get("/posts", authenticateSessionToken, getAllPosts);
router.get("/posts/:id", authenticateSessionToken, getPostById);
router.put("/posts/:id", authenticateSessionToken, updatePost);
router.delete("/post/delete/:id", authenticateSessionToken, deletePost);

export default router;
