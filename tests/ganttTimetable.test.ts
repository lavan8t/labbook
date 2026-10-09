import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { GanttTimetable } from "../src/components/GanttTimetable";
import { FALLBACK_VENUES, FALLBACK_TIMETABLE_BOOKINGS } from "../src/data/schema";

describe("GanttTimetable component", () => {
  it("exports GanttTimetable as a functional React component", () => {
    expect(typeof GanttTimetable).toBe("function");
  });

  it("renders timetable controls, venue list, and 30-minute slots without crashing", () => {
    const html = renderToString(
      React.createElement(GanttTimetable, {
        venues: FALLBACK_VENUES,
        bookings: FALLBACK_TIMETABLE_BOOKINGS,
        selectedDate: "2026-10-22",
        onDateChange: () => {},
        onSelectFreeSlot: () => {},
      })
    );

    // Verify key elements exist in rendered output
    expect(html).toContain("Status Legend");
    expect(html).toContain("Confirmed Booking");
    expect(html).toContain("Pending Review");
    expect(html).toContain("Available Slot");
    expect(html).toContain("All Venues");
    expect(html).toContain("Auditoriums");
    expect(html).toContain("Lecture Halls");
    expect(html).toContain("Seminar Halls");

    // Verify venues are rendered
    expect(html).toContain("Anna Auditorium");
    expect(html).toContain("Kamaraj Mini Auditorium");

    // Verify events are rendered
    expect(html).toContain("ACM National Tech Symposium");

    // Verify 8:00 AM slot is rendered
    expect(html).toContain("8:00 AM");
    expect(html).toContain("08:00");
  });
});
