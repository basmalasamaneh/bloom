import express from "express";
import { addTask, getMyTasks, markCompleted } from "../controllers/taskController.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", auth, addTask);
router.get("/", auth, getMyTasks);
router.put("/:taskId/complete", auth, markCompleted);

export default router;
