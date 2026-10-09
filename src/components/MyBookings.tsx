"use client";

import React from "react";
import type { CampusUser } from "@/data/schema";
import type { Booking } from "@/lib/api";
import { formatDateDDMMYYYY, formatTimeRailway } from "@/lib/timetableUtils";

import "@m3e/web/card";
import "@m3e/web/chips";
import "@m3e/web/badge";
import "@m3e/web/button";
import "@m3e/web/icon";

export interface MyBookingsProps {
  currentUser: CampusUser;
  bookings: Booking[];
  onCancelBooking: (bookingId: number | string) => void;
  onRefresh?: () => void;
  onNavigateToBook: () => void;
  loading?: boolean;
}

export default function MyBookings({
  currentUser,
  bookings = [],
  onCancelBooking,
  onRefresh,
  onNavigateToBook,
  loading = false,
}: MyBookingsProps) {
  const activeBookings = bookings;

  const handleCancel = (bookingId: number | string) => {
    onCancelBooking(bookingId);
  };

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
  };

  const handleNavigateToBook = () => {
    onNavigateToBook();
  };

  return (
    <div className="bg-surface rounded-lg border border-outline-variant p-6 sm:p-8 space-y-6">
      {/* Actions toolbar */}
      <div className="flex justify-end items-center pb-2">
        <m3e-button
          variant="text"
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs text-on-surface-variant hover:text-primary"
        >
          <m3e-icon slot="icon" name="sync"></m3e-icon>
          <span>{loading ? "Syncing..." : "Refresh Status"}</span>
        </m3e-button>
      </div>

      {/* Empty State */}
      {activeBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg bg-surface-container-low border border-outline-variant">
          <m3e-icon name="event_busy" className="text-5xl text-on-surface-variant opacity-60 mb-3"></m3e-icon>
          <h3 className="text-base font-semibold text-on-surface mb-1">
            No reservations found
          </h3>
          <p className="text-xs text-on-surface-variant max-w-sm mb-4">
            No booking requests have been recorded for your active profile yet.
          </p>
          <m3e-button variant="filled" onClick={handleNavigateToBook}>
            <m3e-icon slot="icon" name="add"></m3e-icon>
            Submit a Booking Request
          </m3e-button>
        </div>
      ) : (
        /* Booking Cards List using m3e-card */
        <div className="space-y-4">
          {activeBookings.map((b) => {
            const dateStr = formatDateDDMMYYYY(b.start_datetime);
            const timeStr = `${formatTimeRailway(b.start_datetime)} – ${formatTimeRailway(b.end_datetime)}`;

            return (
              <m3e-card
                key={b.booking_id}
                variant="outlined"
                className="block rounded-lg border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors"
              >
                <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-surface-container-high text-on-surface">
                        {b.booking_ref}
                      </span>

                      {/* Status Indicator */}
                      {b.booking_status === "CONFIRMED" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <m3e-icon name="check" className="text-sm"></m3e-icon>
                          <span>Confirmed</span>
                        </span>
                      )}
                      {b.booking_status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          <m3e-icon name="schedule" className="text-sm"></m3e-icon>
                          <span>Pending</span>
                        </span>
                      )}
                      {b.booking_status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-error">
                          <m3e-icon name="block" className="text-sm"></m3e-icon>
                          <span>Rejected</span>
                        </span>
                      )}
                      {b.booking_status === "CANCELLED" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
                          <m3e-icon name="cancel" className="text-sm"></m3e-icon>
                          <span>Cancelled</span>
                        </span>
                      )}

                      <span className="text-xs font-semibold text-on-surface">
                        {b.venue_name}
                      </span>
                      {b.building && (
                        <span className="text-xs text-on-surface-variant">
                          • {b.building}
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-semibold text-on-surface">
                      {b.event_title}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-on-surface-variant flex-wrap">
                      <div className="flex items-center gap-1">
                        <m3e-icon className="text-sm">calendar_today</m3e-icon>
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <m3e-icon className="text-sm">schedule</m3e-icon>
                        <span>{timeStr}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <m3e-icon className="text-sm">category</m3e-icon>
                        <span>{b.event_type}</span>
                      </div>
                      {b.expected_attendees !== undefined && (
                        <div className="flex items-center gap-1">
                          <m3e-icon className="text-sm">groups</m3e-icon>
                          <span>{b.expected_attendees} attendees</span>
                        </div>
                      )}
                    </div>

                    {(b.admin_remarks || b.purpose_notes) && (
                      <div className="text-xs bg-surface-container-low border border-outline-variant/60 rounded px-2.5 py-1.5 text-on-surface-variant">
                        <span className="font-medium text-on-surface">
                          {b.admin_remarks ? "Admin Remarks: " : "Notes: "}
                        </span>
                        {b.admin_remarks || b.purpose_notes}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex md:flex-col items-end justify-between gap-2 shrink-0">
                    {b.booking_status !== "CANCELLED" &&
                      b.booking_status !== "REJECTED" && (
                        <m3e-button
                          variant="outlined"
                          onClick={() => handleCancel(b.booking_id)}
                          className="text-xs text-error border-error hover:bg-error-container/20"
                        >
                          <m3e-icon slot="icon" name="cancel"></m3e-icon>
                          Cancel
                        </m3e-button>
                      )}
                  </div>
                </div>
              </m3e-card>
            );
          })}
        </div>
      )}
    </div>
  );
}
