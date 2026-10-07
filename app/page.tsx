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

const EDGE_STYLE = { stroke: "rgba(255, 255, 255, 0.45)", strokeWidth: 1.5 };

export default function Page() {
  const [db, setDb] = useState<DbState>(() => structuredClone(initialDb));
  const [userId, setUserId] = useState(1);
  const [resourceId, setResourceId] = useState(201);
  const [start, setStart] = useState("2026-10-15T10:30");
  const [end, setEnd] = useState("2026-10-15T11:30");
  const [logs, setLogs] = useState<string[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    revealConsoleLines(consoleRef.current);
  }, [logs]);

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

  function handleDivision() {
    const res = evaluateQualificationDivision(db, userId, resourceId);
    const divisionOk = res.eligible;
    pushLogs([
      `-- Relational division: NOT EXISTS ( ... EXCEPT ... )`,
      `SELECT EXISTS (SELECT 1 FROM equipment e WHERE e.resource_id = ${resourceId}`,
      `  AND NOT EXISTS (SELECT qualification_id FROM equipment_requirements`,
      `    WHERE resource_id = ${resourceId} EXCEPT SELECT qualification_id`,
      `    FROM user_qualifications WHERE user_id = ${userId} AND status = 'VERIFIED'));`,
      `Required - User = Missing: {${res.requiredQualificationIds.join(", ") || "∅"}} -`,
      `  {${res.userQualificationIds.join(", ") || "∅"}} = {${res.missingQualificationIds.join(", ") || "∅"}}`,
      divisionOk
        ? `STATUS: 200 OK -- user ${userId} satisfies all requirements`
        : `STATUS: 403 Forbidden -- missing credentials: [${res.missingQualificationIds.join(", ")}]`,
    ]);
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
    const conflict = checkRangeConflict(db, resourceId, startIso, endIso);

    if (conflict.conflict) {
      pushLogs([
        `INSERT INTO bookings (resource_id, user_id, start_datetime, end_datetime, status)`,
        `VALUES (${resourceId}, ${userId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
        `EXCLUDE USING gist (resource_id WITH =, tstzrange(start_datetime, end_datetime) WITH &&)`,
        `ERROR: conflicting key value violates exclusion constraint on resource ${resourceId}`,
        `detail: existing booking ${conflict.bookingId} occupies ${conflict.interval}`,
        `STATUS: 409 Conflict -- SQLSTATE 23P01 (exclusion_violation)`,
      ]);
      requestAnimationFrame(() => runInsertAnimation({ conflict: true }));
      return;
    }

    const division = evaluateQualificationDivision(db, userId, resourceId);
    if (!division.eligible) {
      pushLogs([
        `INSERT INTO bookings ... VALUES (${resourceId}, ${userId}, '${startIso}', '${endIso}', 'CONFIRMED');`,
        `STATUS: 403 Forbidden -- missing credentials: [${division.missingQualificationIds.join(", ")}]`,
      ]);
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
      `STATUS: 200 OK -- inserted booking_id ${newId}`,
    ]);
    requestAnimationFrame(() =>
      setTimeout(
        () => runInsertAnimation({ conflict: false, newBookingId: newId }),
        50,
      ),
    );
  }

  function handleReset() {
    setDb(structuredClone(initialDb));
    resetVisualState();
    pushLogs([`RESET -- seed data restored`, `STATUS: 200 OK`]);
  }

  const inputCls =
    "w-full rounded bg-[#f4ded4] border border-[#e4beae] px-3 py-1.5 font-mono text-[13px] text-[#3a0d05] focus:outline-none focus:ring-2 focus:ring-white/40";
  const btnPrimary =
    "rounded bg-white px-3.5 py-2 font-var-label text-[12px] font-bold text-[#75200c] shadow hover:bg-[#f3dfd6] transition-colors cursor-pointer active:scale-95";
  const btnSecondary =
    "rounded border border-white/30 bg-transparent px-3 py-2 font-var-label text-[12px] text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-95";

  return (
    <m3e-theme
      color="#75200c"
      scheme="dark"
      contrast="high"
      variant="expressive"
      motion="expressive"
      density="0"
      strong-focus
    >
      <div className="flex h-screen w-screen bg-[#75200c] text-white overflow-hidden">
        {/* Left sidebar / control desk */}
        <div className="flex w-[34%] min-w-[340px] max-w-[460px] flex-col gap-4 overflow-y-auto border-r border-white/15 bg-[#86260f] p-5 shadow-2xl">
        <div className="border-b border-white/15 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-widest text-[#f3dfd6]">
              BCSE307P
            </span>
            <span className="text-[11px] font-var-meta text-[#e8b09f]">
              Academic Engine
            </span>
          </div>
          <h1 className="text-[26px] font-var-heading tracking-tight text-white leading-tight">
            LabBook Academic Engine
          </h1>
          <p className="mt-1 text-[13px] font-var-subheading text-[#e8b09f]">
            Relational division and GiST temporal exclusion visualizer
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-white/15 bg-[#75200c]/80 p-4 shadow-sm">
          <div>
            <label className="font-var-label text-[11px] uppercase text-[#e8b09f] block mb-1">
              Select User
            </label>
            <m3e-select
              className="w-full bg-[#f4ded4] text-[#3a0d05] rounded block"
              value={String(userId)}
              onChange={(e: any) => {
                const val = e.target?.value;
                if (val !== undefined) setUserId(Number(val));
              }}
            >
              {db.users.map((u) => (
                <m3e-option key={u.user_id} value={String(u.user_id)}>
                  {u.name} ({u.role})
                </m3e-option>
              ))}
            </m3e-select>
          </div>

          <div>
            <label className="font-var-label text-[11px] uppercase text-[#e8b09f] block mb-1">
              Select Resource
            </label>
            <m3e-select
              className="w-full bg-[#f4ded4] text-[#3a0d05] rounded block"
              value={String(resourceId)}
              onChange={(e: any) => {
                const val = e.target?.value;
                if (val !== undefined) setResourceId(Number(val));
              }}
            >
              {db.equipment.map((e) => (
                <m3e-option key={e.resource_id} value={String(e.resource_id)}>
                  {e.name} ({e.location})
                </m3e-option>
              ))}
            </m3e-select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-var-label text-[11px] uppercase text-[#e8b09f] block mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                className={inputCls}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <label className="font-var-label text-[11px] uppercase text-[#e8b09f] block mb-1">
                End Time
              </label>
              <input
                type="datetime-local"
                className={inputCls}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <m3e-button variant="filled" onClick={handleDivision} class="bg-white text-[#75200c] font-bold">
            Verify Division
          </m3e-button>
          <m3e-button variant="filled" onClick={handleInsert} class="bg-white text-[#75200c] font-bold">
            Attempt Insert
          </m3e-button>
          <m3e-button variant="outlined" onClick={handleReset} class="text-white border-white/40">
            Reset Seed
          </m3e-button>
        </div>

        <div
          ref={consoleRef}
          className="min-h-[220px] flex-1 overflow-y-auto rounded-lg border border-white/15 bg-[#3a0d05] p-3 font-mono text-[12px] leading-relaxed text-[#f4ded4] shadow-inner"
        >
          {logs.length === 0 && (
            <div className="text-[#c57d6b] italic">
              -- execution console online
            </div>
          )}
          {logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap">
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* Main visual canvas */}
      <div className="h-full flex-1 relative bg-[#681c09]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1.5} color="rgba(255, 255, 255, 0.08)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
    </m3e-theme>
  );
}
