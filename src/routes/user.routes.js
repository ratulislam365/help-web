// src/routes/user.routes.js
import express from "express";
import { getUserProfile } from "../controllers/user.controller.js";
// src/routes/user.routes.js
import { changeRole } from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Get user profile
router.get("/:id", getUserProfile);
router.patch("/change-role", protect, changeRole);

export default router;
