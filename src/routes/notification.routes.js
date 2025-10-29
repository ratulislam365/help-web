// src/routes/notification.routes.js
import express from "express";
import { getNotifications } from "../controllers/notification.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import {createNotification} from "../controllers/notification.controller.js"

const router = express.Router();

router.get("/", protect, getNotifications);
router.post("/create", protect, createNotification);


export default router;
