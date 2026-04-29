import express from "express";
import {
  getDashboardStats,
  getPendingExperts,
  approveExpert,
  rejectExpert,
  getRecentActivity,
  getSystemAlerts,
  getUsers,
  updateUserStatus,
  getVerificationRequests,
  approveVerification,
  rejectVerification,
  getAdminOrders,
  getAdminRentals,
  getReports,
  resolveReport,
  reportUser,
  getExpertSubscriptions
} from "../controllers/adminController.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();

// Dashboard
router.get("/stats", getDashboardStats);

// Experts
router.get("/pending-experts", getPendingExperts);
router.post("/experts/:id/approve", approveExpert);
router.post("/experts/:id/reject", rejectExpert);

// Activity & Alerts
router.get("/activity", getRecentActivity);
router.get("/alerts", getSystemAlerts);
router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);

router.get("/verification", getVerificationRequests);
router.post("/verification/:id/approve", approveVerification);
router.post("/verification/:id/reject", rejectVerification);

router.get("/orders", getAdminOrders);
router.get("/rentals", getAdminRentals);
router.get("/reports", getReports);
router.patch("/reports/:id/resolve", resolveReport);
router.post("/users/:id/report", auth, reportUser);
router.get("/experts/:id/subscriptions", getExpertSubscriptions);


export default router;
