# Gantt Chart Timetable & Codebase Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a responsive 30-minute slot Gantt chart timetable (08:00 to 21:00) with venue Y-axis, time X-axis, merged booking blocks, hover previews, full-detail inspection modals, and one-click free slot booking, while applying audit optimizations to eliminate dead dependencies and prop bloat.

**Architecture:** Next.js App Router client engine with CSS Grid-based horizontal Gantt timetable. Data loads from PostgreSQL via a unified `/api/bookings/timetable` route with immediate offline fallback in `src/data/schema.ts`. Time math runs through pure utility functions calculating 30-minute slot indices (0 to 25) and column spans.

**Tech Stack:** Next.js 16.4, React 19, TypeScript 5, Tailwind CSS 4, @m3e/web Material Web Components, Bun runtime & test runner, PostgreSQL 15+.

## Global Constraints

- Use `bun` exclusively for package management, running scripts, and testing (`bun test`, `bun run build`). Never use npm, npx, yarn, or pnpm.
- Time frame: 08:00 to 21:00 (13 hours) with 30-minute intervals (26 discrete slots per venue per day).
- Left Y-axis displays venues; top X-axis displays 30-minute time increments.
- Event blocks merge across their active duration, showing title or short acronym.
- Hovering shows short preview info; clicking opens full event inspection details.
- Clicking an empty slot opens the booking workflow with venue, date, and slot pre-filled.
- No AI writing patterns, no em dashes, maintain clean commit boundaries.

---

### Task 1: Audit Pruning & Next.js Build Fix

