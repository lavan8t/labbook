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
      className="min-w-[340px] max-w-[460px] rounded-lg border border-[var(--md-sys-color-outline-variant,rgba(255,255,255,0.2))] bg-[var(--md-sys-color-surface-container,#2a110a)] text-[13px] shadow-2xl overflow-hidden"
      style={{ borderWidth: 1 }}
    >
      {/* Table Header */}
      <div className="border-b border-[var(--md-sys-color-outline-variant,rgba(255,255,255,0.15))] bg-[var(--md-sys-color-primary-container,#5f1505)] px-3.5 py-2 text-[13px] font-var-table-title uppercase text-[var(--md-sys-color-on-primary-container,#ffdad2)] flex items-center justify-between">
        <span className="tracking-wide font-bold">{data.tableName}</span>
        <span className="font-mono text-[10px] tracking-widest text-[var(--md-sys-color-on-primary-container,#ffdad2)]/80 font-normal">
          {data.rows.length} {data.rows.length === 1 ? "ROW" : "ROWS"}
        </span>
      </div>

      {/* Structured Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          {/* Column attributes header */}
          <thead>
            <tr className="border-b border-[var(--md-sys-color-outline-variant,rgba(255,255,255,0.1))] bg-[var(--md-sys-color-surface-container-high,#36160e)]">
              {data.columns.map((c) => (
                <th
                  key={c.name}
                  className="px-2.5 py-2 font-mono text-[11px] font-bold text-[var(--md-sys-color-on-surface,#ffffff)] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{c.name}</span>
                    {c.pk && (
                      <span className="rounded bg-[var(--md-sys-color-primary,#ffb4a2)] px-1 py-[0.5px] text-[8px] font-bold text-[var(--md-sys-color-on-primary,#561e11)] tracking-wider">
                        PK
                      </span>
                    )}
                    {c.fk && (
                      <span className="rounded border border-[var(--md-sys-color-outline,#a08c87)] bg-[var(--md-sys-color-surface-container-highest,#421c12)] px-1 py-[0.5px] text-[8px] font-bold text-[var(--md-sys-color-on-surface-variant,#d8c2bc)] tracking-wider">
                        FK
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Data Rows */}
          <tbody className="divide-y divide-[var(--md-sys-color-outline-variant,rgba(255,255,255,0.08))] bg-[var(--md-sys-color-surface-container-low,#240d07)]">
            {data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={data.columns.length}
                  className="px-3 py-2 text-[12px] italic text-[var(--md-sys-color-outline,#a08c87)] text-center"
                >
                  0 rows
                </td>
              </tr>
            ) : (
              data.rows.map((row, i) => (
                <tr
                  key={i}
                  {...(attrOf ? (attrOf(row) as object) : {})}
                  className="transition-colors hover:bg-[var(--md-sys-color-surface-container-highest,#421c12)]"
                  style={{ outline: "1px solid transparent", outlineOffset: -1 }}
                >
                  {data.columns.map((c) => (
                    <td
                      key={c.name}
                      className="px-2.5 py-1.5 font-mono text-[11px] text-[var(--md-sys-color-on-surface,#ffffff)] whitespace-nowrap"
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

      {/* Left */}
      <Handle id="l-target" type="target" position={Position.Left} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)]" />
      <Handle id="l-source" type="source" position={Position.Left} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)]" />
      <Handle id="l" type="source" position={Position.Left} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)] opacity-0 pointer-events-none" />

      {/* Right */}
      <Handle id="r-target" type="target" position={Position.Right} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)]" />
      <Handle id="r-source" type="source" position={Position.Right} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)]" />
      <Handle id="r" type="target" position={Position.Right} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)] opacity-0 pointer-events-none" />

      {/* Top */}
      <Handle id="t-target" type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)]" />
      <Handle id="t-source" type="source" position={Position.Top} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)]" />
      <Handle id="t" type="target" position={Position.Top} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)] opacity-0 pointer-events-none" />

      {/* Bottom */}
      <Handle id="b-target" type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)]" />
      <Handle id="b-source" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)]" />
      <Handle id="b" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[var(--md-sys-color-primary,#ffb4a2)] !border-[var(--md-sys-color-surface,#230d07)] opacity-0 pointer-events-none" />
    </div>
  );
}
