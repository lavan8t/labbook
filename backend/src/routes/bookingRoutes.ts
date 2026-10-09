import { Router } from "express";
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  getTimetableBookings,
} from "../controllers/bookingController";

const router = Router();

router.post("/", createBooking);
router.get("/my", getMyBookings);
router.get("/timetable", getTimetableBookings);
router.delete("/:id", cancelBooking);

export default router;