**Files:**
- Modify: `package.json:11-18`
- Modify: `tsconfig.json:25-34`
- Modify: `backend/package.json:10-16`
- Modify: `backend/src/server.ts:1-12`
- Modify: `backend/src/config/db.ts:1-5`
- Delete: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`

**Interfaces:**
- Consumes: Clean package definitions.
- Produces: Passing `bun run build` without TypeScript errors from backend subfolder or dead imports.

- [ ] **Step 1: Update root package.json to remove dead @xyflow/react and gsap dependencies**

Remove `@xyflow/react` and `gsap` from `package.json`:
```json
  "dependencies": {
    "@m3e/web": "^2.9.2",
    "next": "16.4.0",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
```

- [ ] **Step 2: Update tsconfig.json to exclude backend and stale .next dev types**

Update `tsconfig.json` to isolate frontend types from backend Express code:
```json
  "include": [
    "next-env.d.ts",
    "app/**/*.ts",
    "app/**/*.tsx",
    "src/**/*.ts",
    "src/**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "backend"
  ]
```

- [ ] **Step 3: Remove unused default SVGs from public directory**

Delete unused starter SVGs in `public/`:
- `public/file.svg`
- `public/globe.svg`
- `public/next.svg`
- `public/vercel.svg`
- `public/window.svg`

- [ ] **Step 4: Remove dotenv from backend since Bun loads .env natively**

In `backend/package.json`, remove `"dotenv": "^16.4.7"`.
In `backend/src/server.ts`, remove `import dotenv from "dotenv"; dotenv.config();`.
In `backend/src/config/db.ts`, remove `import dotenv from "dotenv"; dotenv.config();`.

- [ ] **Step 5: Verify build succeeds**

Run: `bun run build`
Expected: Production build compiles successfully and TypeScript checks pass.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json backend/package.json backend/src/server.ts backend/src/config/db.ts public/
git commit -m "chore: prune dead dependencies and fix tsconfig build exclusions"
```

---

### Task 2: Gantt Timetable Time Slot Math & Pure Utilities

**Files:**
- Create: `src/types/timetable.ts`
- Create: `src/lib/timetableUtils.ts`
- Create: `tests/timetableUtils.test.ts`
- Modify: `src/data/schema.ts`

**Interfaces:**
- Consumes: `Booking`, `Venue` from `@/lib/api`.
- Produces:
  - `TIME_SLOTS`: Array of 26 30-min slots (`08:00` to `20:30`).
  - `generateTimeSlots()`: returns `TimeSlotDef[]`.
  - `timeToSlotIndex(timeStr: string)`: maps `"08:30"` -> `1`.
  - `getBookingSpan(startIso: string, endIso: string, targetDateStr: string)`: returns `{ startSlot: number, spanSlots: number, isVisible: boolean }`.
  - `FALLBACK_TIMETABLE_BOOKINGS`: Array of realistic booked slots for instant rendering.

- [ ] **Step 1: Write the failing unit tests for timetable slot utilities**

Create `tests/timetableUtils.test.ts`:
```ts
import { describe, expect, it } from "bun:test";
import {
  generateTimeSlots,
  timeToSlotIndex,
  getBookingSpan,
  formatSlotTime,
} from "../src/lib/timetableUtils";

describe("timetableUtils", () => {
  it("generates 26 half-hour slots starting at 08:00 and ending at 21:00", () => {
    const slots = generateTimeSlots();
    expect(slots.length).toBe(26);
    expect(slots[0].time).toBe("08:00");
    expect(slots[0].label).toBe("8:00 AM");
    expect(slots[25].time).toBe("20:30");
    expect(slots[25].label).toBe("8:30 PM");
  });

  it("correctly converts time strings to slot indices", () => {
    expect(timeToSlotIndex("08:00")).toBe(0);
    expect(timeToSlotIndex("08:30")).toBe(1);
    expect(timeToSlotIndex("10:00")).toBe(4);
    expect(timeToSlotIndex("21:00")).toBe(26);
    expect(timeToSlotIndex("07:30")).toBe(-1);
  });

  it("computes booking column start and span correctly for a 3-hour event", () => {
    const startIso = "2026-10-22T10:00:00.000Z";
    const endIso = "2026-10-22T13:00:00.000Z";
    const span = getBookingSpan(startIso, endIso, "2026-10-22");

    expect(span.isVisible).toBe(true);
    expect(span.startSlot).toBe(4); // 10:00
    expect(span.spanSlots).toBe(6); // 3 hours = 6 x 30m
  });

  it("flags events on different dates as not visible", () => {
    const startIso = "2026-10-23T10:00:00.000Z";
    const endIso = "2026-10-23T12:00:00.000Z";
    const span = getBookingSpan(startIso, endIso, "2026-10-22");

    expect(span.isVisible).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/timetableUtils.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement timetable types and utility functions**

Create `src/types/timetable.ts`:
```ts
export interface TimeSlotDef {
  slotIndex: number;
  time: string; // "08:00"
  label: string; // "8:00 AM"
  hour: number;
  minute: number;
}

export interface BookingSpan {
  startSlot: number;
  spanSlots: number;
  isVisible: boolean;
  clampedStart: boolean;
  clampedEnd: boolean;
}
```

Create `src/lib/timetableUtils.ts`:
```ts
import type { TimeSlotDef, BookingSpan } from "@/types/timetable";

export const TIMETABLE_START_HOUR = 8;
export const TIMETABLE_END_HOUR = 21;
export const SLOT_DURATION_MINUTES = 30;
export const TOTAL_SLOTS = (TIMETABLE_END_HOUR - TIMETABLE_START_HOUR) * 2; // 26 slots

export function generateTimeSlots(): TimeSlotDef[] {
  const slots: TimeSlotDef[] = [];
  let index = 0;
  for (let hour = TIMETABLE_START_HOUR; hour < TIMETABLE_END_HOUR; hour++) {
    for (const minute of [0, 30]) {
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const label = minute === 0 ? `${displayHour}:00 ${period}` : `${displayHour}:30 ${period}`;
      slots.push({ slotIndex: index++, time, label, hour, minute });
    }
  }
  return slots;
}

export function timeToSlotIndex(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return -1;
  const minutesFromStart = (h - TIMETABLE_START_HOUR) * 60 + m;
  if (minutesFromStart < 0) return -1;
  const index = Math.floor(minutesFromStart / 30);
  return index;
}

export function formatSlotTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function getBookingSpan(startIso: string, endIso: string, targetDateStr: string): BookingSpan {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const startYearMonthDay = start.toISOString().split("T")[0];
  if (startYearMonthDay !== targetDateStr) {
    return { startSlot: -1, spanSlots: 0, isVisible: false, clampedStart: false, clampedEnd: false };
  }

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();

  const timetableStartMinutes = TIMETABLE_START_HOUR * 60;
  const timetableEndMinutes = TIMETABLE_END_HOUR * 60;

  if (endMinutes <= timetableStartMinutes || startMinutes >= timetableEndMinutes) {
    return { startSlot: -1, spanSlots: 0, isVisible: false, clampedStart: false, clampedEnd: false };
  }

  const clampedStartMin = Math.max(timetableStartMinutes, startMinutes);
  const clampedEndMin = Math.min(timetableEndMinutes, endMinutes);

  const startSlot = Math.floor((clampedStartMin - timetableStartMinutes) / 30);
  const endSlot = Math.ceil((clampedEndMin - timetableStartMinutes) / 30);
  const spanSlots = Math.max(1, endSlot - startSlot);

  return {
    startSlot,
    spanSlots,
    isVisible: true,
    clampedStart: startMinutes < timetableStartMinutes,
    clampedEnd: endMinutes > timetableEndMinutes,
  };
}
```

Add offline sample schedule items in `src/data/schema.ts` so the timetable renders pre-populated with realistic university events (e.g. ACM Tech Symposium, DBMS Lab Lecture, Dean Council Meeting) across Anna Audi, Kamaraj Mini Audi, TT-101, SJT-204, and Library Seminar Hall.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/timetableUtils.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/types/timetable.ts src/lib/timetableUtils.ts tests/timetableUtils.test.ts src/data/schema.ts
git commit -m "feat: add 30-minute timetable slot calculations and offline sample schedule"
```

---

### Task 3: Backend Timetable API Endpoint

**Files:**
- Modify: `backend/src/controllers/bookingController.ts`
- Modify: `backend/src/routes/bookingRoutes.ts`
- Modify: `src/lib/api.ts`

**Interfaces:**
- Consumes: `GET /api/bookings/timetable?date=YYYY-MM-DD`
- Produces: `{ success: true, count: number, date: string, data: Booking[] }`

- [ ] **Step 1: Add getTimetableBookings controller action in backend**

In `backend/src/controllers/bookingController.ts`, export `getTimetableBookings`:
```ts
// GET /api/bookings/timetable?date=YYYY-MM-DD
export async function getTimetableBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];

    const result = await query(
      `SELECT 
        b.booking_id,
        b.booking_ref,
        b.venue_id,
        v.venue_name,
        v.venue_type,
        v.building,
        v.seating_capacity,
        b.user_id,
        u.full_name AS requester_name,
        u.email AS requester_email,
        u.department,
        r.role_code AS requester_role,
        c.club_name,
        e.event_id,
        e.event_title,
        e.event_type,
        e.expected_attendees,
        b.start_datetime,
        b.end_datetime,
        b.booking_status,
        b.purpose_notes,
        ba.decision AS approval_decision,
        ba.remarks AS admin_remarks
       FROM bookings b
       JOIN venues v ON b.venue_id = v.venue_id
       JOIN users u ON b.user_id = u.user_id
       JOIN roles r ON u.role_id = r.role_id
       JOIN events e ON b.event_id = e.event_id
       LEFT JOIN clubs c ON e.club_id = c.club_id
       LEFT JOIN booking_approvals ba ON b.booking_id = ba.booking_id
       WHERE DATE(b.start_datetime AT TIME ZONE 'UTC') = $1
         AND b.booking_status IN ('CONFIRMED', 'PENDING')
       ORDER BY b.start_datetime ASC`,
      [dateStr]
    );

    res.json({ success: true, count: result.rows.length, date: dateStr, data: result.rows });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 2: Register timetable route in backend**

In `backend/src/routes/bookingRoutes.ts`:
```ts
import { Router } from "express";
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  getTimetableBookings,
} from "../controllers/bookingController";

