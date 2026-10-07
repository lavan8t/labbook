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
      className="min-w-[340px] max-w-[460px] rounded-lg border border-[rgba(255,255,255,0.22)] bg-[#e4beae] text-[13px] shadow-2xl overflow-hidden"
      style={{ borderWidth: 1 }}
    >
      {/* Table Header */}
      <div className="border-b border-[#75200c]/25 bg-[#75200c] px-3.5 py-2 text-[13px] font-var-table-title uppercase text-white flex items-center justify-between">
        <span className="tracking-wide">{data.tableName}</span>
        <span className="font-mono text-[10px] tracking-widest text-[#e8b09f] font-normal">
          {data.rows.length} {data.rows.length === 1 ? "ROW" : "ROWS"}
        </span>
      </div>

      {/* Structured Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          {/* Column attributes header */}
          <thead>
            <tr className="border-b border-[#75200c]/20 bg-[#eccdc0]">
              {data.columns.map((c) => (
                <th
                  key={c.name}
                  className="px-2.5 py-2 font-mono text-[11px] font-bold text-[#3a0d05] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{c.name}</span>
                    {c.pk && (
                      <span className="rounded bg-[#75200c] px-1 py-[0.5px] text-[8px] font-bold text-white tracking-wider">
                        PK
                      </span>
                    )}
                    {c.fk && (
                      <span className="rounded border border-[#75200c]/40 bg-white/50 px-1 py-[0.5px] text-[8px] font-bold text-[#75200c] tracking-wider">
                        FK
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Data Rows */}
          <tbody className="divide-y divide-[#75200c]/10 bg-[#f4ded4]">
            {data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={data.columns.length}
                  className="px-3 py-2 text-[12px] italic text-[#6e2718] text-center"
                >
                  0 rows
                </td>
              </tr>
            ) : (
              data.rows.map((row, i) => (
                <tr
                  key={i}
                  {...(attrOf ? (attrOf(row) as object) : {})}
                  className="transition-colors hover:bg-white/30"
                  style={{ outline: "1px solid transparent", outlineOffset: -1 }}
                >
                  {data.columns.map((c) => (
                    <td
                      key={c.name}
                      className="px-2.5 py-1.5 font-mono text-[11px] text-[#3a0d05] whitespace-nowrap"
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
      <Handle id="l-target" type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#75200c] !border-white" />
      <Handle id="l-source" type="source" position={Position.Left} className="!w-2 !h-2 !bg-[#75200c] !border-white" />
      <Handle id="l" type="source" position={Position.Left} className="!w-2 !h-2 !bg-[#75200c] !border-white opacity-0 pointer-events-none" />

      {/* Right */}
      <Handle id="r-target" type="target" position={Position.Right} className="!w-2 !h-2 !bg-[#75200c] !border-white" />
      <Handle id="r-source" type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#75200c] !border-white" />
      <Handle id="r" type="target" position={Position.Right} className="!w-2 !h-2 !bg-[#75200c] !border-white opacity-0 pointer-events-none" />

      {/* Top */}
      <Handle id="t-target" type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#75200c] !border-white" />
      <Handle id="t-source" type="source" position={Position.Top} className="!w-2 !h-2 !bg-[#75200c] !border-white" />
      <Handle id="t" type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#75200c] !border-white opacity-0 pointer-events-none" />

      {/* Bottom */}
      <Handle id="b-target" type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-[#75200c] !border-white" />
      <Handle id="b-source" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#75200c] !border-white" />
      <Handle id="b" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#75200c] !border-white opacity-0 pointer-events-none" />
    </div>
  );
}
