import express from "express";
import {
  addCrop,
  getCropById,
  getCropsForFarmer,
  previewCropAdvice,
  deleteCrop,
} from "../controllers/cropsController.js";

const router = express.Router();

router.post("/add", addCrop);
router.post("/preview", previewCropAdvice);
router.get("/:id", getCropById);
router.get("/farmer/:farmer_id", getCropsForFarmer);
router.delete("/:id", deleteCrop);

export default router;
