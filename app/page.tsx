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
  import("@m3e/web/card");
  import("@m3e/web/chips");
  import("@m3e/web/switch");
  import("@m3e/web/divider");
  import("@m3e/web/tabs");
  import("@m3e/web/icon");
}

const nodeTypes = { table: TableNode };

const EDGE_STYLE = { stroke: "rgba(255, 219, 209, 0.25)", strokeWidth: 1.5 };

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
    "-- labbook relational division and gist exclusion engine initialized",
    "-- ready for staff equipment reservations and credential verification",
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
    setLogs((prev) => [...prev, ...lines].slice(-80));
  }

  function handleStartNowToggle(checked: boolean) {
    setIsStartNow(checked);
    if (checked) {
      const now = new Date();
      setStart(formatDateTimeLocal(now));
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
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
      `-- relational division: NOT EXISTS ( ... EXCEPT ... )`,
      `SELECT EXISTS (SELECT 1 FROM equipment e WHERE e.resource_id = ${resourceId}`,
      `  AND NOT EXISTS (SELECT qualification_id FROM equipment_requirements`,
      `    WHERE resource_id = ${resourceId} EXCEPT SELECT qualification_id`,
      `    FROM user_qualifications WHERE user_id = ${userId} AND status = 'VERIFIED'));`,
      `required - user = missing: {${res.requiredQualificationIds.join(", ") || "∅"}} -`,
      `  {${res.userQualificationIds.join(", ") || "∅"}} = {${res.missingQualificationIds.join(", ") || "∅"}}`,
      divisionOk
        ? `STATUS: 200 OK -- user ${userId} (${selectedUser.name}) satisfies all requirements`
        : `STATUS: 403 Forbidden -- missing credentials: [${res.missingQualificationIds.join(", ")}] (${missingNames})`,
    ]);

    if (divisionOk) {
      setFeedback({
        type: "success",
        title: "eligibility verified (200 ok)",
        message: `${selectedUser.name} holds all verified qualifications required for ${selectedEquipment.name}.`,
        sqlSnippet: `NOT EXISTS (equipment_requirements EXCEPT user_qualifications) = TRUE`,
      });
    } else {
      setFeedback({
        type: "forbidden",
        title: "eligibility check failed (403 forbidden)",
        message: `${selectedUser.name} is missing: ${missingNames || "required qualification"}.`,
        sqlSnippet: `missing qualification IDs: [${res.missingQualificationIds.join(", ")}]`,
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
        title: "invalid interval",
        message: "end time must be after start time.",
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
        title: "booking conflict (409 conflict)",
        message: `${selectedEquipment.name} is already reserved by booking #${conflict.bookingId} in interval ${conflict.interval}.`,
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
        `STATUS: 403 Forbidden -- user lacks required credentials [${division.missingQualificationIds.join(", ")}]`,
      ]);
      setFeedback({
        type: "forbidden",
        title: "cannot book (403 forbidden)",
        message: `${selectedUser.name} cannot book this equipment without: ${missingNames}.`,
        sqlSnippet: `relational division check failed for user_id=${userId}`,
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
      `gist range check on tstzrange(start_datetime, end_datetime): no overlap`,
      `STATUS: 200 OK -- inserted booking #${newId} for ${selectedUser.name} on ${selectedEquipment.name}`,
    ]);

    setFeedback({
      type: "success",
      title: "booking confirmed",
      message: `reservation #${newId} confirmed for ${selectedEquipment.name} (${selectedEquipment.location}).`,
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
      `STATUS: 200 OK -- booking #${bookingId} cancelled; slot released in gist range tree`,
    ]);
    setFeedback({
      type: "info",
      title: "booking cancelled",
      message: `reservation #${bookingId} was cancelled and the slot released.`,
      sqlSnippet: `UPDATE bookings SET status = 'CANCELLED' WHERE booking_id = ${bookingId};`,
    });
  }

  function handleReset() {
    setDb(structuredClone(initialDb));
    resetVisualState();
    setFeedback({
      type: "info",
      title: "seed reset",
      message: "database state restored to initial fixtures.",
    });
    pushLogs([`RESET -- database seed data restored`, `STATUS: 200 OK`]);
  }

  const visibleBookings = useMemo(() => {
    return db.bookings.filter((b) =>
      filterUserOnly ? b.user_id === userId : true,
    );
  }, [db.bookings, filterUserOnly, userId]);

  return (
    <m3e-theme
      color="#c85a32"
      scheme="dark"
      variant="vibrant"
      contrast="standard"
      density="0"
    >
      <div className="flex flex-col h-screen w-screen bg-[#191210] text-[#ede0dc] overflow-hidden">
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between px-6 py-2.5 border-b border-[rgba(255,219,209,0.12)] bg-[#201a18] shrink-0">
          <div className="flex items-center gap-6">
            {/* Clean App Title */}
            <span className="text-base font-semibold tracking-tight text-[#ffb59d] lowercase">
              labbook
            </span>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-[#191210] p-1 rounded-[8px] border border-[rgba(255,219,209,0.1)]">
              <m3e-button
                variant={activeTab === "book" ? "filled" : "text"}
                onClick={() => setActiveTab("book")}
              >
                book equipment
              </m3e-button>
              <m3e-button
                variant={activeTab === "schema" ? "filled" : "text"}
                onClick={() => setActiveTab("schema")}
              >
                er schema graph
              </m3e-button>
              <m3e-button
                variant={activeTab === "logs" ? "filled" : "text"}
                onClick={() => setActiveTab("logs")}
              >
                sql audit logs
              </m3e-button>
            </div>
          </div>

          {/* Right Meta & Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[#271f1c] border border-[rgba(255,219,209,0.1)] text-xs text-[#d0c4bf]">
              <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
              <span className="font-mono text-[11px] text-[#9d8e87]">staff:</span>
              <span className="font-medium text-[#ffb59d]">{selectedUser.name}</span>
            </div>

            <m3e-button variant="outlined" onClick={handleReset}>
              reset seed
            </m3e-button>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative bg-[#191210]">
          {/* TAB 1: User / Staff Equipment Booking Interface */}
          {activeTab === "book" && (
            <div className="h-full overflow-y-auto p-6 md:p-8">
              <div className="max-w-5xl mx-auto space-y-6">
                {/* Feedback Notification Banner */}
                {feedback && (
                  <m3e-card
                    variant="outlined"
                    className={`p-4 block ${
                      feedback.type === "success"
                        ? "border-[#4ade80]/40 bg-[#163820]"
                        : feedback.type === "conflict"
                        ? "border-[#f87171]/40 bg-[#3b1212]"
                        : feedback.type === "forbidden"
                        ? "border-[#fb923c]/40 bg-[#381f12]"
                        : "border-[rgba(255,219,209,0.2)] bg-[#271f1c]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold lowercase tracking-wide">
                          {feedback.title}
                        </div>
                        <p className="text-xs text-[#d0c4bf]">{feedback.message}</p>
                        {feedback.sqlSnippet && (
                          <p className="text-[11px] font-mono text-[#9d8e87] pt-1">
                            {feedback.sqlSnippet}
                          </p>
                        )}
                      </div>
                      <m3e-button
                        variant="text"
                        onClick={() => setFeedback(null)}
                      >
                        dismiss
                      </m3e-button>
                    </div>
                  </m3e-card>
                )}

                {/* Booking Configuration Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Staff & Equipment Selection */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* Step 1: Staff Selection Card */}
                    <m3e-card variant="filled" className="p-5 block bg-[#201a18] border border-[rgba(255,219,209,0.12)]">
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgba(255,219,209,0.08)]">
                        <h2 className="text-xs font-medium text-[#ffb59d] lowercase">
                          1. select staff member
                        </h2>
                        <span className="text-[11px] font-mono text-[#9d8e87] lowercase">
                          users table
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-[#d0c4bf] mb-1.5 lowercase">
                            staff member
                          </label>
                          <m3e-select
                            className="w-full block"
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
                        </div>

                        {/* Verified Credentials Chips */}
                        <div>
                          <span className="text-[11px] font-mono text-[#9d8e87] block mb-2 lowercase">
                            verified credentials:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {userQualifications.length > 0 ? (
                              userQualifications.map((q) => (
                                <m3e-assist-chip key={q.qualification_id} value={String(q.qualification_id)}>
                                  <m3e-icon slot="icon" name="verified"></m3e-icon>
                                  <span className="lowercase">{q.name}</span>
                                </m3e-assist-chip>
                              ))
                            ) : (
                              <span className="text-[11px] italic text-[#9d8e87] lowercase">
                                no verified credentials on file
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </m3e-card>

                    {/* Step 2: Equipment Selection Card */}
                    <m3e-card variant="filled" className="p-5 block bg-[#201a18] border border-[rgba(255,219,209,0.12)]">
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgba(255,219,209,0.08)]">
                        <h2 className="text-xs font-medium text-[#ffb59d] lowercase">
                          2. select laboratory equipment
                        </h2>
                        <span className="text-[11px] font-mono text-[#9d8e87] lowercase">
                          equipment table
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-[#d0c4bf] mb-1.5 lowercase">
                            laboratory equipment
                          </label>
                          <m3e-select
                            className="w-full block"
                            value={String(resourceId)}
                            onChange={(e: any) => {
                              const val = e.target?.value;
                              if (val !== undefined) setResourceId(Number(val));
                            }}
                          >
                            {db.equipment.map((e) => (
                              <m3e-option key={e.resource_id} value={String(e.resource_id)}>
                                {e.name} ({e.location}) — status: {e.status.toLowerCase()}
                              </m3e-option>
                            ))}
                          </m3e-select>
                        </div>

                        {/* Equipment Meta Details */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="p-3 rounded-[8px] bg-[#271f1c] border border-[rgba(255,219,209,0.08)]">
                            <span className="text-[10px] font-mono text-[#9d8e87] block lowercase">
                              location
                            </span>
                            <span className="text-xs font-medium text-[#ede0dc]">
                              {selectedEquipment.location}
                            </span>
                          </div>
                          <div className="p-3 rounded-[8px] bg-[#271f1c] border border-[rgba(255,219,209,0.08)]">
                            <span className="text-[10px] font-mono text-[#9d8e87] block lowercase">
                              status
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4ade80] lowercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                              {selectedEquipment.status.toLowerCase()}
                            </span>
                          </div>
                        </div>

                        {/* Required Qualifications */}
                        <div>
                          <span className="text-[11px] font-mono text-[#9d8e87] block mb-2 lowercase">
                            prerequisites for this equipment:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {equipmentRequirements.map((q) => {
                              const userHasIt = userQualifications.some(
                                (uq) => uq.qualification_id === q.qualification_id,
                              );
                              return (
                                <m3e-chip
                                  key={q.qualification_id}
                                  className={userHasIt ? "text-[#4ade80]" : "text-[#f87171]"}
                                >
                                  <m3e-icon
                                    slot="icon"
                                    name={userHasIt ? "check_circle" : "cancel"}
                                  ></m3e-icon>
                                  <span className="lowercase">{q.name}</span>
                                </m3e-chip>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </m3e-card>
                  </div>

                  {/* Right Column: Reservation Schedule & Triggers */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Eligibility Status Banner */}
                    <m3e-card
                      variant="outlined"
                      className={`p-4 block ${
                        divisionResult.eligible
                          ? "border-[#4ade80]/40 bg-[#17301e]"
                          : "border-[#f87171]/40 bg-[#351914]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[#d0c4bf] lowercase">
                          relational division status
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium font-mono lowercase ${
                            divisionResult.eligible
                              ? "bg-[#166534] text-[#4ade80]"
                              : "bg-[#7a2f19] text-[#ffdbd1]"
                          }`}
                        >
                          {divisionResult.eligible
                            ? "qualified"
                            : "missing prerequisite"}
                        </span>
                      </div>
                      <p className="text-xs mt-2 text-[#ede0dc]">
                        {divisionResult.eligible ? (
                          <>
                            <strong>{selectedUser.name}</strong> satisfies all equipment requirements.
                          </>
                        ) : (
                          <>
                            missing:{" "}
                            <strong>
                              {missingQualifications.map((q) => q.name).join(", ") || "credential"}
                            </strong>
                          </>
                        )}
                      </p>
                    </m3e-card>

                    {/* Step 3: Reservation Schedule Card */}
                    <m3e-card variant="filled" className="p-5 block bg-[#201a18] border border-[rgba(255,219,209,0.12)] space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,219,209,0.08)]">
                        <h2 className="text-xs font-medium text-[#ffb59d] lowercase">
                          3. reservation schedule
                        </h2>
                        <span className="text-[11px] font-mono text-[#9d8e87] lowercase">
                          tstzrange check
                        </span>
                      </div>

                      {/* Start Now Toggle with m3e-switch */}
                      <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#271f1c] border border-[rgba(255,219,209,0.08)]">
                        <div>
                          <span className="text-xs font-medium text-[#ede0dc] block lowercase">
                            start now
                          </span>
                          <span className="text-[10px] text-[#9d8e87] lowercase">
                            capture current timestamp immediately
                          </span>
                        </div>
                        <m3e-switch
                          checked={isStartNow ? "" : undefined}
                          onChange={(e: any) => handleStartNowToggle(Boolean(e.target?.checked))}
                        ></m3e-switch>
                      </div>

                      {/* Time Pickers */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-[#9d8e87] mb-1 lowercase">
                            start datetime
                          </label>
                          <input
                            type="datetime-local"
                            value={start}
                            onChange={(e) => {
                              setStart(e.target.value);
                              setIsStartNow(false);
                            }}
                            className="w-full bg-[#271f1c] border border-[rgba(255,219,209,0.15)] rounded-[6px] px-2.5 py-1.5 text-xs font-mono text-[#ede0dc] focus:outline-none focus:border-[#ffb59d]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-[#9d8e87] mb-1 lowercase">
                            end datetime
                          </label>
                          <input
                            type="datetime-local"
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                            className="w-full bg-[#271f1c] border border-[rgba(255,219,209,0.15)] rounded-[6px] px-2.5 py-1.5 text-xs font-mono text-[#ede0dc] focus:outline-none focus:border-[#ffb59d]"
                          />
                        </div>
                      </div>

                      {/* Quick Duration Chips */}
                      <div>
                        <span className="text-[10px] font-mono text-[#9d8e87] block mb-1.5 lowercase">
                          quick duration:
                        </span>
                        <div className="flex gap-1.5">
                          {[
                            { label: "+30m", min: 30 },
                            { label: "+1h", min: 60 },
                            { label: "+2h", min: 120 },
                            { label: "+4h", min: 240 },
                          ].map((d) => (
                            <m3e-button
                              key={d.label}
                              variant="tonal"
                              className="flex-1 text-xs"
                              onClick={() => handleQuickDuration(d.min)}
                            >
                              {d.label}
                            </m3e-button>
                          ))}
                        </div>
                      </div>

                      {/* Optional Purpose */}
                      <div>
                        <label className="block text-[11px] font-mono text-[#9d8e87] mb-1 lowercase">
                          research purpose (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. sample imaging protocol"
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          className="w-full bg-[#271f1c] border border-[rgba(255,219,209,0.15)] rounded-[6px] px-3 py-1.5 text-xs text-[#ede0dc] placeholder-[#9d8e87]/60 focus:outline-none focus:border-[#ffb59d]"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 flex flex-col gap-2.5">
                        <m3e-button
                          variant="filled"
                          className="w-full"
                          onClick={handleInsert}
                        >
                          submit booking
                        </m3e-button>
                        <m3e-button
                          variant="outlined"
                          className="w-full"
                          onClick={handleDivision}
                        >
                          verify eligibility (relational division)
                        </m3e-button>
                      </div>
                    </m3e-card>
                  </div>
                </div>

                {/* Active Bookings Table Section */}
                <m3e-card variant="filled" className="p-5 block bg-[#201a18] border border-[rgba(255,219,209,0.12)]">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[rgba(255,219,209,0.08)]">
                    <div>
                      <h2 className="text-xs font-medium text-[#ffb59d] lowercase">
                        active reservations
                      </h2>
                      <p className="text-[11px] text-[#9d8e87] lowercase">
                        enforced by postgresql gist temporal exclusion constraint
                      </p>
                    </div>

                    <m3e-button
                      variant="tonal"
                      onClick={() => setFilterUserOnly(!filterUserOnly)}
                    >
                      {filterUserOnly ? `user: ${selectedUser.name}` : "all bookings"}
                    </m3e-button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(255,219,209,0.08)] bg-[#271f1c] text-[11px] font-mono text-[#9d8e87] lowercase">
                          <th className="py-2 px-3 font-medium">id</th>
                          <th className="py-2 px-3 font-medium">equipment</th>
                          <th className="py-2 px-3 font-medium">user</th>
                          <th className="py-2 px-3 font-medium">start datetime</th>
                          <th className="py-2 px-3 font-medium">end datetime</th>
                          <th className="py-2 px-3 font-medium">status</th>
                          <th className="py-2 px-3 font-medium text-right">action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(255,219,209,0.06)] text-xs font-mono">
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
                                className="hover:bg-[#271f1c] transition-colors"
                              >
                                <td className="py-2.5 px-3 font-medium text-[#ffb59d]">
                                  #{b.booking_id}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-sans font-medium text-[#ede0dc]">
                                    {eq?.name ?? b.resource_id}
                                  </span>{" "}
                                  <span className="text-[10px] text-[#9d8e87]">
                                    ({eq?.location})
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-sans text-[#d0c4bf]">
                                  {usr?.name ?? b.user_id}
                                </td>
                                <td className="py-2.5 px-3 text-[#d0c4bf]">
                                  {new Date(b.start_datetime).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="py-2.5 px-3 text-[#d0c4bf]">
                                  {new Date(b.end_datetime).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-[4px] text-[10px] font-medium lowercase ${
                                      isConfirmed
                                        ? "bg-[#163820] text-[#4ade80] border border-[#4ade80]/30"
                                        : "bg-[#271f1c] text-[#9d8e87] border border-[rgba(255,219,209,0.1)]"
                                    }`}
                                  >
                                    {b.status.toLowerCase()}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {isConfirmed ? (
                                    <m3e-button
                                      variant="text"
                                      className="text-[#f87171]"
                                      onClick={() => handleCancelBooking(b.booking_id)}
                                    >
                                      cancel
                                    </m3e-button>
                                  ) : (
                                    <span className="text-[11px] text-[#9d8e87] italic lowercase">
                                      released
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
                              className="py-4 text-center text-xs text-[#9d8e87] italic lowercase"
                            >
                              no active bookings found for this selection
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </m3e-card>
              </div>
            </div>
          )}

          {/* TAB 2: ER Schema Graph Visualization */}
          {activeTab === "schema" && (
            <div className="h-full w-full relative bg-[#150f0e]">
              {/* Floating Toolbar */}
              <div className="absolute top-4 left-4 z-10 bg-[#201a18] border border-[rgba(255,219,209,0.15)] rounded-[8px] p-3 flex items-center gap-3">
                <span className="text-xs font-mono font-medium text-[#ffb59d] lowercase">
                  er graph
                </span>
                <span className="text-[11px] text-[#d0c4bf] lowercase">
                  relational division & gist range paths
                </span>
                <m3e-button
                  variant="filled"
                  onClick={handleDivision}
                >
                  test division
                </m3e-button>
                <m3e-button
                  variant="outlined"
                  onClick={handleInsert}
                >
                  test insert
                </m3e-button>
              </div>

              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={24} size={1.5} color="rgba(255, 219, 209, 0.08)" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          )}

          {/* TAB 3: SQL Audit Logs & Relational Proofs */}
          {activeTab === "logs" && (
            <div className="h-full flex flex-col p-6 bg-[#191210] overflow-hidden">
              <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-medium font-mono text-[#ede0dc] lowercase">
                      sql execution and relational calculus stream
                    </h2>
                    <p className="text-xs text-[#9d8e87] lowercase">
                      real-time queries generated by relational division evaluation and gist exclusion checks
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <m3e-button variant="outlined" onClick={() => setLogs([])}>
                      clear log
                    </m3e-button>
                    <m3e-button
                      variant="filled"
                      onClick={() => {
                        navigator.clipboard?.writeText(logs.join("\n"));
                      }}
                    >
                      copy sql
                    </m3e-button>
                  </div>
                </div>

                <div
                  ref={consoleRef}
                  className="flex-1 overflow-y-auto rounded-[8px] border border-[rgba(255,219,209,0.15)] bg-[#130d0b] p-4 font-mono text-[12px] leading-relaxed text-[#ede0dc]"
                >
                  {logs.length === 0 ? (
                    <div className="text-[#9d8e87] italic lowercase">
                      -- console clear. trigger booking or eligibility check to generate audit queries.
                    </div>
                  ) : (
                    logs.map((line, i) => (
                      <div
                        key={i}
                        className={`whitespace-pre-wrap py-0.5 ${
                          line.startsWith("--")
                            ? "text-[#9d8e87]"
                            : line.includes("STATUS: 200")
                            ? "text-[#4ade80] font-semibold"
                            : line.includes("STATUS: 409") || line.includes("STATUS: 403")
                            ? "text-[#f87171] font-semibold"
                            : line.startsWith("SELECT") || line.startsWith("INSERT")
                            ? "text-[#ffb59d]"
                            : "text-[#ede0dc]"
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
