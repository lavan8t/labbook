import { Router } from "express";
import {
  getAllVenues,
  getVenueById,
  getVenueSchedule,
  searchAvailableVenues,
} from "../controllers/venueController";

const router = Router();

router.get("/", getAllVenues);
router.get("/search/available", searchAvailableVenues);
router.get("/:id", getVenueById);
router.get("/:id/schedule", getVenueSchedule);

export default router;
