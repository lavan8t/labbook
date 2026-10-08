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
import {
  initialDb,
  type Booking,
  type DbState,
  type Equipment,
  type Role,
  type User,
  type UserType,
} from "@/data/schema";
import {
  checkRangeConflict,
  evaluateQualificationDivision,
} from "@/lib/dbEngine";
import {
  revealConsoleLines,
  runDivisionAnimation,
  runInsertAnimation,
  resetVisualState,
} from "@/lib/animations";

import "@m3e/web/select";
import "@m3e/web/option";
import "@m3e/web/form-field";
import "@m3e/web/button";
import "@m3e/web/button-group";
import "@m3e/web/theme";
import "@m3e/web/chips";
import "@m3e/web/switch";
import "@m3e/web/divider";
import "@m3e/web/tabs";
import "@m3e/web/icon";
import "@m3e/web/datepicker";
import "@m3e/web/timepicker";
import "@m3e/web/date-input";

const nodeTypes = { table: TableNode };

const EDGE_STYLE = { stroke: "var(--color-primary)", strokeWidth: 1.5, opacity: 0.35 };

type ActiveTab =
  | "book"
  | "catalog"
  | "inventory"
  | "users"
  | "reservations"
  | "schema"
  | "logs";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface LogItem {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  tag: string;
  message: string;
}

const INITIAL_LOGS: LogItem[] = [
  {
    id: "init-1",
    timestamp: "2026-10-08T12:00:00.000Z",
    level: "INFO",
    tag: "kernel",
    message: "PostgreSQL kernel initialized with temporal range and exclusion extensions",
  },
  {
    id: "init-2",
    timestamp: "2026-10-08T12:00:00.015Z",
    level: "INFO",
    tag: "gist_temporal",
    message: "GiST temporal index loaded: bookings_resource_id_range_excl active",
  },
  {
    id: "init-3",
    timestamp: "2026-10-08T12:00:00.030Z",
    level: "DEBUG",
    tag: "relational_div",
    message: "Relational division query engine primed for credential verification",
  },
  {
    id: "init-4",
    timestamp: "2026-10-08T12:00:00.045Z",
    level: "INFO",
    tag: "auth",
    message: "Role-based access control engine initialized with admin and normal user policies",
  },
];

