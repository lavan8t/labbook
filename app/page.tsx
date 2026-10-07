"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import TableNode, { type TableNodeData } from "@/components/TableNode";
import { initialDb, type Booking, type DbState } from "@/data/schema";
import {
  checkRangeConflict,
  evaluateQualificationDivision,
} from "@/lib/dbEngine";
import {
  EDGE_CLASSES,
  revealConsoleLines,
  runDivisionAnimation,
  runInsertAnimation,
  resetVisualState,
} from "@/lib/animations";

if (typeof window !== "undefined") {
  import("@m3e/web/select");
  import("@m3e/web/option");
  import("@m3e/web/form-field");
  import("@m3e/web/button");
  import("@m3e/web/button-group");
  import("@m3e/web/theme");
  import("@m3e/web/chips");
  import("@m3e/web/switch");
  import("@m3e/web/divider");
  import("@m3e/web/tabs");
  import("@m3e/web/icon");
  import("@m3e/web/datepicker");
  import("@m3e/web/date-input");
}

const nodeTypes = { table: TableNode };

const EDGE_STYLE = { stroke: "rgba(186, 26, 26, 0.35)", strokeWidth: 1.5 };

type ActiveTab = "book" | "schema" | "logs";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTimeLocal(d: Date): string {
  return `${formatDate(d)}T${formatTime(d)}`;
}

