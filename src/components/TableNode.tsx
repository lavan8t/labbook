"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

export interface TableColumn {
  name: string;
  pk?: boolean;
  fk?: boolean;
}

export interface TableRow {
  [key: string]: string | number;
}

export interface TableNodeData {
  tableName: string;
  columns: TableColumn[];
  rows: TableRow[];
  rowAttr?: (row: TableRow) => Record<string, string | number>;
  [key: string]: unknown;
}

export default function TableNode({ data }: NodeProps<Node<TableNodeData>>) {
  const attrOf = data.rowAttr;
  return (
    <div
      data-table={data.tableName}
      className="min-w-[340px] max-w-[460px] rounded-xl bg-surface-container-low text-on-surface text-[13px] overflow-hidden shadow-sm"
    >
      {/* Table Header */}
      <div className="bg-surface-container px-4 py-3 text-[13px] text-primary flex items-center justify-between">
        <span className="tracking-wide font-title flex items-center gap-1.5">
          <m3e-icon name="table_chart"></m3e-icon>
          {data.tableName}
        </span>
        <span className="font-mono text-[11px] text-on-primary-container bg-primary-container px-2.5 py-0.5 rounded-md">
          {data.rows.length} {data.rows.length === 1 ? "row" : "rows"}
        </span>
      </div>

      {/* Structured Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          {/* Column attributes header */}
          <thead>
            <tr className="bg-surface-container-low">
              {data.columns.map((c) => (
                <th
                  key={c.name}
                  className="px-2.5 py-1.5 font-mono text-[11px] font-medium text-on-surface-variant whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{c.name}</span>
                    {c.pk && (
                      <span className="rounded-full bg-primary-container text-on-primary-container px-1.5 py-[1px] text-[9px] font-semibold">
                        PK
                      </span>
                    )}
                    {c.fk && (
                      <span className="rounded-full bg-surface-container-highest text-on-surface-variant px-1.5 py-[1px] text-[9px] font-semibold">
                        FK
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Data Rows */}
          <tbody className="bg-surface-container-low">
            {data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={data.columns.length}
                  className="px-3 py-2 text-[12px] italic text-outline text-center"
                >
                  0 rows
                </td>
              </tr>
            ) : (
              data.rows.map((row, i) => (
                <tr
                  key={i}
                  {...(attrOf ? (attrOf(row) as object) : {})}
                  className="transition-colors hover:bg-surface-container"
                >
                  {data.columns.map((c) => (
                    <td
                      key={c.name}
                      className="px-2.5 py-1.5 font-mono text-[11px] text-on-surface whitespace-nowrap"
                    >
                      {String(row[c.name] ?? "NULL")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Handles */}
      <Handle id="l-target" type="target" position={Position.Left} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0" />
      <Handle id="l-source" type="source" position={Position.Left} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0" />
      <Handle id="l" type="source" position={Position.Left} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0 opacity-0 pointer-events-none" />

      <Handle id="r-target" type="target" position={Position.Right} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0" />
      <Handle id="r-source" type="source" position={Position.Right} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0" />
      <Handle id="r" type="target" position={Position.Right} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0 opacity-0 pointer-events-none" />

      <Handle id="t-target" type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0" />
      <Handle id="t-source" type="source" position={Position.Top} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0" />
      <Handle id="t" type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0 opacity-0 pointer-events-none" />

      <Handle id="b-target" type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0" />
      <Handle id="b-source" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0" />
      <Handle id="b" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary)] !border-0 opacity-0 pointer-events-none" />
    </div>
  );
}