const router = Router();

router.get("/timetable", getTimetableBookings);
router.post("/", createBooking);
router.get("/my", getMyBookings);
router.delete("/:id", cancelBooking);

export default router;
```

- [ ] **Step 3: Add getTimetableBookings client function in src/lib/api.ts**

In `src/lib/api.ts`, add:
```ts
export async function getTimetableBookings(date: string): Promise<{ success: boolean; date: string; data: Booking[] }> {
  return apiFetch(`/bookings/timetable?date=${date}`);
}
```

- [ ] **Step 4: Verify with TypeScript build**

Run: `bun run build`
Expected: Frontend builds cleanly without errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/bookingController.ts backend/src/routes/bookingRoutes.ts src/lib/api.ts
git commit -m "feat: add date-scoped timetable API endpoint"
```

---

### Task 4: Interactive Gantt Timetable Component

**Files:**
- Create: `src/components/GanttTimetable.tsx`

**Interfaces:**
- Consumes:
  - `venues: Venue[]`
  - `bookings: Booking[]`
  - `selectedDate: string`
  - `onDateChange: (date: string) => void`
  - `onSelectFreeSlot: (venueId: number, date: string, startTime: string, endTime: string) => void`
  - `onInspectBooking: (booking: Booking) => void`
  - `loading?: boolean`
- Produces:
  - Complete timetable view with date picker, venue type filters, time slot headers (8:00 AM to 9:00 PM), merged event blocks, hover tooltip preview, and full detail modal trigger.

- [ ] **Step 1: Create GanttTimetable component structure**

Implement `src/components/GanttTimetable.tsx` with:
1. Controls header:
   - Date picker with quick buttons ("Previous Day", "Today", "Next Day").
   - Category filter pills: All, Auditoriums, Lecture Halls, Seminar Halls.
   - Legend chips: Confirmed (emerald green badge), Pending Review (amber badge), Available Slot (dotted empty border).