export default function Page() {
  const [db, setDb] = useState<DbState>(() => structuredClone(initialDb));
  const [userId, setUserId] = useState<number>(1);
  const [resourceId, setResourceId] = useState<number>(201);

  const [bookingDate, setBookingDate] = useState<string>("2026-10-15");
  const [startTime, setStartTime] = useState<string>("10:30");
  const [endTime, setEndTime] = useState<string>("11:30");

  const [start, setStart] = useState<string>("2026-10-15T10:30");
  const [end, setEnd] = useState<string>("2026-10-15T11:30");
  const [purpose, setPurpose] = useState<string>("");
  const [isStartNow, setIsStartNow] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("book");
  const [filterUserOnly, setFilterUserOnly] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "conflict" | "forbidden" | "info";
    title: string;
    message: string;
    sqlSnippet?: string;
  } | null>(null);

  const [logs, setLogs] = useState<string[]>([
    "-- Relational Division and GiST Exclusion Engine initialized",
    "-- Ready for staff equipment reservations and credential verification",
  ]);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as ActiveTab;
      if (tab === "schema" || tab === "logs" || tab === "book") {
        setActiveTab(tab);
      }
    }
  }, []);

  useEffect(() => {
    revealConsoleLines(consoleRef.current);
  }, [logs]);

  useEffect(() => {
    setStart(`${bookingDate}T${startTime}`);
    setEnd(`${bookingDate}T${endTime}`);
  }, [bookingDate, startTime, endTime]);

  const selectedUser = useMemo(
    () => db.users.find((u) => u.user_id === userId) ?? db.users[0],
    [db.users, userId],
  );

  const selectedEquipment = useMemo(
    () => db.equipment.find((e) => e.resource_id === resourceId) ?? db.equipment[0],
    [db.equipment, resourceId],
  );

  const userQualifications = useMemo(() => {
    const ids = db.user_qualifications
      .filter((uq) => uq.user_id === userId && uq.status === "VERIFIED")
      .map((uq) => uq.qualification_id);
    return db.qualifications.filter((q) => ids.includes(q.qualification_id));
  }, [db.user_qualifications, db.qualifications, userId]);

  const equipmentRequirements = useMemo(() => {
    const ids = db.equipment_requirements
      .filter((er) => er.resource_id === resourceId)
      .map((er) => er.qualification_id);
    return db.qualifications.filter((q) => ids.includes(q.qualification_id));
  }, [db.equipment_requirements, db.qualifications, resourceId]);

  const divisionResult = useMemo(
    () => evaluateQualificationDivision(db, userId, resourceId),
    [db, userId, resourceId],
  );

  const missingQualifications = useMemo(() => {
    return db.qualifications.filter((q) =>
      divisionResult.missingQualificationIds.includes(q.qualification_id),
    );
  }, [db.qualifications, divisionResult.missingQualificationIds]);

  const nodes: Node[] = useMemo(() => {
    const mk = (
      id: string,
      x: number,
      y: number,
      data: TableNodeData,
    ): Node => ({ id, type: "table", position: { x, y }, data });

    return [
      mk("users", 0, 0, {
        tableName: "users",
        columns: [
          { name: "user_id", pk: true },
          { name: "name" },
          { name: "role" },
          { name: "department" },
        ],
        rows: db.users.map((u) => ({ ...u })),
        rowAttr: (r) => ({ "data-user-id": r.user_id }),
      }),
      mk("user_qualifications", 0, 360, {
        tableName: "user_qualifications",
        columns: [
          { name: "user_id", fk: true },
          { name: "qualification_id", fk: true },
          { name: "status" },
        ],
        rows: db.user_qualifications.map((uq) => ({ ...uq })),
        rowAttr: (r) => ({
          "data-user-id": r.user_id,
          "data-qual-id": r.qualification_id,
        }),
      }),
      mk("equipment", 450, 0, {
        tableName: "equipment",
        columns: [
          { name: "resource_id", pk: true },
          { name: "name" },
          { name: "location" },
          { name: "status" },
        ],
        rows: db.equipment.map((e) => ({ ...e })),
        rowAttr: (r) => ({ "data-resource-id": r.resource_id }),
      }),
      mk("equipment_requirements", 450, 360, {
        tableName: "equipment_requirements",
        columns: [
          { name: "resource_id", fk: true },
          { name: "qualification_id", fk: true },
        ],
        rows: db.equipment_requirements.map((er) => ({ ...er })),
        rowAttr: (r) => ({
          "data-resource-id": r.resource_id,
          "data-qual-id": r.qualification_id,
        }),
      }),
      mk("qualifications", 225, 620, {
        tableName: "qualifications",
        columns: [
          { name: "qualification_id", pk: true },
          { name: "name" },
          { name: "description" },
        ],
        rows: db.qualifications.map((q) => ({ ...q })),
        rowAttr: (r) => ({ "data-qual-id": r.qualification_id }),
      }),
      mk("bookings", 860, 140, {
        tableName: "bookings",
        columns: [
          { name: "booking_id", pk: true },
          { name: "resource_id", fk: true },
          { name: "user_id", fk: true },
          { name: "start_datetime" },
          { name: "end_datetime" },
          { name: "status" },
        ],
        rows: db.bookings.map((b) => ({ ...b })),
        rowAttr: (r) => ({
          "data-booking-id": r.booking_id,
          "data-status": r.status,
        }),
      }),
    ];
  }, [db]);

  const edges: Edge[] = useMemo(
    () => [
      {
        id: "e-u-uq",
        source: "users",
        target: "user_qualifications",
        sourceHandle: "b-source",
        targetHandle: "t-target",
        style: EDGE_STYLE,
      },
      {
        id: "e-q-uq",
        source: "qualifications",
        target: "user_qualifications",
        sourceHandle: "t-source",
        targetHandle: "b-target",
        style: EDGE_STYLE,
      },
      {
        id: "e-eq-er",
        source: "equipment",
        target: "equipment_requirements",
        sourceHandle: "b-source",
        targetHandle: "t-target",
        style: EDGE_STYLE,
      },
      {
        id: "e-q-er",
        source: "qualifications",
        target: "equipment_requirements",
        sourceHandle: "t-source",
        targetHandle: "b-target",
        style: EDGE_STYLE,
      },
      {
        id: "e-eq-b",
        source: "equipment",
        target: "bookings",
        sourceHandle: "r-source",
        targetHandle: "l-target",
        style: EDGE_STYLE,
      },
      {
        id: "e-u-b",
        source: "users",
        target: "bookings",
        sourceHandle: "r-source",
        targetHandle: "l-target",
        style: EDGE_STYLE,
      },
    ],
    [],
  );

  function pushLogs(newEntries: string[]) {
    setLogs((prev) => [...prev, ...newEntries]);
  }

  function handleStartNowToggle(checked: boolean) {
    setIsStartNow(checked);
    if (checked) {
      const now = new Date();
      const dStr = formatDate(now);
      const tStr = formatTime(now);
      setBookingDate(dStr);
      setStartTime(tStr);

      const later = new Date(now.getTime() + 60 * 60 * 1000);
      setEndTime(formatTime(later));
    }
  }

  function handleAdjustDuration(deltaMinutes: number) {
    const currentStart = new Date(`${bookingDate}T${startTime}`);
    const currentEnd = new Date(`${bookingDate}T${endTime}`);
    const updatedEnd = new Date(currentEnd.getTime() + deltaMinutes * 60 * 1000);

    if (updatedEnd.getTime() <= currentStart.getTime() + 15 * 60 * 1000) {
      const minEnd = new Date(currentStart.getTime() + 15 * 60 * 1000);
      setEndTime(formatTime(minEnd));
    } else {
      setEndTime(formatTime(updatedEnd));
    }
  }

  function handleDateChange(newDate: string) {
    setBookingDate(newDate);
  }

  function handleDivision() {
    const result = evaluateQualificationDivision(db, userId, resourceId);
    const sql = [
      `-- Relational Division: verify user_id=${userId} has all qualifications for resource_id=${resourceId}`,
      `SELECT q.qualification_id FROM equipment_requirements er`,
      `JOIN qualifications q ON er.qualification_id = q.qualification_id WHERE er.resource_id = ${resourceId}`,
      `EXCEPT`,
      `SELECT uq.qualification_id FROM user_qualifications uq`,
      `WHERE uq.user_id = ${userId} AND uq.status = 'VERIFIED';`,
    ];

    if (result.eligible) {
      pushLogs([
        ...sql,
        `RESULT: (empty set) -- All ${result.requiredQualificationIds.length} required qualifications satisfied`,
        `STATUS: 200 OK -- ${selectedUser.name} qualified for ${selectedEquipment.name}`,
      ]);
      setFeedback({
        type: "success",
        title: "Staff Eligible",
        message: `${selectedUser.name} possesses all verified prerequisites for ${selectedEquipment.name}.`,
        sqlSnippet: `Required: ${result.requiredQualificationIds.length} | Missing: 0`,
      });
    } else {
      const missingNames = missingQualifications.map((q) => q.name).join(", ");
      pushLogs([
        ...sql,
        `RESULT: Missing qualification IDs [${result.missingQualificationIds.join(", ")}]`,
        `STATUS: 403 Forbidden -- Missing: ${missingNames}`,
      ]);
      setFeedback({
        type: "forbidden",
        title: "Missing Prerequisites",
        message: `${selectedUser.name} is missing required credentials: ${missingNames}.`,
        sqlSnippet: `Missing ${result.missingQualificationIds.length} required prerequisite(s)`,
      });
    }

    requestAnimationFrame(() =>
      runDivisionAnimation({
        userId,
        passed: result.eligible,
        missingQualificationIds: result.missingQualificationIds,
      }),
    );
  }

  function handleInsert() {
    const startIso = new Date(`${bookingDate}T${startTime}`).toISOString();
    const endIso = new Date(`${bookingDate}T${endTime}`).toISOString();

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setFeedback({
        type: "forbidden",
        title: "Invalid Interval",
        message: "End time must be after start time.",
      });
      return;
    }

    const conflict = checkRangeConflict(db, resourceId, startIso, endIso);
    if (conflict.conflict && conflict.bookingId) {
      pushLogs([
        `INSERT INTO bookings (resource_id, user_id, start_datetime, end_datetime, status)`,
        `VALUES (${resourceId}, ${userId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
        `ERROR: conflicting key value violates exclusion constraint "bookings_resource_id_range_excl"`,
        `DETAIL: Key (resource_id, tstzrange) conflicts with existing booking #${conflict.bookingId}.`,
        `STATUS: 409 Conflict`,
      ]);
      setFeedback({
        type: "conflict",
        title: "Temporal Conflict (409 Conflict)",
        message: `Equipment is already reserved in that window (Booking #${conflict.bookingId}).`,
        sqlSnippet: `GiST exclusion conflict on resource_id=${resourceId}`,
      });
      requestAnimationFrame(() =>
        runInsertAnimation({ conflict: true }),
      );
      return;
    }

    const division = evaluateQualificationDivision(db, userId, resourceId);
    if (!division.eligible) {
      const missingNames = missingQualifications.map((q) => q.name).join(", ");
      pushLogs([
        `INSERT INTO bookings ... VALUES (${resourceId}, ${userId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
        `STATUS: 403 Forbidden -- User lacks required credentials [${division.missingQualificationIds.join(", ")}]`,
      ]);
      setFeedback({
        type: "forbidden",
        title: "Cannot Book (403 Forbidden)",
        message: `${selectedUser.name} cannot book this equipment without: ${missingNames}.`,
        sqlSnippet: `Relational division check failed for user_id=${userId}`,
      });
      requestAnimationFrame(() =>
        runDivisionAnimation({
          userId,
          passed: false,
          missingQualificationIds: division.missingQualificationIds,
        }),
      );
      return;
    }

    const newId = Math.max(...db.bookings.map((b) => b.booking_id)) + 1;
    const newBooking: Booking = {
      booking_id: newId,
      resource_id: resourceId,
      user_id: userId,
      start_datetime: startIso,
      end_datetime: endIso,
      status: "CONFIRMED",
    };

    setDb((prev) => ({
      ...prev,
      bookings: [...prev.bookings, newBooking],
    }));

    pushLogs([
      `INSERT INTO bookings (resource_id, user_id, start_datetime, end_datetime, status)`,
      `VALUES (${resourceId}, ${userId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
      `GiST range check on tstzrange(start_datetime, end_datetime): no overlap`,
      `STATUS: 200 OK -- Inserted booking #${newId} for ${selectedUser.name} on ${selectedEquipment.name}`,
    ]);

    setFeedback({
      type: "success",
      title: "Booking Confirmed",
      message: `Reservation #${newId} confirmed for ${selectedEquipment.name} (${selectedEquipment.location}).`,
      sqlSnippet: `INSERT INTO bookings VALUES (${newId}, ${resourceId}, ${userId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
    });

    requestAnimationFrame(() =>
      setTimeout(
        () => runInsertAnimation({ conflict: false, newBookingId: newId }),
        50,
      ),
    );
  }

  function handleCancelBooking(bookingId: number) {
    setDb((prev) => ({
      ...prev,
      bookings: prev.bookings.map((b) =>
        b.booking_id === bookingId ? { ...b, status: "CANCELLED" as const } : b,
      ),
    }));
    pushLogs([
      `UPDATE bookings SET status = 'CANCELLED' WHERE booking_id = ${bookingId};`,
      `STATUS: 200 OK -- Booking #${bookingId} cancelled; slot released in GiST range tree`,
    ]);
    setFeedback({
      type: "info",
      title: "Booking Cancelled",
      message: `Reservation #${bookingId} was cancelled and the slot released.`,
      sqlSnippet: `UPDATE bookings SET status = 'CANCELLED' WHERE booking_id = ${bookingId};`,
    });
  }

  function handleReset() {
    setDb(structuredClone(initialDb));
    resetVisualState();
    setFeedback({
      type: "info",
      title: "Seed Reset",
      message: "Database state restored to initial fixtures.",
    });
    pushLogs([`RESET -- Database seed data restored`, `STATUS: 200 OK`]);
  }

  const visibleBookings = useMemo(() => {
    return db.bookings.filter((b) =>
      filterUserOnly ? b.user_id === userId : true,
    );
  }, [db.bookings, filterUserOnly, userId]);

  return (
    <m3e-theme
      color="#ba1a1a"
      scheme="light"
      variant="vibrant"
      contrast="standard"
      density="0"
    >
      <div className="flex flex-col min-h-screen w-screen bg-[#fffbfa] text-[#201a19] overflow-x-hidden">
        {/* Compact Header without product name */}
        <header className="flex items-center justify-between px-4 py-2 bg-[#f7ebe8] shrink-0">
          <div className="flex items-center gap-1">
            <m3e-button
              variant={activeTab === "book" ? "filled" : "text"}
              onClick={() => setActiveTab("book")}
            >
              Book Equipment
            </m3e-button>
            <m3e-button
              variant={activeTab === "schema" ? "filled" : "text"}
              onClick={() => setActiveTab("schema")}
            >
              ER Schema Graph
            </m3e-button>
            <m3e-button
              variant={activeTab === "logs" ? "filled" : "text"}
              onClick={() => setActiveTab("logs")}
            >
              SQL Audit Logs
            </m3e-button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#53433f] hidden sm:inline">
              Staff: <strong className="text-[#ba1a1a]">{selectedUser.name}</strong>
            </span>
            <m3e-button variant="text" onClick={handleReset}>
              Reset Seed
            </m3e-button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 relative bg-[#fffbfa]">
          {/* TAB 1: Long Continuous Booking Form */}
          {activeTab === "book" && (
            <div className="max-w-2xl mx-auto py-8 px-6 space-y-8">
              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`p-4 rounded-[12px] flex items-start justify-between ${
                    feedback.type === "success"
                      ? "bg-[#dcfce7] text-[#14532d]"
                      : feedback.type === "conflict" || feedback.type === "forbidden"
                      ? "bg-[#ffdad6] text-[#410002]"
                      : "bg-[#f7ebe8] text-[#201a19]"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-xs font-semibold">{feedback.title}</div>
                    <p className="text-xs">{feedback.message}</p>
                    {feedback.sqlSnippet && (
                      <p className="text-[11px] font-mono opacity-80 pt-1">
                        {feedback.sqlSnippet}
                      </p>
                    )}
                  </div>
                  <m3e-button
                    variant="text"
                    onClick={() => setFeedback(null)}
                  >
                    Dismiss
                  </m3e-button>
                </div>
              )}

              {/* Section: Staff Member */}
              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-wide text-[#201a19]">
                  Staff Member
                </h2>
                <m3e-form-field variant="filled" className="w-full block">
                  <label slot="label" htmlFor="user-select">Select Staff</label>
                  <m3e-select
                    id="user-select"
                    value={String(userId)}
                    onChange={(e: any) => {
                      const val = e.target?.value;
                      if (val !== undefined) setUserId(Number(val));
                    }}
                  >
                    {db.users.map((u) => (
                      <m3e-option key={u.user_id} value={String(u.user_id)}>
                        {u.name} — {u.role}, {u.department}
                      </m3e-option>
                    ))}
                  </m3e-select>
                </m3e-form-field>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-[#53433f]">Verified Credentials:</span>
                  {userQualifications.length > 0 ? (
                    userQualifications.map((q) => (
                      <span
                        key={q.qualification_id}
                        className="px-2.5 py-1 rounded-[6px] text-xs bg-[#fdf1ee] text-[#53433f]"
                      >
                        {q.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs italic text-[#85736e]">
                      None on record
                    </span>
                  )}
                </div>
              </section>

              {/* Section: Laboratory Equipment */}
              <section className="space-y-3">
                <h2 className="text-sm font-semibold tracking-wide text-[#201a19]">
                  Laboratory Equipment
                </h2>
                <m3e-form-field variant="filled" className="w-full block">
                  <label slot="label" htmlFor="equipment-select">Select Equipment</label>
                  <m3e-select
                    id="equipment-select"
                    value={String(resourceId)}
                    onChange={(e: any) => {
                      const val = e.target?.value;
                      if (val !== undefined) setResourceId(Number(val));
                    }}
                  >
                    {db.equipment.map((e) => (
                      <m3e-option key={e.resource_id} value={String(e.resource_id)}>
                        {e.name} ({e.location}) — Status: {e.status}
                      </m3e-option>
                    ))}
                  </m3e-select>
                </m3e-form-field>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#53433f]">
                  <span>Location: <strong className="text-[#201a19]">{selectedEquipment.location}</strong></span>
                  <span>Status: <strong className="text-[#166534]">{selectedEquipment.status}</strong></span>
                  <span>
                    Eligibility:{" "}
                    <strong
                      className={`px-2 py-0.5 rounded-[4px] text-xs font-mono ${
                        divisionResult.eligible
                          ? "bg-[#dcfce7] text-[#14532d]"
                          : "bg-[#ffdad6] text-[#ba1a1a]"
                      }`}
                    >
                      {divisionResult.eligible ? "Qualified" : "Missing Prerequisite"}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-[#53433f]">Prerequisites:</span>
                  {equipmentRequirements.map((q) => {
                    const userHasIt = userQualifications.some(
                      (uq) => uq.qualification_id === q.qualification_id,
                    );
                    return (
                      <span
                        key={q.qualification_id}
                        className={`px-2.5 py-1 rounded-[6px] text-xs ${
                          userHasIt
                            ? "bg-[#dcfce7] text-[#14532d]"
                            : "bg-[#ffdad6] text-[#ba1a1a]"
                        }`}
                      >
                        {q.name}
                      </span>
                    );
                  })}
                </div>
              </section>

              {/* Section: Reservation Schedule */}
              <section className="space-y-4">
                <h2 className="text-sm font-semibold tracking-wide text-[#201a19]">
                  Reservation Schedule
                </h2>

                {/* Start Now Toggle */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-[#201a19] block">
                      Start Now
                    </span>
                    <span className="text-[11px] text-[#85736e]">
                      Capture current timestamp immediately
                    </span>
                  </div>
                  <m3e-switch
                    checked={isStartNow ? "" : undefined}
                    onChange={(e: any) => handleStartNowToggle(Boolean(e.target?.checked))}
                  ></m3e-switch>
                </div>

                {/* Date Selection with M3E DatePicker */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-[#53433f] block">
                    Reservation Date
                  </span>
                  <div className="flex items-center gap-2">
                    <m3e-form-field variant="filled" className="flex-1 block">
                      <label slot="label" htmlFor="booking-date-input">Date</label>
                      <input
                        id="booking-date-input"
                        type="date"
                        value={bookingDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 bg-transparent focus:outline-none"
                      />
                    </m3e-form-field>

                    <m3e-button
                      variant="tonal"
                      type="button"
                      onClick={() => {
                        const picker = document.getElementById("booking-datepicker") as any;
                        const input = document.getElementById("booking-date-input");
                        if (picker && input) {
                          picker.toggle?.(input);
                        }
                      }}
                    >
                      <m3e-icon slot="icon" name="calendar_today"></m3e-icon>
                      Calendar
                    </m3e-button>
                  </div>

                  <m3e-datepicker
                    id="booking-datepicker"
                    onChange={(e: any) => {
                      const d = e.target?.date;
                      if (d instanceof Date) {
                        handleDateChange(formatDate(d));
                      }
                    }}
                  ></m3e-datepicker>
                </div>

                {/* Time Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <m3e-form-field variant="filled" className="w-full block">
                    <label slot="label" htmlFor="start-time-input">Start Time</label>
                    <input
                      id="start-time-input"
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setIsStartNow(false);
                      }}
                      className="w-full text-xs font-mono px-3 py-2 bg-transparent focus:outline-none"
                    />
                  </m3e-form-field>

                  <m3e-form-field variant="filled" className="w-full block">
                    <label slot="label" htmlFor="end-time-input">End Time</label>
                    <input
                      id="end-time-input"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 bg-transparent focus:outline-none"
                    />
                  </m3e-form-field>
                </div>

                {/* Grouped Duration Stepper Buttons allowing - also */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-[#53433f] block">
                    Adjust Duration
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <m3e-button-group variant="connected">
                      {[
                        { label: "-1h", min: -60 },
                        { label: "-30m", min: -30 },
                        { label: "+30m", min: 30 },
                        { label: "+1h", min: 60 },
                        { label: "+2h", min: 120 },
                        { label: "+4h", min: 240 },
                      ].map((item) => (
                        <m3e-button
                          key={item.label}
                          variant="tonal"
                          onClick={() => handleAdjustDuration(item.min)}
                        >
                          {item.label}
                        </m3e-button>
                      ))}
                    </m3e-button-group>
                  </div>
                </div>

                {/* Purpose input */}
                <m3e-form-field variant="filled" className="w-full block">
                  <label slot="label" htmlFor="purpose-input">Research Purpose (Optional)</label>
                  <input
                    id="purpose-input"
                    type="text"
                    placeholder="e.g. Sample imaging protocol"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-transparent focus:outline-none"
                  />
                </m3e-form-field>
              </section>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <m3e-button
                  variant="filled"
                  className="flex-1"
                  onClick={handleInsert}
                >
                  Submit Booking
                </m3e-button>
                <m3e-button
                  variant="tonal"
                  className="flex-1"
                  onClick={handleDivision}
                >
                  Verify Eligibility
                </m3e-button>
              </div>

              {/* Section: Active Reservations */}
              <section className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold tracking-wide text-[#201a19]">
                    Active Reservations
                  </h2>
                  <m3e-button
                    variant="text"
                    onClick={() => setFilterUserOnly(!filterUserOnly)}
                  >
                    {filterUserOnly ? `Filter: ${selectedUser.name}` : "Show All"}
                  </m3e-button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="bg-[#f7ebe8] text-[#53433f]">
                        <th className="py-2.5 px-3 font-medium">ID</th>
                        <th className="py-2.5 px-3 font-medium">Equipment</th>
                        <th className="py-2.5 px-3 font-medium">Staff</th>
                        <th className="py-2.5 px-3 font-medium">Start</th>
                        <th className="py-2.5 px-3 font-medium">End</th>
                        <th className="py-2.5 px-3 font-medium">Status</th>
                        <th className="py-2.5 px-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-transparent">
                      {visibleBookings.length > 0 ? (
                        visibleBookings.map((b) => {
                          const eq = db.equipment.find(
                            (e) => e.resource_id === b.resource_id,
                          );
                          const usr = db.users.find(
                            (u) => u.user_id === b.user_id,
                          );
                          const isConfirmed = b.status === "CONFIRMED";
                          return (
                            <tr
                              key={b.booking_id}
                              className="hover:bg-[#f7ebe8] transition-colors"
                            >
                              <td className="py-2.5 px-3 font-medium text-[#ba1a1a]">
                                #{b.booking_id}
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                {eq?.name ?? b.resource_id}
                              </td>
                              <td className="py-2.5 px-3 font-sans text-[#53433f]">
                                {usr?.name ?? b.user_id}
                              </td>
                              <td className="py-2.5 px-3 text-[#53433f]">
                                {new Date(b.start_datetime).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-2.5 px-3 text-[#53433f]">
                                {new Date(b.end_datetime).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                                    isConfirmed
                                      ? "bg-[#dcfce7] text-[#14532d]"
                                      : "bg-[#f7ebe8] text-[#85736e]"
                                  }`}
                                >
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {isConfirmed ? (
                                  <m3e-button
                                    variant="text"
                                    onClick={() => handleCancelBooking(b.booking_id)}
                                  >
                                    Cancel
                                  </m3e-button>
                                ) : (
                                  <span className="text-xs text-[#85736e] italic">
                                    Released
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-6 text-center text-xs text-[#85736e] italic"
                          >
                            No reservations found for current view
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: ER Schema Graph Visualization */}
          {activeTab === "schema" && (
            <div className="h-full w-full min-h-[calc(100vh-48px)] relative bg-[#fcf6f5]">
              {/* Floating Toolbar */}
              <div className="absolute top-4 left-4 z-10 bg-[#ffffff] shadow-sm rounded-[8px] p-2.5 flex items-center gap-3">
                <span className="text-xs font-mono font-medium text-[#ba1a1a]">
                  ER Graph
                </span>
                <span className="text-xs text-[#53433f]">
                  Relational division & GiST paths
                </span>
                <m3e-button
                  variant="filled"
                  onClick={handleDivision}
                >
                  Test Division
                </m3e-button>
                <m3e-button
                  variant="tonal"
                  onClick={handleInsert}
                >
                  Test Insert
                </m3e-button>
              </div>

              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} size={1.5} color="rgba(186, 26, 26, 0.08)" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          )}

          {/* TAB 3: SQL Audit Logs & Relational Proofs */}
          {activeTab === "logs" && (
            <div className="h-full min-h-[calc(100vh-48px)] flex flex-col p-6 bg-[#fffbfa] overflow-hidden">
              <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold font-mono text-[#201a19]">
                      SQL Execution Stream
                    </h2>
                    <p className="text-xs text-[#85736e]">
                      Live queries from relational division and GiST temporal exclusion checks
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <m3e-button variant="text" onClick={() => setLogs([])}>
                      Clear Log
                    </m3e-button>
                    <m3e-button
                      variant="filled"
                      onClick={() => {
                        navigator.clipboard?.writeText(logs.join("\n"));
                      }}
                    >
                      Copy SQL
                    </m3e-button>
                  </div>
                </div>

                <div
                  ref={consoleRef}
                  className="flex-1 overflow-y-auto rounded-[8px] bg-[#201a19] p-4 font-mono text-[12px] leading-relaxed text-[#fffbfa]"
                >
                  {logs.length === 0 ? (
                    <div className="text-[#85736e] italic">
                      -- Console clear. Trigger booking or eligibility check to generate audit queries.
                    </div>
                  ) : (
                    logs.map((line, i) => (
                      <div
                        key={i}
                        className={`whitespace-pre-wrap py-0.5 ${
                          line.startsWith("--")
                            ? "text-[#85736e]"
                            : line.includes("STATUS: 200")
                            ? "text-[#4ade80] font-semibold"
                            : line.includes("STATUS: 409") || line.includes("STATUS: 403")
                            ? "text-[#f87171] font-semibold"
                            : line.startsWith("SELECT") || line.startsWith("INSERT")
                            ? "text-[#ffb4ab]"
                            : "text-[#fffbfa]"
                        }`}
                      >
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </m3e-theme>
  );
}
