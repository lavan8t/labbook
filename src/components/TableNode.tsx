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
      className="min-w-[340px] max-w-[460px] rounded-[10px] border border-[rgba(255,219,209,0.18)] bg-[#201a18] text-[#ede0dc] text-[13px] overflow-hidden"
    >
      {/* Table Header */}
      <div className="border-b border-[rgba(255,219,209,0.12)] bg-[#33221c] px-3.5 py-2.5 text-[13px] font-var-table-title text-[#ffdbd1] flex items-center justify-between">
        <span className="font-semibold tracking-wide font-mono flex items-center gap-1.5">
          <m3e-icon name="table_chart"></m3e-icon>
          {data.tableName}
        </span>
        <span className="font-mono text-[11px] text-[#ffb59d] bg-[#4a261b] px-2 py-0.5 rounded-[6px]">
          {data.rows.length} {data.rows.length === 1 ? "row" : "rows"}
        </span>
      </div>

      {/* Structured Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          {/* Column attributes header */}
          <thead>
            <tr className="border-b border-[rgba(255,219,209,0.08)] bg-[#271f1c]">
              {data.columns.map((c) => (
                <th
                  key={c.name}
                  className="px-2.5 py-1.5 font-mono text-[11px] font-medium text-[#d0c4bf] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{c.name}</span>
                    {c.pk && (
                      <span className="rounded-[4px] bg-[#7a2f19] text-[#ffdbd1] px-1 py-[0.5px] text-[9px] font-semibold">
                        PK
                      </span>
                    )}
                    {c.fk && (
                      <span className="rounded-[4px] border border-[rgba(255,219,209,0.2)] bg-[#2f2825] text-[#d0c4bf] px-1 py-[0.5px] text-[9px] font-semibold">
                        FK
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Data Rows */}
          <tbody className="divide-y divide-[rgba(255,219,209,0.06)] bg-[#201a18]">
            {data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={data.columns.length}
                  className="px-3 py-2 text-[12px] italic text-[#9d8e87] text-center"
                >
                  0 rows
                </td>
              </tr>
            ) : (
              data.rows.map((row, i) => (
                <tr
                  key={i}
                  {...(attrOf ? (attrOf(row) as object) : {})}
                  className="transition-colors hover:bg-[#2b2320]"
                  style={{ outline: "1px solid transparent", outlineOffset: -1 }}
                >
                  {data.columns.map((c) => (
                    <td
                      key={c.name}
                      className="px-2.5 py-1.5 font-mono text-[11px] text-[#ede0dc] whitespace-nowrap"
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
      <Handle id="l-target" type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18]" />
      <Handle id="l-source" type="source" position={Position.Left} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18]" />
      <Handle id="l" type="source" position={Position.Left} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18] opacity-0 pointer-events-none" />

      <Handle id="r-target" type="target" position={Position.Right} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18]" />
      <Handle id="r-source" type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18]" />
      <Handle id="r" type="target" position={Position.Right} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18] opacity-0 pointer-events-none" />

      <Handle id="t-target" type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18]" />
      <Handle id="t-source" type="source" position={Position.Top} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18]" />
      <Handle id="t" type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18] opacity-0 pointer-events-none" />

      <Handle id="b-target" type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18]" />
      <Handle id="b-source" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18]" />
      <Handle id="b" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#ffb59d] !border-[#201a18] opacity-0 pointer-events-none" />
    </div>
  );
}
