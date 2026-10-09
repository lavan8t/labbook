import { Router } from "express";
import {
  getPendingApprovals,
  inspectClashes,
  approveBooking,
  rejectBooking,
  getUtilizationReport,
  scheduleMaintenance,
} from "../controllers/adminController";

const router = Router();

router.get("/pending", getPendingApprovals);
router.get("/clashes/:id", inspectClashes);
router.post("/approve/:id", approveBooking);
router.post("/reject/:id", rejectBooking);
router.get("/reports/utilization", getUtilizationReport);
router.post("/maintenance", scheduleMaintenance);

export default router;
