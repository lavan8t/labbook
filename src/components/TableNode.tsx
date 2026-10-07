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
      className="w-[280px] rounded-lg border border-[rgba(255,255,255,0.18)] bg-[#e4beae] text-[13px] shadow-xl overflow-hidden transition-all duration-200"
      style={{ borderWidth: 1 }}
    >
      <div className="border-b border-[#75200c]/20 bg-[#75200c] px-3 py-2 text-[13px] font-var-table-title uppercase text-white flex items-center justify-between">
        <span>{data.tableName}</span>
        <span className="font-mono text-[10px] tracking-widest text-[#e8b09f] font-normal">TABLE</span>
      </div>

      <div className="divide-y divide-[#75200c]/10 bg-[#eccdc0]">
        {data.columns.map((c) => (
          <div key={c.name} className="flex items-center justify-between px-3 py-1.5 font-var-body">
            <span className="font-mono text-[11px] font-semibold text-[#3a0d05]">{c.name}</span>
            <span className="flex gap-1">
              {c.pk && (
                <span className="rounded bg-[#75200c] px-1.5 py-[1px] text-[9px] font-bold text-white tracking-wider">
                  PK
                </span>
              )}
              {c.fk && (
                <span className="rounded border border-[#75200c]/40 bg-white/40 px-1.5 py-[1px] text-[9px] font-bold text-[#75200c] tracking-wider">
                  FK
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-[#75200c]/20 bg-[#f4ded4] divide-y divide-[#75200c]/10 max-h-[180px] overflow-y-auto">
        {data.rows.length === 0 && (
          <div className="px-3 py-2 text-[12px] italic text-[#6e2718]">0 rows</div>
        )}
        {data.rows.map((row, i) => (
          <div
            key={i}
            {...(attrOf ? (attrOf(row) as object) : {})}
            className="flex flex-wrap gap-x-1.5 px-3 py-1 font-mono text-[11px] text-[#3a0d05] transition-colors"
            style={{ outline: "1px solid transparent", outlineOffset: -1 }}
          >
            {Object.values(row).map((val, idx) => (
              <span key={idx}>
                {idx > 0 && <span className="text-[#75200c]/40 mr-1.5">|</span>}
                <span>{String(val)}</span>
              </span>
            ))}
          </div>
        ))}
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
