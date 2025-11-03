import express from "express";
import { getHistory, addHistory, removeHistory, getStats } from "../controllers/history.controller.js";

const router = express.Router();

router.get("/", getHistory);
router.post("/", addHistory);
router.delete("/:id", removeHistory);
router.get("/stats", getStats);

export default router;