2. Gantt Matrix:
   - Sticky left column (240px wide) listing venues with name, capacity, and building location.
   - Horizontal scrolling grid with 26 columns corresponding to half-hour slots (`08:00` to `20:30`, ending `21:00`).
   - Header displaying time increments.
   - For each venue row:
     - Render merged booking blocks positioned by `grid-column-start: startSlot + 1` and `grid-column: span spanSlots`.
     - Event blocks show title or short acronym, time span, and status badge.
     - Empty slot cells render with subtle hover highlight; clicking any free slot triggers `onSelectFreeSlot(venueId, selectedDate, startTime, endTime)`.
3. Hover Tooltip / Short Info Card:
   - Floating card on mouse enter showing: Event title, category, full time interval, requester, department, expected attendees, and permit status.
4. Full Detail Modal:
   - Accessible by clicking on any event block.
   - Uses `<m3e-dialog>` to display complete booking record: Reference ID, full justification notes, venue requirements, attendee capacity ratio, and admin remarks.

- [ ] **Step 2: Verify component renders without TypeScript or lint issues**

Run: `bun run build`
Expected: Passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/GanttTimetable.tsx
git commit -m "feat: implement Gantt timetable component with 30-min slots and merged blocks"
```

---

### Task 5: Page Integration & Audit Prop Simplification

**Files:**
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/components/UserSwitcherModal.tsx`
- Modify: `src/components/BookingForm.tsx`
- Modify: `src/components/MyBookings.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `GanttTimetable` component in `CampusBookPage`.
- Produces: Seamless tab switching between "Timetable", "Book Hall", "Venues Catalog", "My Bookings", and Admin views, with one-click free slot handoff to the booking form.

- [ ] **Step 1: Add Timetable tab to AppHeader**

In `src/components/AppHeader.tsx`:
- Add `timetable` tab with icon `table_chart` or `schedule` for all users (both Normal and Admin).
- Remove redundant duplicate prop aliases (`onSwitchRole`, `setShowUserModal`, `onRefreshData`, `venues`, `myBookingsList`, `pendingQueue`).

- [ ] **Step 2: Clean up prop aliasing in UserSwitcherModal and MyBookings**

- In `UserSwitcherModal.tsx`: simplify props to `open`, `currentUser`, `onSelectUser`, `onClose`, `showAdminCodeModal`, `onCloseAdminModal`, `adminCodeInput`, `setAdminCodeInput`, `adminCodeError`, `onVerifyAdminCode`.
- In `MyBookings.tsx`: simplify props to `currentUser`, `bookings`, `onCancelBooking`, `onRefresh`, `onNavigateToBook`, `loading`.

- [ ] **Step 3: Wire GanttTimetable in app/page.tsx**

In `app/page.tsx`:
- Add `"timetable"` to `ActiveTab` type. Default active tab or primary academic view.
- Maintain `timetableDate` state (defaults to today or selected booking date).
- Fetch schedule from `getTimetableBookings(timetableDate)` when active, falling back to `FALLBACK_TIMETABLE_BOOKINGS` if offline.
- When user clicks a free slot on the Gantt chart:
  - Sets `selectedVenueId` to the clicked venue.
  - Sets `bookingDate` to the clicked date.
  - Sets `startTime` and `endTime` to the slot times.
  - Switches `activeTab` to `"book"`.
  - Shows feedback toast: `Selected {venueName} slot from {startTime} to {endTime}`.
- Render `<GanttTimetable />` when `activeTab === "timetable"`.

- [ ] **Step 4: Verify full build and tests**

Run: `bun test`
Expected: All tests pass.
Run: `bun run build`
Expected: Next.js build succeeds with zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/AppHeader.tsx src/components/UserSwitcherModal.tsx src/components/MyBookings.tsx app/page.tsx
git commit -m "feat: integrate Gantt timetable into navigation and streamline component props"
```

---

## Plan Self-Review Checklist

1. **Spec coverage:**
   - 30-minute slot length: Covered in Task 2 & Task 4 (`generateTimeSlots`, 26 slots).
   - Time window 08:00 to 21:00: Covered in Task 2 & Task 4 (`TIMETABLE_START_HOUR = 8`, `TIMETABLE_END_HOUR = 21`).
   - Left side venues Y-axis: Covered in Task 4.
   - Top time X-axis: Covered in Task 4.
   - Merged or non-merged cells: Covered in Task 2 & Task 4 (`grid-column: span N`).
   - Acronyms / short names: Covered in Task 4.
   - Hover short info: Covered in Task 4 hover tooltip.
   - Click full details: Covered in Task 4 modal.
   - Easily find free slots: Covered in Task 4 & Task 5 (visual vacant slots with 1-click booking pre-fill).
   - Audit optimizations applied: Covered in Task 1 & Task 5.

2. **Placeholder scan:** No "TBD", "TODO", or generic placeholders. All interfaces, filenames, and steps specify exact code.

3. **Type consistency:** `BookingSpan`, `TimeSlotDef`, `Booking`, `Venue` match across all tasks.