function formatLogTimestamp(d = new Date()): string {
  const padNum = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}-${padNum(d.getMonth() + 1)}-${padNum(d.getDate())}T${padNum(d.getHours())}:${padNum(d.getMinutes())}:${padNum(d.getSeconds())}.${padNum(d.getMilliseconds(), 3)}Z`;
}

function makeLog(
  message: string,
  level?: "INFO" | "WARN" | "ERROR" | "DEBUG",
  tag?: string,
): LogItem {
  const detectedLevel =
    level ??
    (message.includes("ERROR") || message.includes("403") || message.includes("400")
      ? "ERROR"
      : message.includes("409") || message.includes("conflict")
      ? "WARN"
      : message.includes("200") || message.includes("201")
      ? "INFO"
      : message.startsWith("--")
      ? "DEBUG"
      : "INFO");
  const detectedTag =
    tag ??
    (message.startsWith("--")
      ? "kernel"
      : message.includes("division") || message.includes("qualification")
      ? "relational_div"
      : message.includes("GiST") || message.includes("exclusion") || message.includes("range")
      ? "gist_temporal"
      : message.includes("INSERT INTO users") || message.includes("AUTH") || message.includes("LOGIN")
      ? "auth"
      : message.includes("equipment")
      ? "inventory"
      : message.includes("INSERT") || message.includes("UPDATE") || message.includes("DELETE")
      ? "tx_engine"
      : "sql_exec");
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: formatLogTimestamp(),
    level: detectedLevel,
    tag: detectedTag,
    message,
  };
}

export default function Page() {
  const [db, setDb] = useState<DbState>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("labbook_db_v2");
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback to initialDb
      }
    }
    return structuredClone(initialDb);
  });

  const [currentUserId, setCurrentUserId] = useState<number | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedId = localStorage.getItem("labbook_auth_user_id");
        if (savedId) return Number(savedId);
      } catch {
        // fallback to null
      }
    }
    return 1; // default to Alice Chen for quick demo, or can be null
  });

  // Target user for booking (admin can book on behalf of any staff)
  const [targetUserId, setTargetUserId] = useState<number>(1);
  const [resourceId, setResourceId] = useState<number>(201);

  const [startDate, setStartDate] = useState<string>("2026-10-15");
  const [startTime, setStartTime] = useState<string>("10:30");
  const [endDate, setEndDate] = useState<string>("2026-10-15");
  const [endTime, setEndTime] = useState<string>("11:30");

  const [purpose, setPurpose] = useState<string>("");
  const [isStartNow, setIsStartNow] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("book");

  // Auth screen state
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [selectedLoginUserId, setSelectedLoginUserId] = useState<number>(1);
  const [regName, setRegName] = useState<string>("");
  const [regDepartment, setRegDepartment] = useState<string>("Bioengineering");
  const [regRole, setRegRole] = useState<Role>("Researcher");
  const [regUserType, setRegUserType] = useState<UserType>("normal");

  // Admin inventory form state
  const [newEquipName, setNewEquipName] = useState<string>("");
  const [newEquipLocation, setNewEquipLocation] = useState<string>("");
  const [newEquipStatus, setNewEquipStatus] = useState<Equipment["status"]>("AVAILABLE");
  const [newEquipReqQualId, setNewEquipReqQualId] = useState<number>(101);

  // Admin user qualification granting
  const [adminSelectedQualId, setAdminSelectedQualId] = useState<number>(101);

  const [feedback, setFeedback] = useState<{
    type: "success" | "conflict" | "forbidden" | "info";
    title: string;
    message: string;
    sqlSnippet?: string;
  } | null>(null);

  const [logs, setLogs] = useState<LogItem[]>(INITIAL_LOGS);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const consoleRef = useRef<HTMLDivElement>(null);
  const userSelectRef = useRef<HTMLElement>(null);
  const equipmentSelectRef = useRef<HTMLElement>(null);

  // Save db to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("labbook_db_v2", JSON.stringify(db));
      } catch {
        // ignore
      }
    }
  }, [db]);

  // Save auth user id to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (currentUserId !== null) {
          localStorage.setItem("labbook_auth_user_id", String(currentUserId));
        } else {
          localStorage.removeItem("labbook_auth_user_id");
        }
      } catch {
        // ignore
      }
    }
  }, [currentUserId]);

  useEffect(() => {
    // Clear any instance properties that might shadow Lit element accessors
    for (const ref of [userSelectRef, equipmentSelectRef]) {
      if (ref.current && Object.prototype.hasOwnProperty.call(ref.current, "value")) {
        delete (ref.current as unknown as Record<string, unknown>).value;
      }
    }
  }, []);

  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
    revealConsoleLines(consoleRef.current);
  }, [logs, autoScroll]);

  // Current session user
  const currentUser = useMemo(() => {
    if (currentUserId === null) return null;
    return db.users.find((u) => u.user_id === currentUserId) ?? null;
  }, [db.users, currentUserId]);

  // Effective booking user (normal user is always currentUser, admin can select targetUserId)
  const effectiveBookingUserId = useMemo(() => {
    if (!currentUser) return 1;
    if (currentUser.user_type === "admin") {
      return targetUserId;
    }
    return currentUser.user_id;
  }, [currentUser, targetUserId]);

  const bookingStaff = useMemo(
    () => db.users.find((u) => u.user_id === effectiveBookingUserId) ?? db.users[0],
    [db.users, effectiveBookingUserId],
  );

  const selectedEquipment = useMemo(
    () => db.equipment.find((e) => e.resource_id === resourceId) ?? db.equipment[0],
    [db.equipment, resourceId],
  );

  const userQualifications = useMemo(() => {
    const ids = db.user_qualifications
      .filter((uq) => uq.user_id === effectiveBookingUserId && uq.status === "VERIFIED")
      .map((uq) => uq.qualification_id);
    return db.qualifications.filter((q) => ids.includes(q.qualification_id));
  }, [db.user_qualifications, db.qualifications, effectiveBookingUserId]);

  const equipmentRequirements = useMemo(() => {
    const ids = db.equipment_requirements
      .filter((er) => er.resource_id === resourceId)
      .map((er) => er.qualification_id);
    return db.qualifications.filter((q) => ids.includes(q.qualification_id));
  }, [db.equipment_requirements, db.qualifications, resourceId]);

  const divisionResult = useMemo(
    () => evaluateQualificationDivision(db, effectiveBookingUserId, resourceId),
    [db, effectiveBookingUserId, resourceId],
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
          { name: "user_type" },
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

  function pushLogs(
    newEntries: Array<
      string | { message: string; level?: LogItem["level"]; tag?: string }
    >,
  ) {
    const formatted = newEntries.map((e) =>
      typeof e === "string" ? makeLog(e) : makeLog(e.message, e.level, e.tag),
    );
    setLogs((prev) => [...prev, ...formatted]);
  }

  function handleCopyLogs() {
    const text = logs
      .map((l) => `${l.timestamp} [${l.level.padEnd(5)}] [${l.tag}] ${l.message}`)
      .join("\n");
    navigator.clipboard?.writeText(text);
  }

  function handleLogin(userIdToLogin: number) {
    const user = db.users.find((u) => u.user_id === userIdToLogin);
    if (!user) return;
    setCurrentUserId(user.user_id);
    if (user.user_type === "admin") {
      setActiveTab("inventory");
    } else {
      setActiveTab("book");
    }
    pushLogs([
      `AUTH LOGIN: session created for user_id=${user.user_id} (${user.name}, type=${user.user_type.toUpperCase()})`,
      `STATUS: 200 OK -- Role-based access level: ${user.user_type}`,
    ]);
  }

  function handleRegister() {
    if (!regName.trim()) {
      setFeedback({
        type: "forbidden",
        title: "Validation Error",
        message: "Please enter a valid user name.",
      });
      return;
    }

    const nextId = Math.max(...db.users.map((u) => u.user_id), 0) + 1;
    const newUser: User = {
      user_id: nextId,
      name: regName.trim(),
      user_type: regUserType,
      role: regRole,
      department: regDepartment.trim() || "General Research",
    };

    setDb((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
    }));

    setCurrentUserId(nextId);
    if (newUser.user_type === "admin") {
      setActiveTab("inventory");
    } else {
      setActiveTab("book");
    }

    pushLogs([
      `INSERT INTO users (user_id, name, user_type, role, department)`,
      `VALUES (${nextId}, '${newUser.name}', '${newUser.user_type}', '${newUser.role}', '${newUser.department}');`,
      `STATUS: 201 Created -- User #${nextId} logged in as ${newUser.user_type.toUpperCase()}`,
    ]);

    setFeedback({
      type: "success",
      title: "Account Created",
      message: `Welcome, ${newUser.name}. You are logged in as ${newUser.user_type === "admin" ? "an Administrator" : "a Normal User"}.`,
    });

    setRegName("");
  }

  function handleLogout() {
    if (currentUser) {
      pushLogs([
        `AUTH LOGOUT: session terminated for user_id=${currentUser.user_id} (${currentUser.name})`,
      ]);
    }
    setCurrentUserId(null);
    setFeedback(null);
  }

  function handleStartNowToggle(checked: boolean) {
    setIsStartNow(checked);
    if (checked) {
      const now = new Date();
      const dStr = formatDate(now);
      const tStr = formatTime(now);
      setStartDate(dStr);
      setStartTime(tStr);
      setEndDate(dStr);

      const later = new Date(now.getTime() + 60 * 60 * 1000);
      setEndDate(formatDate(later));
      setEndTime(formatTime(later));
    }
  }

  function handleAdjustDuration(deltaMinutes: number) {
    const currentStart = new Date(`${startDate}T${startTime}`);
    const currentEnd = new Date(`${endDate}T${endTime}`);
    const updatedEnd = new Date(currentEnd.getTime() + deltaMinutes * 60 * 1000);

    if (updatedEnd.getTime() <= currentStart.getTime() + 15 * 60 * 1000) {
      const minEnd = new Date(currentStart.getTime() + 15 * 60 * 1000);
      setEndDate(formatDate(minEnd));
      setEndTime(formatTime(minEnd));
    } else {
      setEndDate(formatDate(updatedEnd));
      setEndTime(formatTime(updatedEnd));
    }
  }

  function handleDivision() {
    const result = evaluateQualificationDivision(db, effectiveBookingUserId, resourceId);
    const sql = [
      `-- Relational Division: verify user_id=${effectiveBookingUserId} has all qualifications for resource_id=${resourceId}`,
      `SELECT q.qualification_id FROM equipment_requirements er`,
      `JOIN qualifications q ON er.qualification_id = q.qualification_id WHERE er.resource_id = ${resourceId}`,
      `EXCEPT`,
      `SELECT uq.qualification_id FROM user_qualifications uq`,
      `WHERE uq.user_id = ${effectiveBookingUserId} AND uq.status = 'VERIFIED';`,
    ];

    if (result.eligible) {
      pushLogs([
        ...sql,
        `RESULT: (empty set) -- All ${result.requiredQualificationIds.length} required qualifications satisfied`,
        `STATUS: 200 OK -- ${bookingStaff.name} qualified for ${selectedEquipment.name}`,
      ]);
      setFeedback({
        type: "success",
        title: "Staff Eligible",
        message: `${bookingStaff.name} possesses all verified prerequisites for ${selectedEquipment.name}.`,
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
        message: `${bookingStaff.name} is missing required credentials: ${missingNames}.`,
        sqlSnippet: `Missing ${result.missingQualificationIds.length} required prerequisite(s)`,
      });
    }

    requestAnimationFrame(() =>
      runDivisionAnimation({
        userId: effectiveBookingUserId,
        passed: result.eligible,
        missingQualificationIds: result.missingQualificationIds,
      }),
    );
  }

  function handleInsert() {
    if (selectedEquipment.status !== "AVAILABLE") {
      pushLogs([
        `STATUS: 400 Bad Request -- Cannot reserve ${selectedEquipment.name} while status is ${selectedEquipment.status}`,
      ]);
      setFeedback({
        type: "forbidden",
        title: "Equipment Unavailable",
        message: `This equipment is currently ${selectedEquipment.status} and cannot be booked.`,
      });
      return;
    }

    const startIso = new Date(`${startDate}T${startTime}`).toISOString();
    const endIso = new Date(`${endDate}T${endTime}`).toISOString();

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
        `VALUES (${resourceId}, ${effectiveBookingUserId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
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

    const division = evaluateQualificationDivision(db, effectiveBookingUserId, resourceId);
    if (!division.eligible) {
      const missingNames = missingQualifications.map((q) => q.name).join(", ");
      pushLogs([
        `INSERT INTO bookings ... VALUES (${resourceId}, ${effectiveBookingUserId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
        `STATUS: 403 Forbidden -- User lacks required credentials [${division.missingQualificationIds.join(", ")}]`,
      ]);
      setFeedback({
        type: "forbidden",
        title: "Cannot Book (403 Forbidden)",
        message: `${bookingStaff.name} cannot book this equipment without: ${missingNames}.`,
        sqlSnippet: `Relational division check failed for user_id=${effectiveBookingUserId}`,
      });
      requestAnimationFrame(() =>
        runDivisionAnimation({
          userId: effectiveBookingUserId,
          passed: false,
          missingQualificationIds: division.missingQualificationIds,
        }),
      );
      return;
    }

    const newId = Math.max(...db.bookings.map((b) => b.booking_id), 0) + 1;
    const newBooking: Booking = {
      booking_id: newId,
      resource_id: resourceId,
      user_id: effectiveBookingUserId,
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
      `VALUES (${resourceId}, ${effectiveBookingUserId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
      `GiST range check on tstzrange(start_datetime, end_datetime): no overlap`,
      `STATUS: 200 OK -- Inserted booking #${newId} for ${bookingStaff.name} on ${selectedEquipment.name}`,
    ]);

    setFeedback({
      type: "success",
      title: "Booking Confirmed",
      message: `Reservation #${newId} confirmed for ${selectedEquipment.name} (${selectedEquipment.location}).`,
      sqlSnippet: `INSERT INTO bookings VALUES (${newId}, ${resourceId}, ${effectiveBookingUserId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
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

  // Admin inventory actions
  function handleAddEquipment() {
    if (!newEquipName.trim() || !newEquipLocation.trim()) {
      setFeedback({
        type: "forbidden",
        title: "Validation Error",
        message: "Please enter equipment name and laboratory location.",
      });
      return;
    }

    const nextResId = Math.max(...db.equipment.map((e) => e.resource_id), 200) + 1;
    const newEquipment: Equipment = {
      resource_id: nextResId,
      name: newEquipName.trim(),
      location: newEquipLocation.trim(),
      status: newEquipStatus,
    };

    const newReqs = [...db.equipment_requirements];
    if (newEquipReqQualId) {
      newReqs.push({
        resource_id: nextResId,
        qualification_id: newEquipReqQualId,
      });
    }

    setDb((prev) => ({
      ...prev,
      equipment: [...prev.equipment, newEquipment],
      equipment_requirements: newReqs,
    }));

    pushLogs([
      `INSERT INTO equipment (resource_id, name, location, status)`,
      `VALUES (${nextResId}, '${newEquipment.name}', '${newEquipment.location}', '${newEquipment.status}');`,
      `STATUS: 201 Created -- Added asset #${nextResId}`,
    ]);

    setFeedback({
      type: "success",
      title: "Equipment Added",
      message: `${newEquipment.name} registered in inventory at ${newEquipment.location}.`,
    });

    setNewEquipName("");
    setNewEquipLocation("");
  }

  function handleUpdateEquipmentStatus(
    resId: number,
    newStatus: Equipment["status"],
  ) {
    setDb((prev) => ({
      ...prev,
      equipment: prev.equipment.map((e) =>
        e.resource_id === resId ? { ...e, status: newStatus } : e,
      ),
    }));
    pushLogs([
      `UPDATE equipment SET status = '${newStatus}' WHERE resource_id = ${resId};`,
      `STATUS: 200 OK -- Equipment #${resId} status updated to ${newStatus}`,
    ]);
  }

  function handleDeleteEquipment(resId: number) {
    const eq = db.equipment.find((e) => e.resource_id === resId);
    setDb((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((e) => e.resource_id !== resId),
      equipment_requirements: prev.equipment_requirements.filter(
        (er) => er.resource_id !== resId,
      ),
    }));
    pushLogs([
      `DELETE FROM equipment WHERE resource_id = ${resId};`,
      `STATUS: 200 OK -- Removed asset #${resId} (${eq?.name}) from inventory`,
    ]);
  }

  function handleToggleUserType(uId: number) {
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.user_id !== uId) return u;
        const nextType: UserType = u.user_type === "admin" ? "normal" : "admin";
        pushLogs([
          `UPDATE users SET user_type = '${nextType}' WHERE user_id = ${uId};`,
          `STATUS: 200 OK -- user_id=${uId} role changed to ${nextType.toUpperCase()}`,
        ]);
        return { ...u, user_type: nextType };
      }),
    }));
  }

  function handleGrantQualification(targetUId: number, qualId: number) {
    const existing = db.user_qualifications.find(
      (uq) => uq.user_id === targetUId && uq.qualification_id === qualId,
    );

    if (existing) {
      if (existing.status === "VERIFIED") return;
      setDb((prev) => ({
        ...prev,
        user_qualifications: prev.user_qualifications.map((uq) =>
          uq.user_id === targetUId && uq.qualification_id === qualId
            ? { ...uq, status: "VERIFIED" }
            : uq,
        ),
      }));
    } else {
      setDb((prev) => ({
        ...prev,
        user_qualifications: [
          ...prev.user_qualifications,
          {
            user_id: targetUId,
            qualification_id: qualId,
            status: "VERIFIED",
            expiry: "2027-12-31",
          },
        ],
      }));
    }

    pushLogs([
      `INSERT INTO user_qualifications (user_id, qualification_id, status, expiry)`,
      `VALUES (${targetUId}, ${qualId}, 'VERIFIED', '2027-12-31') ON CONFLICT DO UPDATE;`,
      `STATUS: 200 OK -- Verified credential #${qualId} for user_id=${targetUId}`,
    ]);
  }

  function handleRevokeQualification(targetUId: number, qualId: number) {
    setDb((prev) => ({
      ...prev,
      user_qualifications: prev.user_qualifications.filter(
        (uq) => !(uq.user_id === targetUId && uq.qualification_id === qualId),
      ),
    }));
    pushLogs([
      `DELETE FROM user_qualifications WHERE user_id = ${targetUId} AND qualification_id = ${qualId};`,
      `STATUS: 200 OK -- Revoked credential #${qualId} from user_id=${targetUId}`,
    ]);
  }

  function handleReset() {
    setDb(structuredClone(initialDb));
    setCurrentUserId(1);
    setTargetUserId(1);
    setResourceId(201);
    setStartDate("2026-10-15");
    setStartTime("10:30");
    setEndDate("2026-10-15");
    setEndTime("11:30");
    setIsStartNow(false);
    resetVisualState();
    if (typeof window !== "undefined") {
      localStorage.removeItem("labbook_db_v2");
    }
    setFeedback({
      type: "info",
      title: "Seed Reset",
      message: "Database state restored to initial fixtures.",
    });
    pushLogs([`RESET -- Database seed data restored`, `STATUS: 200 OK`]);
  }

  return (
    <m3e-theme
      scheme="light"
      variant="vibrant"
      contrast="standard"
      density="0"
      style={{ fontVariationSettings: "'ROND' 100" }}
    >
      <div
        className="flex flex-col min-h-screen w-screen bg-surface text-on-surface overflow-x-hidden"
        style={{ fontVariationSettings: "'ROND' 100" }}
      >
        {/* LOGIN SCREEN: Shown when not authenticated */}
        {!currentUser ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-surface">
            <div className="max-w-md w-full space-y-6">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-primary-container text-on-primary-container">
                  <m3e-icon name="inventory_2"></m3e-icon>
                </span>
                <div>
                  <h1 className="text-base font-title text-on-surface">
                    LabBook Portal
                  </h1>
                  <p className="text-xs text-on-surface-variant">
                    Inventory & Laboratory Management System
                  </p>
                </div>
              </div>

              {/* Sign In Form */}
              {authMode === "login" ? (
                <div className="space-y-4">
                  <span className="text-xs text-on-surface-variant block">
                    Choose existing account to access:
                  </span>
                  <div className="space-y-2">
                    {db.users.map((u) => (
                      <button
                        key={u.user_id}
                        type="button"
                        onClick={() => setSelectedLoginUserId(u.user_id)}
                        className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all ${
                          selectedLoginUserId === u.user_id
                            ? "bg-primary-container/40 ring-1 ring-primary"
                            : "bg-surface-container hover:bg-surface-container-high"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold text-on-surface">
                            {u.name}
                          </div>
                          <div className="text-[11px] text-on-surface-variant">
                            {u.role} · {u.department}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                            u.user_type === "admin"
                              ? "bg-primary text-on-primary"
                              : "bg-surface-container-highest text-on-surface-variant"
                          }`}
                        >
                          {u.user_type === "admin" ? "Admin" : "Normal User"}
                        </span>
                      </button>
                    ))}
                  </div>

                  <m3e-button
                    variant="filled"
                    className="w-full rounded-lg font-title"
                    onClick={() => handleLogin(selectedLoginUserId)}
                  >
                    Enter Portal
                  </m3e-button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode("register")}
                      className="text-xs text-primary hover:underline font-medium cursor-pointer"
                    >
                      New user? Create an account
                    </button>
                  </div>
                </div>
              ) : (
                /* Register User Form */
                <div className="space-y-4">
                  <m3e-form-field variant="filled" className="w-full block rounded-lg">
                    <label slot="label" htmlFor="reg-name">Full Name</label>
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="e.g. Dr. Jordan Reed"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full text-sm px-3 py-2 bg-transparent focus:outline-none rounded-lg font-medium"
                    />
                  </m3e-form-field>

                  <div className="grid grid-cols-2 gap-3">
                    <m3e-form-field variant="filled" className="w-full block rounded-lg">
                      <label slot="label" htmlFor="reg-role">Role</label>
                      <select
                        id="reg-role"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as Role)}
                        className="w-full text-xs px-3 py-2.5 bg-transparent focus:outline-none rounded-lg"
                      >
                        <option value="Researcher">Researcher</option>
                        <option value="Faculty">Faculty</option>
                        <option value="Student">Student</option>
                        <option value="Technician">Technician</option>
                      </select>
                    </m3e-form-field>

                    <m3e-form-field variant="filled" className="w-full block rounded-lg">
                      <label slot="label" htmlFor="reg-type">User Type</label>
                      <select
                        id="reg-type"
                        value={regUserType}
                        onChange={(e) => setRegUserType(e.target.value as UserType)}
                        className="w-full text-xs px-3 py-2.5 bg-transparent focus:outline-none rounded-lg font-semibold"
                      >
                        <option value="normal">Normal User</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </m3e-form-field>
                  </div>

                  <m3e-form-field variant="filled" className="w-full block rounded-lg">
                    <label slot="label" htmlFor="reg-dept">Department</label>
                    <input
                      id="reg-dept"
                      type="text"
                      placeholder="e.g. Molecular Biology"
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      className="w-full text-sm px-3 py-2 bg-transparent focus:outline-none rounded-lg"
                    />
                  </m3e-form-field>

                  <m3e-button
                    variant="filled"
                    className="w-full rounded-lg font-title"
                    onClick={handleRegister}
                  >
                    Create User & Sign In
                  </m3e-button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode("login")}
                      className="text-xs text-primary hover:underline font-medium cursor-pointer"
                    >
                      Already have an account? Sign in
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* AUTHENTICATED APP SHELL */
          <>
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between px-4 py-2 bg-surface-container shrink-0 gap-2 border-b border-surface-container-high/40">
              <div className="flex flex-wrap items-center gap-1">
                {/* Tabs for Normal vs Admin */}
                {currentUser.user_type === "admin" ? (
                  <>
                    <m3e-button
                      variant={activeTab === "inventory" ? "filled" : "text"}
                      className="rounded-lg font-title text-xs"
                      onClick={() => setActiveTab("inventory")}
                    >
                      Inventory & Assets
                    </m3e-button>
                    <m3e-button
                      variant={activeTab === "users" ? "filled" : "text"}
                      className="rounded-lg font-title text-xs"
                      onClick={() => setActiveTab("users")}
                    >
                      User Accounts
                    </m3e-button>
                    <m3e-button
                      variant={activeTab === "book" ? "filled" : "text"}
                      className="rounded-lg font-title text-xs"
                      onClick={() => setActiveTab("book")}
                    >
                      Book Equipment
                    </m3e-button>
                    <m3e-button
                      variant={activeTab === "reservations" ? "filled" : "text"}
                      className="rounded-lg font-title text-xs"
                      onClick={() => setActiveTab("reservations")}
                    >
                      All Reservations
                    </m3e-button>
                  </>
                ) : (
                  <>
                    <m3e-button
                      variant={activeTab === "book" ? "filled" : "text"}
                      className="rounded-lg font-title text-xs"
                      onClick={() => setActiveTab("book")}
                    >
                      Book Equipment
                    </m3e-button>
                    <m3e-button
                      variant={activeTab === "catalog" ? "filled" : "text"}
                      className="rounded-lg font-title text-xs"
                      onClick={() => setActiveTab("catalog")}
                    >
                      Equipment Catalog
                    </m3e-button>
                    <m3e-button
                      variant={activeTab === "reservations" ? "filled" : "text"}
                      className="rounded-lg font-title text-xs"
                      onClick={() => setActiveTab("reservations")}
                    >
                      My Reservations
                    </m3e-button>
                  </>
                )}

                {/* Shared Views: Graph & Logs baked inside */}
                <m3e-button
                  variant={activeTab === "schema" ? "filled" : "text"}
                  className="rounded-lg font-title text-xs"
                  onClick={() => setActiveTab("schema")}
                >
                  ER Schema Graph
                </m3e-button>
                <m3e-button
                  variant={activeTab === "logs" ? "filled" : "text"}
                  className="rounded-lg font-title text-xs"
                  onClick={() => setActiveTab("logs")}
                >
                  SQL Audit Logs
                </m3e-button>
              </div>

              {/* User session status & control */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low text-xs">
                  <span className="font-medium text-on-surface">{currentUser.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold tracking-wider uppercase ${
                      currentUser.user_type === "admin"
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    {currentUser.user_type === "admin" ? "Admin" : "User"}
                  </span>
                </div>

                <m3e-button
                  variant="text"
                  className="rounded-lg text-xs"
                  onClick={handleLogout}
                >
                  Switch User
                </m3e-button>
                <m3e-button
                  variant="text"
                  className="rounded-lg text-xs"
                  onClick={handleReset}
                >
                  Reset DB
                </m3e-button>
              </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 relative bg-surface min-h-0 flex flex-col">
              {/* Global Feedback Banner */}
              {feedback && (
                <div className="max-w-4xl mx-auto w-full px-6 pt-4">
                  <div
                    className={`p-4 rounded-xl flex items-start justify-between ${
                      feedback.type === "success"
                        ? "bg-success-container text-on-success-container"
                        : feedback.type === "conflict" || feedback.type === "forbidden"
                        ? "bg-error-container text-on-error-container"
                        : "bg-surface-container text-on-surface"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-title">{feedback.title}</div>
                      <p className="text-xs">{feedback.message}</p>
                      {feedback.sqlSnippet && (
                        <p className="text-[11px] font-mono opacity-80 pt-1">
                          {feedback.sqlSnippet}
                        </p>
                      )}
                    </div>
                    <m3e-button
                      variant="text"
                      className="rounded-lg"
                      onClick={() => setFeedback(null)}
                    >
                      Dismiss
                    </m3e-button>
                  </div>
                </div>
              )}

              {/* TAB: INVENTORY & ASSETS (Admin Only) */}
              {activeTab === "inventory" && currentUser.user_type === "admin" && (
                <div className="max-w-4xl mx-auto w-full py-8 px-6 space-y-8">
                  <div>
                    <h2 className="text-base font-title text-on-surface">
                      Inventory & Equipment Management
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Track research equipment status, add new assets, and manage required safety certifications.
                    </p>
                  </div>

                  {/* Add Equipment Card */}
                  <div className="p-5 rounded-2xl bg-surface-container-low space-y-4">
                    <h3 className="text-xs font-title tracking-wide text-primary flex items-center gap-1.5">
                      <m3e-icon name="add_circle"></m3e-icon>
                      Register New Equipment Asset
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <m3e-form-field variant="filled" className="w-full block rounded-lg">
                        <label slot="label" htmlFor="equip-name">Equipment Name</label>
                        <input
                          id="equip-name"
                          type="text"
                          placeholder="e.g. Atomic Force Microscope"
                          value={newEquipName}
                          onChange={(e) => setNewEquipName(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-transparent focus:outline-none rounded-lg font-medium"
                        />
                      </m3e-form-field>

                      <m3e-form-field variant="filled" className="w-full block rounded-lg">
                        <label slot="label" htmlFor="equip-loc">Location</label>
                        <input
                          id="equip-loc"
                          type="text"
                          placeholder="e.g. Nanotech Wing 204"
                          value={newEquipLocation}
                          onChange={(e) => setNewEquipLocation(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-transparent focus:outline-none rounded-lg"
                        />
                      </m3e-form-field>

                      <m3e-form-field variant="filled" className="w-full block rounded-lg">
                        <label slot="label" htmlFor="equip-status">Initial Status</label>
                        <select
                          id="equip-status"
                          value={newEquipStatus}
                          onChange={(e) =>
                            setNewEquipStatus(e.target.value as Equipment["status"])
                          }
                          className="w-full text-xs px-3 py-2.5 bg-transparent focus:outline-none rounded-lg"
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                          <option value="OFFLINE">OFFLINE</option>
                        </select>
                      </m3e-form-field>

                      <m3e-form-field variant="filled" className="w-full block rounded-lg">
                        <label slot="label" htmlFor="equip-req">Prerequisite Qualification</label>
                        <select
                          id="equip-req"
                          value={newEquipReqQualId}
                          onChange={(e) => setNewEquipReqQualId(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2.5 bg-transparent focus:outline-none rounded-lg"
                        >
                          {db.qualifications.map((q) => (
                            <option key={q.qualification_id} value={q.qualification_id}>
                              {q.name}
                            </option>
                          ))}
                        </select>
                      </m3e-form-field>
                    </div>

                    <div className="flex justify-end pt-1">
                      <m3e-button
                        variant="filled"
                        className="rounded-lg text-xs font-title"
                        onClick={handleAddEquipment}
                      >
                        Add to Inventory
                      </m3e-button>
                    </div>
                  </div>

                  {/* Equipment Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-title tracking-wide text-on-surface">
                      Current Inventory ({db.equipment.length} items)
                    </h3>
                    <div className="overflow-x-auto rounded-xl bg-surface-container-low">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="bg-surface-container text-on-surface-variant">
                            <th className="py-2.5 px-3">ID</th>
                            <th className="py-2.5 px-3">Name</th>
                            <th className="py-2.5 px-3">Location</th>
                            <th className="py-2.5 px-3">Prerequisites</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-transparent">
                          {db.equipment.map((eq) => {
                            const reqs = db.equipment_requirements
                              .filter((r) => r.resource_id === eq.resource_id)
                              .map(
                                (r) =>
                                  db.qualifications.find(
                                    (q) => q.qualification_id === r.qualification_id,
                                  )?.name ?? `#${r.qualification_id}`,
                              );

                            return (
                              <tr
                                key={eq.resource_id}
                                className="hover:bg-surface-container transition-colors"
                              >
                                <td className="py-2.5 px-3 font-semibold text-primary">
                                  #{eq.resource_id}
                                </td>
                                <td className="py-2.5 px-3 font-sans font-medium">
                                  {eq.name}
                                </td>
                                <td className="py-2.5 px-3 font-sans text-on-surface-variant">
                                  {eq.location}
                                </td>
                                <td className="py-2.5 px-3 font-sans">
                                  {reqs.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {reqs.map((rq, idx) => (
                                        <span
                                          key={idx}
                                          className="px-1.5 py-0.5 rounded text-[10px] bg-surface-container-high text-on-surface-variant"
                                        >
                                          {rq}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-outline italic">None</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      eq.status === "AVAILABLE"
                                        ? "bg-success-container text-on-success-container"
                                        : eq.status === "MAINTENANCE"
                                        ? "bg-amber-100 text-amber-900"
                                        : "bg-error-container text-on-error-container"
                                    }`}
                                  >
                                    {eq.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1 font-sans">
                                    <m3e-button
                                      variant={eq.status === "AVAILABLE" ? "tonal" : "text"}
                                      className="rounded-md text-[11px]"
                                      onClick={() =>
                                        handleUpdateEquipmentStatus(eq.resource_id, "AVAILABLE")
                                      }
                                    >
                                      Avail
                                    </m3e-button>
                                    <m3e-button
                                      variant={eq.status === "MAINTENANCE" ? "tonal" : "text"}
                                      className="rounded-md text-[11px]"
                                      onClick={() =>
                                        handleUpdateEquipmentStatus(eq.resource_id, "MAINTENANCE")
                                      }
                                    >
                                      Maint
                                    </m3e-button>
                                    <m3e-button
                                      variant="text"
                                      className="rounded-md text-[11px] text-error"
                                      onClick={() => handleDeleteEquipment(eq.resource_id)}
                                    >
                                      Delete
                                    </m3e-button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: USER ACCOUNTS & CREDENTIALS (Admin Only) */}
              {activeTab === "users" && currentUser.user_type === "admin" && (
                <div className="max-w-4xl mx-auto w-full py-8 px-6 space-y-8">
                  <div>
                    <h2 className="text-base font-title text-on-surface">
                      User Accounts & Safety Credentials
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Promote users to admin, grant verified safety certifications, or revoke credentials.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {db.users.map((u) => {
                      const uQuals = db.user_qualifications.filter(
                        (uq) => uq.user_id === u.user_id && uq.status === "VERIFIED",
                      );

                      return (
                        <div
                          key={u.user_id}
                          className="p-5 rounded-2xl bg-surface-container-low space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
                                {u.name.slice(0, 1)}
                              </span>
                              <div>
                                <div className="text-xs font-title text-on-surface flex items-center gap-2">
                                  <span>{u.name}</span>
                                  <span className="text-[11px] font-mono text-outline">
                                    (ID #{u.user_id})
                                  </span>
                                </div>
                                <div className="text-[11px] text-on-surface-variant">
                                  {u.role} · {u.department}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                                  u.user_type === "admin"
                                    ? "bg-primary text-on-primary"
                                    : "bg-surface-container-highest text-on-surface-variant"
                                }`}
                              >
                                {u.user_type === "admin" ? "Admin" : "Normal User"}
                              </span>
                              <m3e-button
                                variant="tonal"
                                className="rounded-lg text-xs"
                                onClick={() => handleToggleUserType(u.user_id)}
                              >
                                Switch to {u.user_type === "admin" ? "Normal" : "Admin"}
                              </m3e-button>
                            </div>
                          </div>

                          {/* Credentials list and granting */}
                          <div className="pt-2 border-t border-surface-container/60 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-on-surface-variant">
                                Verified Safety Credentials:
                              </span>
                              {uQuals.length > 0 ? (
                                uQuals.map((uq) => {
                                  const qObj = db.qualifications.find(
                                    (q) => q.qualification_id === uq.qualification_id,
                                  );
                                  return (
                                    <span
                                      key={uq.qualification_id}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-success-container text-on-success-container font-medium"
                                    >
                                      <span>{qObj?.name ?? uq.qualification_id}</span>
                                      <button
                                        type="button"
                                        title="Revoke credential"
                                        onClick={() =>
                                          handleRevokeQualification(
                                            u.user_id,
                                            uq.qualification_id,
                                          )
                                        }
                                        className="hover:opacity-75 font-bold ml-1"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-xs italic text-outline">
                                  No verified credentials
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <select
                                value={adminSelectedQualId}
                                onChange={(e) =>
                                  setAdminSelectedQualId(Number(e.target.value))
                                }
                                className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface border-none"
                              >
                                {db.qualifications.map((q) => (
                                  <option key={q.qualification_id} value={q.qualification_id}>
                                    {q.name}
                                  </option>
                                ))}
                              </select>
                              <m3e-button
                                variant="text"
                                className="rounded-lg text-xs"
                                onClick={() =>
                                  handleGrantQualification(u.user_id, adminSelectedQualId)
                                }
                              >
                                + Grant Credential
                              </m3e-button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: EQUIPMENT CATALOG (Normal User View) */}
              {activeTab === "catalog" && (
                <div className="max-w-4xl mx-auto w-full py-8 px-6 space-y-6">
                  <div>
                    <h2 className="text-base font-title text-on-surface">
                      Laboratory Equipment Catalog
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Review instruments available across lab spaces and verify required qualifications.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {db.equipment.map((eq) => {
                      const reqs = db.equipment_requirements
                        .filter((r) => r.resource_id === eq.resource_id)
                        .map(
                          (r) =>
                            db.qualifications.find(
                              (q) => q.qualification_id === r.qualification_id,
                            )?.name ?? `#${r.qualification_id}`,
                        );

                      const userQualified = evaluateQualificationDivision(
                        db,
                        effectiveBookingUserId,
                        eq.resource_id,
                      ).eligible;

                      return (
                        <div
                          key={eq.resource_id}
                          className="p-5 rounded-2xl bg-surface-container-low space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h3 className="text-sm font-title text-on-surface">
                                {eq.name}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  eq.status === "AVAILABLE"
                                    ? "bg-success-container text-on-success-container"
                                    : "bg-error-container text-on-error-container"
                                }`}
                              >
                                {eq.status}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant">
                              Location: <strong>{eq.location}</strong>
                            </p>

                            <div className="space-y-1 pt-1">
                              <span className="text-[11px] font-medium text-outline block">
                                Prerequisites:
                              </span>
                              {reqs.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {reqs.map((rq, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 rounded text-[11px] bg-surface-container text-on-surface-variant"
                                    >
                                      {rq}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs italic text-outline">
                                  No prerequisite certifications
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-surface-container/60 flex items-center justify-between">
                            <span
                              className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                                userQualified
                                  ? "bg-success-container text-on-success-container"
                                  : "bg-error-container text-on-error-container"
                              }`}
                            >
                              {userQualified ? "You are Eligible" : "Prerequisites Missing"}
                            </span>

                            <m3e-button
                              variant="filled"
                              className="rounded-lg text-xs font-title"
                              onClick={() => {
                                setResourceId(eq.resource_id);
                                setActiveTab("book");
                              }}
                            >
                              Book Instrument
                            </m3e-button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: BOOK EQUIPMENT */}
              {activeTab === "book" && (
                <div className="max-w-2xl mx-auto w-full py-8 px-6 space-y-8">
                  {/* Admin override: Select Staff to Book For */}
                  {currentUser.user_type === "admin" && (
                    <section className="space-y-2 p-4 rounded-xl bg-surface-container-low">
                      <span className="text-xs font-title text-primary flex items-center gap-1.5">
                        <m3e-icon name="admin_panel_settings"></m3e-icon>
                        Admin Action: Book on Behalf of Staff Member
                      </span>
                      <select
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-surface-container text-on-surface font-medium"
                      >
                        {db.users.map((u) => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.name} — {u.role}, {u.department} ({u.user_type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </section>
                  )}

                  {/* Section: Staff Profile Info */}
                  <section className="space-y-2">
                    <h2 className="text-sm tracking-wide text-on-surface font-title">
                      Reserving Staff Member
                    </h2>
                    <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-on-surface">
                          {bookingStaff.name}
                        </div>
                        <div className="text-[11px] text-on-surface-variant">
                          {bookingStaff.role} · {bookingStaff.department}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-outline">
                        User #{bookingStaff.user_id}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-on-surface-variant">
                        Verified Credentials:
                      </span>
                      {userQualifications.length > 0 ? (
                        userQualifications.map((q) => (
                          <span
                            key={q.qualification_id}
                            className="px-2.5 py-1 rounded-md text-xs bg-surface-container-low text-on-surface-variant font-medium"
                          >
                            {q.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic text-outline">
                          None on record
                        </span>
                      )}
                    </div>
                  </section>

                  {/* Section: Laboratory Equipment */}
                  <section className="space-y-3">
                    <h2 className="text-sm tracking-wide text-on-surface font-title">
                      Laboratory Equipment
                    </h2>
                    <select
                      value={resourceId}
                      onChange={(e) => setResourceId(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2.5 rounded-lg bg-surface-container text-on-surface font-medium"
                    >
                      {db.equipment.map((e) => (
                        <option key={e.resource_id} value={e.resource_id}>
                          {e.name} ({e.location}) — Status: {e.status}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                      <span>
                        Location:{" "}
                        <strong className="text-on-surface">
                          {selectedEquipment.location}
                        </strong>
                      </span>
                      <span>
                        Status:{" "}
                        <strong
                          className={
                            selectedEquipment.status === "AVAILABLE"
                              ? "text-success font-semibold"
                              : "text-error font-semibold"
                          }
                        >
                          {selectedEquipment.status}
                        </strong>
                      </span>
                      <span>
                        Eligibility:{" "}
                        <strong
                          className={`px-2 py-0.5 rounded-md text-xs font-mono ${
                            divisionResult.eligible
                              ? "bg-success-container text-on-success-container"
                              : "bg-error-container text-on-error-container"
                          }`}
                        >
                          {divisionResult.eligible ? "Qualified" : "Missing Prerequisite"}
                        </strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-on-surface-variant">
                        Prerequisites:
                      </span>
                      {equipmentRequirements.map((q) => {
                        const userHasIt = userQualifications.some(
                          (uq) => uq.qualification_id === q.qualification_id,
                        );
                        return (
                          <span
                            key={q.qualification_id}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                              userHasIt
                                ? "bg-success-container text-on-success-container"
                                : "bg-error-container text-on-error-container"
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
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm tracking-wide text-on-surface font-title">
                        Reservation Schedule
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-on-surface">
                          Start Now
                        </span>
                        <m3e-switch
                          checked={isStartNow ? "" : undefined}
                          onChange={(e: React.FormEvent<HTMLElement>) => {
                            const target = e.target as HTMLInputElement | null;
                            handleStartNowToggle(Boolean(target?.checked));
                          }}
                        ></m3e-switch>
                      </div>
                    </div>

                    {/* Merged Start and End Schedule Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Start Schedule */}
                      <div className="p-4 rounded-xl bg-surface-container-low space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-title tracking-wide text-primary flex items-center gap-1.5">
                            <m3e-icon name="play_arrow"></m3e-icon>
                            Start Schedule
                          </span>
                          <span className="text-[11px] font-mono text-outline">
                            {startDate} {startTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <m3e-form-field variant="filled" className="flex-1 block rounded-lg">
                            <label slot="label" htmlFor="start-date-input">Start Date</label>
                            <input
                              id="start-date-input"
                              type="date"
                              value={startDate}
                              onChange={(e) => {
                                setStartDate(e.target.value);
                                if (e.target.value > endDate) setEndDate(e.target.value);
                              }}
                              className="w-full text-sm font-mono px-3 py-2 bg-transparent focus:outline-none rounded-lg font-medium"
                            />
                          </m3e-form-field>

                          <m3e-button
                            variant="tonal"
                            type="button"
                            className="rounded-lg shrink-0"
                            onClick={() => {
                              const picker = document.getElementById(
                                "start-datepicker",
                              ) as (HTMLElement & { toggle?: (el: HTMLElement | null) => void }) | null;
                              const input = document.getElementById("start-date-input");
                              if (picker && input) picker.toggle?.(input);
                            }}
                          >
                            <m3e-icon slot="icon" name="calendar_today"></m3e-icon>
                            Date
                          </m3e-button>
                        </div>

                        <div className="flex items-center gap-2">
                          <m3e-form-field variant="filled" className="flex-1 block rounded-lg">
                            <label slot="label" htmlFor="start-time-input">Start Time</label>
                            <input
                              id="start-time-input"
                              type="time"
                              value={startTime}
                              onChange={(e) => {
                                setStartTime(e.target.value);
                                setIsStartNow(false);
                              }}
                              className="w-full text-sm font-mono px-3 py-2 bg-transparent focus:outline-none rounded-lg font-medium"
                            />
                          </m3e-form-field>

                          <m3e-button
                            variant="tonal"
                            type="button"
                            className="rounded-lg shrink-0"
                            onClick={() => {
                              const picker = document.getElementById(
                                "start-timepicker",
                              ) as (HTMLElement & { toggle?: (el: HTMLElement | null) => void }) | null;
                              const input = document.getElementById("start-time-input");
                              if (picker && input) picker.toggle?.(input);
                            }}
                          >
                            <m3e-icon slot="icon" name="schedule"></m3e-icon>
                            Time
                          </m3e-button>
                        </div>
                      </div>

                      {/* End Schedule */}
                      <div className="p-4 rounded-xl bg-surface-container-low space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-title tracking-wide text-primary flex items-center gap-1.5">
                            <m3e-icon name="stop"></m3e-icon>
                            End Schedule
                          </span>
                          <span className="text-[11px] font-mono text-outline">
                            {endDate} {endTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <m3e-form-field variant="filled" className="flex-1 block rounded-lg">
                            <label slot="label" htmlFor="end-date-input">End Date</label>
                            <input
                              id="end-date-input"
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full text-sm font-mono px-3 py-2 bg-transparent focus:outline-none rounded-lg font-medium"
                            />
                          </m3e-form-field>

                          <m3e-button
                            variant="tonal"
                            type="button"
                            className="rounded-lg shrink-0"
                            onClick={() => {
                              const picker = document.getElementById(
                                "end-datepicker",
                              ) as (HTMLElement & { toggle?: (el: HTMLElement | null) => void }) | null;
                              const input = document.getElementById("end-date-input");
                              if (picker && input) picker.toggle?.(input);
                            }}
                          >
                            <m3e-icon slot="icon" name="calendar_today"></m3e-icon>
                            Date
                          </m3e-button>
                        </div>

                        <div className="flex items-center gap-2">
                          <m3e-form-field variant="filled" className="flex-1 block rounded-lg">
                            <label slot="label" htmlFor="end-time-input">End Time</label>
                            <input
                              id="end-time-input"
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              className="w-full text-sm font-mono px-3 py-2 bg-transparent focus:outline-none rounded-lg font-medium"
                            />
                          </m3e-form-field>

                          <m3e-button
                            variant="tonal"
                            type="button"
                            className="rounded-lg shrink-0"
                            onClick={() => {
                              const picker = document.getElementById(
                                "end-timepicker",
                              ) as (HTMLElement & { toggle?: (el: HTMLElement | null) => void }) | null;
                              const input = document.getElementById("end-time-input");
                              if (picker && input) picker.toggle?.(input);
                            }}
                          >
                            <m3e-icon slot="icon" name="schedule"></m3e-icon>
                            Time
                          </m3e-button>
                        </div>
                      </div>
                    </div>

                    {/* Modal Dialog Pickers */}
                    <m3e-datepicker
                      id="start-datepicker"
                      variant="modal"
                      onChange={(e: React.FormEvent<HTMLElement>) => {
                        const target = e.target as (EventTarget & { date?: Date }) | null;
                        const d = target?.date;
                        if (d instanceof Date) {
                          const str = formatDate(d);
                          setStartDate(str);
                          if (str > endDate) setEndDate(str);
                        }
                      }}
                    ></m3e-datepicker>

                    <m3e-datepicker
                      id="end-datepicker"
                      variant="modal"
                      onChange={(e: React.FormEvent<HTMLElement>) => {
                        const target = e.target as (EventTarget & { date?: Date }) | null;
                        const d = target?.date;
                        if (d instanceof Date) {
                          setEndDate(formatDate(d));
                        }
                      }}
                    ></m3e-datepicker>

                    <m3e-timepicker
                      id="start-timepicker"
                      variant="modal"
                      format="24"
                      onChange={(e: React.FormEvent<HTMLElement>) => {
                        const target = e.target as (EventTarget & { date?: Date }) | null;
                        const d = target?.date;
                        if (d instanceof Date) {
                          setStartTime(formatTime(d));
                          setIsStartNow(false);
                        }
                      }}
                    ></m3e-timepicker>

                    <m3e-timepicker
                      id="end-timepicker"
                      variant="modal"
                      format="24"
                      onChange={(e: React.FormEvent<HTMLElement>) => {
                        const target = e.target as (EventTarget & { date?: Date }) | null;
                        const d = target?.date;
                        if (d instanceof Date) {
                          setEndTime(formatTime(d));
                        }
                      }}
                    ></m3e-timepicker>

                    {/* Duration Adjust Buttons */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-medium text-on-surface-variant block">
                        Adjust Duration
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <m3e-button-group
                          variant="connected"
                          className="rounded-lg overflow-hidden"
                        >
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
                    <m3e-form-field variant="filled" className="w-full block rounded-lg">
                      <label slot="label" htmlFor="purpose-input">
                        Research Purpose (Optional)
                      </label>
                      <input
                        id="purpose-input"
                        type="text"
                        placeholder="e.g. Protocol analysis"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full text-sm px-3 py-2 bg-transparent focus:outline-none rounded-lg"
                      />
                    </m3e-form-field>
                  </section>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <m3e-button
                      variant="filled"
                      className="flex-1 rounded-lg font-title"
                      onClick={handleInsert}
                    >
                      Submit Booking
                    </m3e-button>
                    <m3e-button
                      variant="tonal"
                      className="flex-1 rounded-lg font-title"
                      onClick={handleDivision}
                    >
                      Verify Eligibility
                    </m3e-button>
                  </div>
                </div>
              )}

              {/* TAB: RESERVATIONS (User or Master Admin View) */}
              {activeTab === "reservations" && (
                <div className="max-w-4xl mx-auto w-full py-8 px-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-title text-on-surface">
                        {currentUser.user_type === "admin"
                          ? "Master Reservation Ledger"
                          : "My Active Reservations"}
                      </h2>
                      <p className="text-xs text-on-surface-variant">
                        {currentUser.user_type === "admin"
                          ? "Full inventory booking schedule across all research staff."
                          : `Scheduled equipment usage for ${currentUser.name}.`}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl bg-surface-container-low">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="bg-surface-container text-on-surface-variant">
                          <th className="py-2.5 px-3">ID</th>
                          <th className="py-2.5 px-3">Equipment</th>
                          <th className="py-2.5 px-3">Staff</th>
                          <th className="py-2.5 px-3">Start</th>
                          <th className="py-2.5 px-3">End</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-transparent">
                        {db.bookings
                          .filter((b) =>
                            currentUser.user_type === "admin"
                              ? true
                              : b.user_id === currentUser.user_id,
                          )
                          .map((b) => {
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
                                className="hover:bg-surface-container transition-colors"
                              >
                                <td className="py-2.5 px-3 font-semibold text-primary">
                                  #{b.booking_id}
                                </td>
                                <td className="py-2.5 px-3 font-sans">
                                  {eq?.name ?? b.resource_id}
                                </td>
                                <td className="py-2.5 px-3 font-sans text-on-surface-variant">
                                  {usr?.name ?? b.user_id}
                                </td>
                                <td className="py-2.5 px-3 text-on-surface-variant">
                                  {new Date(b.start_datetime).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="py-2.5 px-3 text-on-surface-variant">
                                  {new Date(b.end_datetime).toLocaleString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                      isConfirmed
                                        ? "bg-success-container text-on-success-container"
                                        : "bg-surface-container text-outline"
                                    }`}
                                  >
                                    {b.status}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-sans">
                                  {isConfirmed ? (
                                    <m3e-button
                                      variant="text"
                                      className="rounded-lg text-xs"
                                      onClick={() => handleCancelBooking(b.booking_id)}
                                    >
                                      Cancel
                                    </m3e-button>
                                  ) : (
                                    <span className="text-xs text-outline italic">
                                      Released
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: ER SCHEMA GRAPH (Baked Inside) */}
              {activeTab === "schema" && (
                <div
                  style={{
                    width: "100%",
                    height: "calc(100vh - 48px)",
                    minHeight: "500px",
                  }}
                  className="relative bg-surface"
                >
                  <div className="absolute top-4 left-4 z-10 bg-surface-container-low shadow-sm rounded-xl px-4 py-2 flex items-center gap-3">
                    <span className="text-xs font-title text-primary">
                      ER Graph
                    </span>
                    <span className="text-xs text-on-surface-variant hidden sm:inline">
                      Live relational schema with credentials & exclusion constraints
                    </span>
                    <m3e-button
                      variant="filled"
                      className="rounded-lg font-title text-xs"
                      onClick={handleDivision}
                    >
                      Test Division
                    </m3e-button>
                    <m3e-button
                      variant="tonal"
                      className="rounded-lg font-title text-xs"
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
                    style={{ width: "100%", height: "100%" }}
                  >
                    <Background
                      gap={24}
                      size={1.5}
                      color="var(--md-sys-color-primary)"
                      style={{ opacity: 0.08 }}
                    />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </div>
              )}

              {/* TAB: SQL AUDIT LOGS (Baked Inside) */}
              {activeTab === "logs" && (
                <div
                  style={{ width: "100%", height: "calc(100vh - 48px)" }}
                  className="flex flex-col p-6 bg-surface overflow-hidden"
                >
                  <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm tracking-wide text-on-surface font-title flex items-center gap-2">
                          <span>Production Audit Log Stream</span>
                          <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                            {logs.length} events
                          </span>
                        </h2>
                        <p className="text-xs text-outline">
                          Transactional execution, inventory changes, GiST checks, and relational proofs
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <m3e-button
                          variant={autoScroll ? "filled" : "outlined"}
                          className="rounded-lg text-xs font-title"
                          onClick={() => setAutoScroll((prev) => !prev)}
                        >
                          <m3e-icon
                            slot="icon"
                            name={autoScroll ? "vertical_align_bottom" : "pause"}
                          ></m3e-icon>
                          Autoscroll: {autoScroll ? "ON" : "OFF"}
                        </m3e-button>
                        <m3e-button
                          variant="text"
                          className="rounded-lg text-xs"
                          onClick={() => setLogs([])}
                        >
                          <m3e-icon slot="icon" name="delete_sweep"></m3e-icon>
                          Clear
                        </m3e-button>
                        <m3e-button
                          variant="tonal"
                          className="rounded-lg text-xs font-title"
                          onClick={handleCopyLogs}
                        >
                          <m3e-icon slot="icon" name="content_copy"></m3e-icon>
                          Copy
                        </m3e-button>
                      </div>
                    </div>

                    <div
                      ref={consoleRef}
                      className="logs-console flex-1 overflow-y-auto rounded-xl bg-surface-container-low p-4 text-[12px] leading-relaxed text-on-surface shadow-sm"
                      style={{
                        fontFamily: "'Google Sans Code', ui-monospace, monospace",
                      }}
                    >
                      {logs.length === 0 ? (
                        <div className="text-on-surface-variant opacity-70 italic py-6 text-center">
                          -- Log buffer cleared. Perform actions to stream live audit events.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {logs.map((log) => (
                            <div
                              key={log.id}
                              className="console-line flex items-baseline gap-2 py-1 hover:bg-surface-container/50 px-2 rounded-md transition-colors"
                            >
                              <span className="text-outline text-[11px] shrink-0 select-none">
                                {log.timestamp}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0 uppercase ${
                                  log.level === "ERROR"
                                    ? "bg-error-container text-on-error-container"
                                    : log.level === "WARN"
                                    ? "bg-amber-100 text-amber-900"
                                    : log.level === "DEBUG"
                                    ? "bg-surface-container-high text-on-surface-variant"
                                    : "bg-primary-container text-on-primary-container"
                                }`}
                              >
                                {log.level}
                              </span>
                              <span className="text-on-surface-variant font-medium text-[11px] shrink-0">
                                [{log.tag}]
                              </span>
                              <span
                                className={`flex-1 break-all whitespace-pre-wrap ${
                                  log.level === "ERROR"
                                    ? "text-error font-semibold"
                                    : log.level === "WARN"
                                    ? "text-amber-900 font-medium"
                                    : log.message.startsWith("SELECT") ||
                                      log.message.startsWith("INSERT") ||
                                      log.message.startsWith("UPDATE") ||
                                      log.message.startsWith("DELETE")
                                    ? "text-primary font-semibold"
                                    : "text-on-surface"
                                }`}
                              >
                                {log.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </m3e-theme>
  );
}
