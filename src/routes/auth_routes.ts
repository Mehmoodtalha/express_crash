import { Router } from "express";
import { authenticateSessionToken } from "../middleware/auth";
import {
    signUp,
    logIn,
    logOut,
    refreshToken,
} from "../controllers/auth_controller";

const router = Router();

router.post("/user/signup", signUp);
router.post("/user/login", logIn);
router.post("/user/refresh-token", refreshToken);
router.post("/user/logout", authenticateSessionToken, logOut);

export default router;
