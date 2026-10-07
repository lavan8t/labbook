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
  import("@m3e/web/theme");
}

const nodeTypes = { table: TableNode };

const EDGE_STYLE = { stroke: "#cbd5e1", strokeWidth: 1.5 };

type ActiveTab = "book" | "schema" | "logs";

function formatDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function Page() {
  const [db, setDb] = useState<DbState>(() => structuredClone(initialDb));
  const [userId, setUserId] = useState<number>(1);
  const [resourceId, setResourceId] = useState<number>(201);
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
    "-- LabBook PostgreSQL Relational & GiST Exclusion Engine initialized",
    "-- Ready for bookings and credential validation",
  ]);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Sync tab with URL query parameter on mount if present
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

  // Selected User and Equipment entities
  const selectedUser = useMemo(
    () => db.users.find((u) => u.user_id === userId) ?? db.users[0],
    [db.users, userId],
  );

  const selectedEquipment = useMemo(
    () => db.equipment.find((e) => e.resource_id === resourceId) ?? db.equipment[0],
    [db.equipment, resourceId],
  );

  // User's verified qualifications
  const userQualifications = useMemo(() => {
    const ids = db.user_qualifications
      .filter((uq) => uq.user_id === userId && uq.status === "VERIFIED")
      .map((uq) => uq.qualification_id);
    return db.qualifications.filter((q) => ids.includes(q.qualification_id));
  }, [db.user_qualifications, db.qualifications, userId]);

  // Equipment required qualifications
  const equipmentRequirements = useMemo(() => {
    const ids = db.equipment_requirements
      .filter((er) => er.resource_id === resourceId)
      .map((er) => er.qualification_id);
    return db.qualifications.filter((q) => ids.includes(q.qualification_id));
  }, [db.equipment_requirements, db.qualifications, resourceId]);

  // Real-time eligibility evaluation
  const divisionResult = useMemo(
    () => evaluateQualificationDivision(db, userId, resourceId),
    [db, userId, resourceId],
  );

  const missingQualifications = useMemo(() => {
    return db.qualifications.filter((q) =>
      divisionResult.missingQualificationIds.includes(q.qualification_id),
    );
  }, [db.qualifications, divisionResult.missingQualificationIds]);

  // Graph nodes
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
          { name: "user_id", pk: true, fk: true },
          { name: "qualification_id", pk: true, fk: true },
          { name: "status" },
          { name: "expiry" },
        ],
        rows: db.user_qualifications.map((u) => ({ ...u })),
      }),
      mk("qualifications", 500, 180, {
        tableName: "qualifications",
        columns: [{ name: "qualification_id", pk: true }, { name: "name" }],
        rows: db.qualifications.map((q) => ({ ...q })),
        rowAttr: (r) => ({ "data-qualification-id": r.qualification_id }),
      }),
      mk("equipment_requirements", 960, 180, {
        tableName: "equipment_requirements",
        columns: [
          { name: "resource_id", pk: true, fk: true },
          { name: "qualification_id", pk: true, fk: true },
        ],
        rows: db.equipment_requirements.map((r) => ({ ...r })),
      }),
      mk("equipment", 1440, 180, {
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
      mk("bookings", 1440, 560, {
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
        rowAttr: (r) => ({ "data-booking-id": r.booking_id }),
      }),
    ];
  }, [db]);

  const edges: Edge[] = useMemo(
    () => [
      {
        id: "e1",
        source: "users",
        sourceHandle: "b-source",
        target: "user_qualifications",
        targetHandle: "t-target",
        type: "smoothstep",
        style: EDGE_STYLE,
        className: EDGE_CLASSES.usersToUq,
      },
      {
        id: "e2",
        source: "user_qualifications",
        sourceHandle: "r-source",
        target: "qualifications",
        targetHandle: "l-target",
        type: "smoothstep",
        style: EDGE_STYLE,
        className: EDGE_CLASSES.uqToQualifications,
      },
      {
        id: "e3",
        source: "equipment",
        sourceHandle: "l-source",
        target: "equipment_requirements",
        targetHandle: "r-target",
        type: "smoothstep",
        style: EDGE_STYLE,
        className: EDGE_CLASSES.equipmentToReqs,
      },
      {
        id: "e4",
        source: "equipment_requirements",
        sourceHandle: "l-source",
        target: "qualifications",
        targetHandle: "r-target",
        type: "smoothstep",
        style: EDGE_STYLE,
        className: EDGE_CLASSES.reqsToQualifications,
      },
      {
        id: "e5",
        source: "equipment",
        sourceHandle: "b-source",
        target: "bookings",
        targetHandle: "t-target",
        type: "smoothstep",
        style: EDGE_STYLE,
        className: EDGE_CLASSES.equipmentToBookings,
      },
    ],
    [],
  );

  function pushLogs(lines: string[]) {
    setLogs((prev) => [...prev, ...lines].slice(-100));
  }

  function handleStartNowToggle() {
    const nextState = !isStartNow;
    setIsStartNow(nextState);
    if (nextState) {
      const now = new Date();
      const startStr = formatDateTimeLocal(now);
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      setStart(startStr);
      setEnd(formatDateTimeLocal(oneHourLater));
    }
  }

  function handleQuickDuration(minutes: number) {
    const startDate = new Date(start);
    if (isNaN(startDate.getTime())) return;
    const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
    setEnd(formatDateTimeLocal(endDate));
  }

  function handleDivision() {
    const res = evaluateQualificationDivision(db, userId, resourceId);
    const divisionOk = res.eligible;
    const missingNames = missingQualifications.map((q) => q.name).join(", ");

    pushLogs([
      `-- Relational division check: NOT EXISTS ( ... EXCEPT ... )`,
      `SELECT EXISTS (SELECT 1 FROM equipment e WHERE e.resource_id = ${resourceId}`,
      `  AND NOT EXISTS (SELECT qualification_id FROM equipment_requirements`,
      `    WHERE resource_id = ${resourceId} EXCEPT SELECT qualification_id`,
      `    FROM user_qualifications WHERE user_id = ${userId} AND status = 'VERIFIED'));`,
      `Required - User = Missing: {${res.requiredQualificationIds.join(", ") || "∅"}} -`,
      `  {${res.userQualificationIds.join(", ") || "∅"}} = {${res.missingQualificationIds.join(", ") || "∅"}}`,
      divisionOk
        ? `STATUS: 200 OK -- User '${selectedUser.name}' satisfies all requirements for '${selectedEquipment.name}'`
        : `STATUS: 403 Forbidden -- Missing required credentials: [${missingNames || res.missingQualificationIds.join(", ")}]`,
    ]);

    if (divisionOk) {
      setFeedback({
        type: "info",
        title: "Eligibility Verified (200 OK)",
        message: `${selectedUser.name} holds all verified qualifications required for ${selectedEquipment.name}.`,
        sqlSnippet: `NOT EXISTS (equipment_requirements EXCEPT user_qualifications) = TRUE`,
      });
    } else {
      setFeedback({
        type: "forbidden",
        title: "Eligibility Check Failed (403 Forbidden)",
        message: `${selectedUser.name} is missing: ${missingNames || "required qualification"}.`,
        sqlSnippet: `Missing qualification IDs: [${res.missingQualificationIds.join(", ")}]`,
      });
    }

    requestAnimationFrame(() =>
      runDivisionAnimation({
        userId,
        passed: divisionOk,
        missingQualificationIds: res.missingQualificationIds,
      }),
    );
  }

  function handleInsert() {
    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();

    if (new Date(end) <= new Date(start)) {
      setFeedback({
        type: "conflict",
        title: "Invalid Interval",
        message: "End time must be after start time.",
      });
      return;
    }

    const conflict = checkRangeConflict(db, resourceId, startIso, endIso);
    if (conflict.conflict) {
      pushLogs([
        `INSERT INTO bookings (resource_id, user_id, start_datetime, end_datetime, status)`,
        `VALUES (${resourceId}, ${userId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
        `EXCLUDE USING gist (resource_id WITH =, tstzrange(start_datetime, end_datetime) WITH &&)`,
        `ERROR: conflicting key value violates exclusion constraint on resource ${resourceId}`,
        `detail: existing booking #${conflict.bookingId} occupies ${conflict.interval}`,
        `STATUS: 409 Conflict -- SQLSTATE 23P01 (exclusion_violation)`,
      ]);
      setFeedback({
        type: "conflict",
        title: "Booking Conflict (409 Conflict)",
        message: `${selectedEquipment.name} is already reserved by Booking #${conflict.bookingId} in interval ${conflict.interval}. Please select another time.`,
        sqlSnippet: `SQLSTATE 23P01: EXCLUDE USING gist range overlap violation`,
      });
      requestAnimationFrame(() => runInsertAnimation({ conflict: true }));
      return;
    }

    const division = evaluateQualificationDivision(db, userId, resourceId);
    if (!division.eligible) {
      const missingNames = missingQualifications.map((q) => q.name).join(", ");
      pushLogs([
        `INSERT INTO bookings ... VALUES (${resourceId}, ${userId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
        `STATUS: 403 Forbidden -- Missing credentials: [${division.missingQualificationIds.join(", ")}]`,
      ]);
      setFeedback({
        type: "forbidden",
        title: "Access Denied (403 Forbidden)",
        message: `${selectedUser.name} lacks the required qualification (${missingNames || "unverified"}). Cannot confirm reservation.`,
        sqlSnippet: `Relational division returned FALSE: Missing credentials [${division.missingQualificationIds.join(", ")}]`,
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

    const newId = Math.max(0, ...db.bookings.map((b) => b.booking_id)) + 1;
    const booking: Booking = {
      booking_id: newId,
      resource_id: resourceId,
      user_id: userId,
      start_datetime: startIso,
      end_datetime: endIso,
      status: "CONFIRMED",
    };

    setDb((prev) => ({ ...prev, bookings: [...prev.bookings, booking] }));
    pushLogs([
      `INSERT INTO bookings (resource_id, user_id, start_datetime, end_datetime, status)`,
      `VALUES (${resourceId}, ${userId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
      `GiST range check on tstzrange(start_datetime, end_datetime): no overlap`,
      `STATUS: 200 OK -- Inserted booking #${newId} for ${selectedUser.name} on ${selectedEquipment.name}`,
    ]);

    setFeedback({
      type: "success",
      title: "Booking Confirmed",
      message: `Reservation #${newId} confirmed for ${selectedEquipment.name} (${selectedEquipment.location}). Time slot locked.`,
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
      message: `Reservation #${bookingId} was cancelled. The time slot is now available.`,
      sqlSnippet: `UPDATE bookings SET status = 'CANCELLED' WHERE booking_id = ${bookingId};`,
    });
  }

  function handleReset() {
    setDb(structuredClone(initialDb));
    resetVisualState();
    setFeedback({
      type: "info",
      title: "Seed Reset",
      message: "Database reverted to original seed fixtures.",
    });
    pushLogs([`RESET -- Database seed data restored`, `STATUS: 200 OK`]);
  }

  // Active bookings list
  const visibleBookings = useMemo(() => {
    return db.bookings.filter((b) =>
      filterUserOnly ? b.user_id === userId : true,
    );
  }, [db.bookings, filterUserOnly, userId]);

  return (
    <m3e-theme
      color="#c85a32"
      scheme="light"
      variant="vibrant"
      contrast="standard"
      density="0"
    >
      <div className="flex flex-col h-screen w-screen bg-[#ffffff] text-[#0f172a] overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-[#e2e8f0] bg-[#ffffff] shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-[2px] bg-[#c85a32] text-white flex items-center justify-center font-bold text-xs">
                LB
              </span>
              <div>
                <h1 className="text-base font-semibold leading-tight text-[#0f172a]">
                  LabBook
                </h1>
                <p className="text-[10px] uppercase font-mono tracking-wider text-[#64748b]">
                  Facility Booking & Query Engine
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center border border-[#e2e8f0] rounded-[2px] bg-[#f8fafc] p-0.5 ml-4">
              <button
                type="button"
                onClick={() => setActiveTab("book")}
                className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors ${
                  activeTab === "book"
                    ? "bg-[#ffffff] text-[#c85a32] font-semibold border border-[#e2e8f0]"
                    : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                Book Equipment
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("schema")}
                className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors ${
                  activeTab === "schema"
                    ? "bg-[#ffffff] text-[#c85a32] font-semibold border border-[#e2e8f0]"
                    : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                ER Schema Graph
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("logs")}
                className={`px-3 py-1.5 text-xs font-medium rounded-[2px] transition-colors ${
                  activeTab === "logs"
                    ? "bg-[#ffffff] text-[#c85a32] font-semibold border border-[#e2e8f0]"
                    : "text-[#64748b] hover:text-[#0f172a]"
                }`}
              >
                SQL Audit Logs
              </button>
            </nav>
          </div>

          {/* Right Header Meta & Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-[2px] bg-[#fdf8f6] border border-[#f0d5ca] text-[11px] text-[#0f172a]">
              <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
              <span className="font-mono text-[10px] text-[#64748b]">
                Active Staff:
              </span>
              <span className="font-medium text-[#c85a32]">
                {selectedUser.name}
              </span>
              <span className="text-[#94a3b8]">|</span>
              <span className="text-[#64748b] text-[10px]">
                {selectedUser.role} ({selectedUser.department})
              </span>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1 text-xs font-medium text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0] rounded-[2px] bg-[#ffffff] hover:bg-[#f8fafc] transition-colors"
            >
              Reset Seed
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative bg-[#ffffff]">
          {/* TAB 1: Staff Equipment Booking Interface */}
          {activeTab === "book" && (
            <div className="h-full overflow-y-auto bg-[#fdf8f6]/50 p-6 md:p-8">
              <div className="max-w-5xl mx-auto space-y-6">
                {/* Feedback Notification Banner */}
                {feedback && (
                  <div
                    className={`p-3.5 rounded-[2px] border flex items-start justify-between ${
                      feedback.type === "success"
                        ? "bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]"
                        : feedback.type === "conflict"
                        ? "bg-[#fef2f2] border-[#fecaca] text-[#991b1b]"
                        : feedback.type === "forbidden"
                        ? "bg-[#fff7ed] border-[#fed7aa] text-[#9a3412]"
                        : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider font-mono">
                          {feedback.title}
                        </span>
                      </div>
                      <p className="text-xs">{feedback.message}</p>
                      {feedback.sqlSnippet && (
                        <p className="text-[11px] font-mono text-[#64748b] pt-1">
                          {feedback.sqlSnippet}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFeedback(null)}
                      className="text-xs font-mono opacity-60 hover:opacity-100 ml-4 px-1"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Booking Configuration Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Staff & Equipment Selection */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* Step 1: Staff Selection Card */}
                    <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[2px] p-5">
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e2e8f0]">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b] font-mono">
                          1. Select Staff Member
                        </h2>
                        <span className="text-[11px] font-mono text-[#94a3b8]">
                          users table
                        </span>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-xs font-medium text-[#475569]">
                          Staff Member
                        </label>
                        <select
                          className="w-full bg-[#ffffff] border border-[#e2e8f0] rounded-[2px] px-3 py-2 text-xs text-[#0f172a] focus:outline-none focus:border-[#c85a32]"
                          value={userId}
                          onChange={(e) => setUserId(Number(e.target.value))}
                        >
                          {db.users.map((u) => (
                            <option key={u.user_id} value={u.user_id}>
                              {u.name} — {u.role}, {u.department}
                            </option>
                          ))}
                        </select>

                        {/* Verified Credentials Pills */}
                        <div className="pt-2">
                          <span className="text-[11px] font-mono text-[#64748b] block mb-1.5">
                            Verified Credentials:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {userQualifications.length > 0 ? (
                              userQualifications.map((q) => (
                                <span
                                  key={q.qualification_id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[#f8fafc] border border-[#e2e8f0] text-[11px] font-mono text-[#0f172a]"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                                  {q.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] italic text-[#94a3b8]">
                                No verified credentials on file
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Equipment Selection Card */}
                    <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[2px] p-5">
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e2e8f0]">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b] font-mono">
                          2. Select Laboratory Equipment
                        </h2>
                        <span className="text-[11px] font-mono text-[#94a3b8]">
                          equipment table
                        </span>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-xs font-medium text-[#475569]">
                          Instrument
                        </label>
                        <select
                          className="w-full bg-[#ffffff] border border-[#e2e8f0] rounded-[2px] px-3 py-2 text-xs text-[#0f172a] focus:outline-none focus:border-[#c85a32]"
                          value={resourceId}
                          onChange={(e) => setResourceId(Number(e.target.value))}
                        >
                          {db.equipment.map((e) => (
                            <option key={e.resource_id} value={e.resource_id}>
                              {e.name} ({e.location}) — Status: {e.status}
                            </option>
                          ))}
                        </select>

                        {/* Equipment Meta Details */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="p-2.5 rounded-[2px] bg-[#f8fafc] border border-[#e2e8f0]">
                            <span className="text-[10px] font-mono uppercase text-[#64748b] block">
                              Location
                            </span>
                            <span className="text-xs font-semibold text-[#0f172a]">
                              {selectedEquipment.location}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-[2px] bg-[#f8fafc] border border-[#e2e8f0]">
                            <span className="text-[10px] font-mono uppercase text-[#64748b] block">
                              Operational Status
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16a34a]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                              {selectedEquipment.status}
                            </span>
                          </div>
                        </div>

                        {/* Required Qualifications */}
                        <div className="pt-2">
                          <span className="text-[11px] font-mono text-[#64748b] block mb-1.5">
                            Required Qualifications for this Instrument:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {equipmentRequirements.map((q) => {
                              const userHasIt = userQualifications.some(
                                (uq) => uq.qualification_id === q.qualification_id,
                              );
                              return (
                                <span
                                  key={q.qualification_id}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[11px] font-mono border ${
                                    userHasIt
                                      ? "bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]"
                                      : "bg-[#fef2f2] border-[#fecaca] text-[#991b1b]"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      userHasIt ? "bg-[#16a34a]" : "bg-[#dc2626]"
                                    }`}
                                  />
                                  {q.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Time Selection, Eligibility Card, Action Buttons */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Eligibility Status Pill Card */}
                    <div
                      className={`rounded-[2px] border p-4 ${
                        divisionResult.eligible
                          ? "bg-[#f0fdf4] border-[#bbf7d0]"
                          : "bg-[#fdf8f6] border-[#f0d5ca]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748b]">
                          Relational Division Status
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-[2px] text-[11px] font-bold font-mono tracking-wider ${
                            divisionResult.eligible
                              ? "bg-[#16a34a] text-white"
                              : "bg-[#c85a32] text-white"
                          }`}
                        >
                          {divisionResult.eligible
                            ? "QUALIFIED"
                            : "MISSING PREREQUISITE"}
                        </span>
                      </div>
                      <p className="text-xs mt-2 text-[#0f172a]">
                        {divisionResult.eligible ? (
                          <>
                            <strong>{selectedUser.name}</strong> satisfies all
                            equipment prerequisites.
                          </>
                        ) : (
                          <>
                            Missing prerequisite:{" "}
                            <strong>
                              {missingQualifications
                                .map((q) => q.name)
                                .join(", ") || "Safety credential"}
                            </strong>
                            .
                          </>
                        )}
                      </p>
                    </div>

                    {/* Step 3: Reservation Time & Duration */}
                    <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[2px] p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b] font-mono">
                          3. Reservation Schedule
                        </h2>
                        <span className="text-[11px] font-mono text-[#94a3b8]">
                          tstzrange check
                        </span>
                      </div>

                      {/* Start Now Toggle */}
                      <div className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#f8fafc] border border-[#e2e8f0]">
                        <div>
                          <span className="text-xs font-semibold text-[#0f172a] block">
                            Start Now
                          </span>
                          <span className="text-[10px] text-[#64748b]">
                            Capture current timestamp immediately
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleStartNowToggle}
                          className={`px-2.5 py-1 text-xs font-medium rounded-[2px] transition-colors border ${
                            isStartNow
                              ? "bg-[#c85a32] text-white border-[#b44f2b]"
                              : "bg-white text-[#475569] border-[#cbd5e1] hover:bg-[#f1f5f9]"
                          }`}
                        >
                          {isStartNow ? "Active (Now)" : "Set Now"}
                        </button>
                      </div>

                      {/* Time Pickers */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-[#64748b] mb-1">
                            Start Datetime
                          </label>
                          <input
                            type="datetime-local"
                            value={start}
                            onChange={(e) => {
                              setStart(e.target.value);
                              setIsStartNow(false);
                            }}
                            className="w-full bg-[#ffffff] border border-[#e2e8f0] rounded-[2px] px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-[#c85a32]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-[#64748b] mb-1">
                            End Datetime
                          </label>
                          <input
                            type="datetime-local"
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                            className="w-full bg-[#ffffff] border border-[#e2e8f0] rounded-[2px] px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-[#c85a32]"
                          />
                        </div>
                      </div>

                      {/* Quick Duration Chips */}
                      <div>
                        <span className="text-[10px] font-mono text-[#64748b] uppercase block mb-1.5">
                          Quick Duration:
                        </span>
                        <div className="flex gap-1.5">
                          {[
                            { label: "+30m", min: 30 },
                            { label: "+1h", min: 60 },
                            { label: "+2h", min: 120 },
                            { label: "+4h", min: 240 },
                          ].map((d) => (
                            <button
                              key={d.label}
                              type="button"
                              onClick={() => handleQuickDuration(d.min)}
                              className="flex-1 py-1 text-xs font-mono font-medium rounded-[2px] border border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] hover:bg-[#f1f5f9] hover:border-[#cbd5e1] transition-colors"
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Optional Purpose Input */}
                      <div>
                        <label className="block text-[11px] font-mono text-[#64748b] mb-1">
                          Research Purpose (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Fluorescence imaging of live samples"
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          className="w-full bg-[#ffffff] border border-[#e2e8f0] rounded-[2px] px-3 py-1.5 text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#c85a32]"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleInsert}
                          className="w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded-[2px] bg-[#c85a32] text-white hover:bg-[#b44f2b] transition-colors"
                        >
                          Submit Booking
                        </button>
                        <button
                          type="button"
                          onClick={handleDivision}
                          className="w-full py-2 text-xs font-medium rounded-[2px] border border-[#e2e8f0] bg-[#ffffff] text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a] transition-colors"
                        >
                          Verify Eligibility (Relational Division)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Bookings Table Section */}
                <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[2px] p-5">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e2e8f0]">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b] font-mono">
                        Active Reservations
                      </h2>
                      <p className="text-[11px] text-[#64748b]">
                        Subject to PostgreSQL GiST exclusion temporal non-overlap constraints
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFilterUserOnly(!filterUserOnly)}
                        className="px-2.5 py-1 text-xs font-medium rounded-[2px] border border-[#e2e8f0] bg-[#f8fafc] text-[#475569] hover:text-[#0f172a]"
                      >
                        {filterUserOnly
                          ? `Showing: ${selectedUser.name}`
                          : "Showing: All Users"}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[11px] font-mono text-[#64748b]">
                          <th className="py-2 px-3 font-semibold">ID</th>
                          <th className="py-2 px-3 font-semibold">Equipment</th>
                          <th className="py-2 px-3 font-semibold">Reserved By</th>
                          <th className="py-2 px-3 font-semibold">Start Datetime</th>
                          <th className="py-2 px-3 font-semibold">End Datetime</th>
                          <th className="py-2 px-3 font-semibold">Status</th>
                          <th className="py-2 px-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0] text-xs font-mono">
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
                                className="hover:bg-[#fdf8f6] transition-colors"
                              >
                                <td className="py-2.5 px-3 font-semibold text-[#0f172a]">
                                  #{b.booking_id}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-sans font-medium text-[#0f172a]">
                                    {eq?.name ?? b.resource_id}
                                  </span>{" "}
                                  <span className="text-[10px] text-[#64748b]">
                                    ({eq?.location})
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-sans text-[#475569]">
                                  {usr?.name ?? b.user_id}
                                </td>
                                <td className="py-2.5 px-3 text-[#475569]">
                                  {new Date(b.start_datetime).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="py-2.5 px-3 text-[#475569]">
                                  {new Date(b.end_datetime).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold ${
                                      isConfirmed
                                        ? "bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]"
                                        : "bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]"
                                    }`}
                                  >
                                    {b.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {isConfirmed ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelBooking(b.booking_id)}
                                      className="px-2 py-0.5 text-[11px] font-sans font-medium text-[#dc2626] hover:bg-[#fef2f2] border border-[#fecaca] rounded-[2px] transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-[#94a3b8] italic">
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
                              className="py-4 text-center text-xs text-[#94a3b8] italic"
                            >
                              No active bookings found for this selection.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ER Schema Graph Visualization */}
          {activeTab === "schema" && (
            <div className="h-full w-full relative bg-[#fdf8f6]">
              {/* Floating Toolbar */}
              <div className="absolute top-4 left-4 z-10 bg-[#ffffff] border border-[#e2e8f0] rounded-[2px] p-3 flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-[#c85a32]">
                  Interactive ER Graph
                </span>
                <span className="text-[11px] text-[#64748b]">
                  Live schema canvas with relational division & GiST range paths
                </span>
                <button
                  type="button"
                  onClick={handleDivision}
                  className="px-2.5 py-1 text-xs font-medium rounded-[2px] bg-[#c85a32] text-white hover:bg-[#b44f2b] transition-colors"
                >
                  Test Division
                </button>
                <button
                  type="button"
                  onClick={handleInsert}
                  className="px-2.5 py-1 text-xs font-medium rounded-[2px] border border-[#e2e8f0] bg-[#ffffff] hover:bg-[#f8fafc] text-[#0f172a] transition-colors"
                >
                  Test Insert
                </button>
              </div>

              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} size={1.5} color="#e2e8f0" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          )}

          {/* TAB 3: SQL Audit Logs & Relational Proofs */}
          {activeTab === "logs" && (
            <div className="h-full flex flex-col p-6 bg-[#f8fafc] overflow-hidden">
              <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-[#0f172a]">
                      SQL Execution & Relational Calculus Stream
                    </h2>
                    <p className="text-xs text-[#64748b]">
                      Real-time queries generated by relational division evaluation and GiST exclusion checks
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLogs([])}
                      className="px-2.5 py-1 text-xs font-medium text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0] rounded-[2px] bg-[#ffffff]"
                    >
                      Clear Log
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(logs.join("\n"));
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-[#c85a32] border border-[#f0d5ca] bg-[#fdf8f6] rounded-[2px]"
                    >
                      Copy SQL
                    </button>
                  </div>
                </div>

                <div
                  ref={consoleRef}
                  className="flex-1 overflow-y-auto rounded-[2px] border border-[#e2e8f0] bg-[#ffffff] p-4 font-mono text-[12px] leading-relaxed text-[#0f172a]"
                >
                  {logs.length === 0 ? (
                    <div className="text-[#94a3b8] italic">
                      -- Console clear. Trigger booking or eligibility check to generate audit queries.
                    </div>
                  ) : (
                    logs.map((line, i) => (
                      <div
                        key={i}
                        className={`whitespace-pre-wrap py-0.5 ${
                          line.startsWith("--")
                            ? "text-[#64748b]"
                            : line.includes("STATUS: 200")
                            ? "text-[#16a34a] font-bold"
                            : line.includes("STATUS: 409") || line.includes("STATUS: 403")
                            ? "text-[#dc2626] font-bold"
                            : line.startsWith("SELECT") || line.startsWith("INSERT")
                            ? "text-[#c85a32] font-semibold"
                            : "text-[#0f172a]"
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
