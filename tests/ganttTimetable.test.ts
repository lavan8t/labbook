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

    // Verify Status Legend is removed
    expect(html).not.toContain("Status Legend");

    // Verify category filters are removed
    expect(html).not.toContain("All Venues");
    expect(html).not.toContain("Auditoriums");
    expect(html).not.toContain("Lecture Halls");
    expect(html).not.toContain("Seminar Halls");

    // Verify venues are rendered
    expect(html).toContain("Anna Auditorium");
    expect(html).toContain("Kamaraj Mini Auditorium");

    // Verify events are rendered
    expect(html).toContain("ACM National Tech Symposium");

    // Verify DD/MM/YYYY date and railway time slot are rendered
    expect(html).toContain("22/10/2026");
    expect(html).toContain("08:00");
    expect(html).toContain("20:30");
  });
});
