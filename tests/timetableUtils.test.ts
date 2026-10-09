import { describe, expect, it } from "bun:test";
import {
  generateTimeSlots,
  timeToSlotIndex,
  getBookingSpan,
  formatSlotTime,
  TIMETABLE_START_HOUR,
  TIMETABLE_END_HOUR,
  TOTAL_SLOTS,
} from "../src/lib/timetableUtils";

describe("timetableUtils", () => {
  it("generates 26 half-hour slots starting at 08:00 and ending at 21:00", () => {
    const slots = generateTimeSlots();
    expect(slots.length).toBe(26);
    expect(slots.length).toBe(TOTAL_SLOTS);
    expect(slots[0].slotIndex).toBe(0);
    expect(slots[0].time).toBe("08:00");
    expect(slots[0].label).toBe("08:00");
    expect(slots[0].hour).toBe(8);
    expect(slots[0].minute).toBe(0);

    expect(slots[25].slotIndex).toBe(25);
    expect(slots[25].time).toBe("20:30");
    expect(slots[25].label).toBe("20:30");
    expect(slots[25].hour).toBe(20);
    expect(slots[25].minute).toBe(30);
  });

  it("formats dates as DD/MM/YYYY and times as railway 24h", async () => {
    const { formatDateDDMMYYYY, formatTimeRailway } = await import("../src/lib/timetableUtils");
    expect(formatDateDDMMYYYY("2026-10-22")).toBe("22/10/2026");
    expect(formatDateDDMMYYYY(new Date(2026, 9, 22))).toBe("22/10/2026");
    expect(formatTimeRailway("2026-10-22T09:30:00.000Z")).toBe("09:30");
    expect(formatTimeRailway("14:45")).toBe("14:45");
  });

  it("correctly converts time strings to slot indices", () => {
    expect(timeToSlotIndex("08:00")).toBe(0);
    expect(timeToSlotIndex("08:30")).toBe(1);
    expect(timeToSlotIndex("10:00")).toBe(4);
    expect(timeToSlotIndex("21:00")).toBe(26);
    expect(timeToSlotIndex("07:30")).toBe(-1);
    expect(timeToSlotIndex("invalid")).toBe(-1);
  });

  it("formats slot times with leading zeros", () => {
    expect(formatSlotTime(8, 0)).toBe("08:00");
    expect(formatSlotTime(8, 30)).toBe("08:30");
    expect(formatSlotTime(14, 0)).toBe("14:00");
    expect(formatSlotTime(20, 30)).toBe("20:30");
  });

  it("computes booking column start and span correctly for a 3-hour event", () => {
    const startIso = "2026-10-22T10:00:00.000Z";
    const endIso = "2026-10-22T13:00:00.000Z";
    const span = getBookingSpan(startIso, endIso, "2026-10-22");

    expect(span.isVisible).toBe(true);
    expect(span.startSlot).toBe(4); // 10:00
    expect(span.spanSlots).toBe(6); // 3 hours = 6 x 30m
    expect(span.clampedStart).toBe(false);
    expect(span.clampedEnd).toBe(false);
  });

  it("flags events on different dates as not visible", () => {
    const startIso = "2026-10-23T10:00:00.000Z";
    const endIso = "2026-10-23T12:00:00.000Z";
    const span = getBookingSpan(startIso, endIso, "2026-10-22");

    expect(span.isVisible).toBe(false);
    expect(span.spanSlots).toBe(0);
  });

  it("clamps boundaries for early and late events", () => {
    // Starts before 08:00 (e.g., 07:00 to 10:00)
    const earlySpan = getBookingSpan(
      "2026-10-22T07:00:00.000Z",
      "2026-10-22T10:00:00.000Z",
      "2026-10-22"
    );
    expect(earlySpan.isVisible).toBe(true);
    expect(earlySpan.startSlot).toBe(0);
    expect(earlySpan.spanSlots).toBe(4); // 08:00 to 10:00 = 4 slots
    expect(earlySpan.clampedStart).toBe(true);
    expect(earlySpan.clampedEnd).toBe(false);

    // Ends after 21:00 (e.g., 19:30 to 22:30)
    const lateSpan = getBookingSpan(
      "2026-10-22T19:30:00.000Z",
      "2026-10-22T22:30:00.000Z",
      "2026-10-22"
    );
    expect(lateSpan.isVisible).toBe(true);
    expect(lateSpan.startSlot).toBe(23); // 19:30
    expect(lateSpan.spanSlots).toBe(3); // 19:30 to 21:00 = 3 slots (23, 24, 25)
    expect(lateSpan.clampedStart).toBe(false);
    expect(lateSpan.clampedEnd).toBe(true);
  });

  it("provides valid fallback timetable bookings for offline display", async () => {
    const { FALLBACK_TIMETABLE_BOOKINGS } = await import("../src/data/schema");
    expect(FALLBACK_TIMETABLE_BOOKINGS.length).toBeGreaterThanOrEqual(10);

    const venueIds = new Set(FALLBACK_TIMETABLE_BOOKINGS.map((b) => b.venue_id));
    expect(venueIds.has(1)).toBe(true);
    expect(venueIds.has(2)).toBe(true);
    expect(venueIds.has(3)).toBe(true);
    expect(venueIds.has(4)).toBe(true);
    expect(venueIds.has(5)).toBe(true);

    for (const b of FALLBACK_TIMETABLE_BOOKINGS) {
      const span = getBookingSpan(b.start_datetime, b.end_datetime, "2026-10-22");
      expect(span.isVisible).toBe(true);
      expect(span.startSlot).toBeGreaterThanOrEqual(0);
      expect(span.spanSlots).toBeGreaterThanOrEqual(1);
    }
  });
});
