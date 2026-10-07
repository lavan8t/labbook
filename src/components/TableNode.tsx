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
      className="min-w-[340px] max-w-[460px] rounded-[2px] border border-[#e2e8f0] bg-white text-[#0f172a] text-[13px] overflow-hidden"
      style={{ borderWidth: 1 }}
    >
      {/* Table Header */}
      <div className="border-b border-[#b44f2b] bg-[#c85a32] px-3.5 py-2 text-[13px] font-var-table-title uppercase text-white flex items-center justify-between">
        <span className="tracking-wide font-bold">{data.tableName}</span>
        <span className="font-mono text-[10px] tracking-widest text-white/90 bg-black/10 px-1.5 py-0.5 rounded-[2px] font-normal">
          {data.rows.length} {data.rows.length === 1 ? "ROW" : "ROWS"}
        </span>
      </div>

      {/* Structured Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          {/* Column attributes header */}
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              {data.columns.map((c) => (
                <th
                  key={c.name}
                  className="px-2.5 py-1.5 font-mono text-[11px] font-semibold text-[#475569] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{c.name}</span>
                    {c.pk && (
                      <span className="rounded-[2px] bg-[#c85a32] px-1 py-[0.5px] text-[8px] font-bold text-white tracking-wider">
                        PK
                      </span>
                    )}
                    {c.fk && (
                      <span className="rounded-[2px] border border-[#cbd5e1] bg-[#f1f5f9] px-1 py-[0.5px] text-[8px] font-bold text-[#475569] tracking-wider">
                        FK
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Data Rows */}
          <tbody className="divide-y divide-[#e2e8f0] bg-white">
            {data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={data.columns.length}
                  className="px-3 py-2 text-[12px] italic text-[#94a3b8] text-center"
                >
                  0 rows
                </td>
              </tr>
            ) : (
              data.rows.map((row, i) => (
                <tr
                  key={i}
                  {...(attrOf ? (attrOf(row) as object) : {})}
                  className="transition-colors hover:bg-[#fdf8f6]"
                  style={{ outline: "1px solid transparent", outlineOffset: -1 }}
                >
                  {data.columns.map((c) => (
                    <td
                      key={c.name}
                      className="px-2.5 py-1.5 font-mono text-[11px] text-[#0f172a] whitespace-nowrap"
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
      <Handle id="l-target" type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff]" />
      <Handle id="l-source" type="source" position={Position.Left} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff]" />
      <Handle id="l" type="source" position={Position.Left} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff] opacity-0 pointer-events-none" />

      {/* Right */}
      <Handle id="r-target" type="target" position={Position.Right} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff]" />
      <Handle id="r-source" type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff]" />
      <Handle id="r" type="target" position={Position.Right} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff] opacity-0 pointer-events-none" />

      {/* Top */}
      <Handle id="t-target" type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff]" />
      <Handle id="t-source" type="source" position={Position.Top} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff]" />
      <Handle id="t" type="target" position={Position.Top} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff] opacity-0 pointer-events-none" />

      {/* Bottom */}
      <Handle id="b-target" type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff]" />
      <Handle id="b-source" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff]" />
      <Handle id="b" type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-[#c85a32] !border-[#ffffff] opacity-0 pointer-events-none" />
    </div>
  );
}
