import { Router } from "express";
import {
  createBooking,
  getMyBookings,
  cancelBooking,
} from "../controllers/bookingController";

const router = Router();

router.post("/", createBooking);
router.get("/my", getMyBookings);
router.delete("/:id", cancelBooking);

export default router;
