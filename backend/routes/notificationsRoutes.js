import express from "express";
import { getNotifications } from "../controllers/notificationsController.js";

const router = express.Router();

router.get("/:farmer_id", getNotifications);

export default router;
