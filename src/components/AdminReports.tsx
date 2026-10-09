"use client";

import React from "react";
import type { UtilizationStat } from "@/lib/api";

import "@m3e/web/card";
import "@m3e/web/badge";
import "@m3e/web/progress-indicator";
import "@m3e/web/icon";

export interface AdminReportsProps {
  utilizationStats: UtilizationStat[];
}

export function AdminReports({ utilizationStats }: AdminReportsProps) {
  return (
    <div className="bg-surface rounded-lg p-6 sm:p-8 space-y-6">
      {utilizationStats.length === 0 ? (
        <div className="p-8 text-center rounded-lg bg-surface-container-low">
          <m3e-icon name="monitoring" className="text-3xl text-on-surface-variant mb-2"></m3e-icon>
          <p className="text-xs text-on-surface-variant">
            No confirmed events recorded yet this month to compute utilization stats.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {utilizationStats.map((stat) => (
            <div
              key={stat.venue_id}
              className="rounded-lg bg-surface-container-low"
            >
              <div className="p-5 sm:p-6 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                  <div>
                    <span className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                      <m3e-icon name="meeting_room" className="text-primary text-base"></m3e-icon>
                      {stat.venue_name}
                    </span>
                    <span className="text-xs text-on-surface-variant ml-0 sm:ml-2 block sm:inline">
                      ({stat.venue_type} • {stat.seating_capacity} Seats)
                    </span>
                  </div>
                  <div className="text-left sm:text-right flex flex-col items-start sm:items-end gap-1">
                    <m3e-badge className="font-bold text-xs">
                      {stat.utilization_percentage}% Occupancy
                    </m3e-badge>
                    <span className="text-xs text-on-surface-variant block">
                      {stat.hours_booked} hours booked ({stat.total_events_hosted} events)
                    </span>
                  </div>
                </div>

                <m3e-linear-progress-indicator
                  value={Math.min(100, Math.max(0, Number(stat.utilization_percentage) || 0))}
                  max={100}
                  className="w-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminReports;
