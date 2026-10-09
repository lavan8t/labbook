"use client";

import React from "react";
import type { CampusUser } from "@/data/schema";
import type { Booking } from "@/lib/api";

import "@m3e/web/card";
import "@m3e/web/chips";
import "@m3e/web/badge";
import "@m3e/web/button";
import "@m3e/web/icon";

export interface MyBookingsProps {
  currentUser: CampusUser;
  myBookingsList?: Booking[];
  bookings?: Booking[];
  handleCancelBooking?: (bookingId: number | string) => void;
  onCancelBooking?: (bookingId: number | string) => void;
  cancelBooking?: (bookingId: number | string) => void;
  refreshData?: () => void;
  onRefresh?: () => void;
  setActiveTab?: (tab: string) => void;
  onNavigateToBook?: () => void;
  loading?: boolean;
}

export default function MyBookings({
  currentUser,
  myBookingsList,
  bookings,
  handleCancelBooking,
  onCancelBooking,
  cancelBooking,
  refreshData,
  onRefresh,
  setActiveTab,
  onNavigateToBook,
  loading = false,
}: MyBookingsProps) {
  const activeBookings = bookings ?? myBookingsList ?? [];

  const handleCancel = (bookingId: number | string) => {
    if (handleCancelBooking) handleCancelBooking(bookingId);
    else if (onCancelBooking) onCancelBooking(bookingId);
    else if (cancelBooking) cancelBooking(bookingId);
  };

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
    else if (refreshData) refreshData();
  };

  const handleNavigateToBook = () => {
    if (onNavigateToBook) onNavigateToBook();
    else if (setActiveTab) setActiveTab("book");
  };

  return (
    <div className="bg-surface rounded-lg border border-outline-variant p-6 sm:p-8 space-y-6">
      {/* Header section with title and refresh action */}
      <div className="border-b border-outline-variant pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-bold text-on-surface">
            My Venue Reservations ({currentUser.name})
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Track the lifecycle of your booking requests, admin approvals, and permits.
          </p>
        </div>
        <m3e-button
          variant="text"
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs text-on-surface-variant hover:text-primary self-end sm:self-auto"
        >
          <m3e-icon slot="icon">sync</m3e-icon>
          <span>{loading ? "Syncing..." : "Refresh Status"}</span>
        </m3e-button>
      </div>

      {/* Empty State */}
      {activeBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg bg-surface-container-low border border-outline-variant">
          <m3e-icon className="text-5xl text-on-surface-variant opacity-60 mb-3">
            event_busy
          </m3e-icon>
          <h3 className="text-base font-semibold text-on-surface mb-1">
            No reservations found
          </h3>
          <p className="text-xs text-on-surface-variant max-w-sm mb-4">
            No booking requests have been recorded for your active profile yet.
          </p>
          <m3e-button variant="filled" onClick={handleNavigateToBook}>
            <m3e-icon slot="icon">add</m3e-icon>
            Submit a Booking Request
          </m3e-button>
        </div>
      ) : (
        /* Booking Cards List using m3e-card */
        <div className="space-y-4">
          {activeBookings.map((b) => {
            const startDate = new Date(b.start_datetime);
            const endDate = new Date(b.end_datetime);
            const dateStr = startDate.toLocaleDateString();
            const timeStr = `${startDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })} – ${endDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`;

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

                      {/* Status Chip */}
                      {b.booking_status === "CONFIRMED" && (
                        <m3e-chip
                          variant="outlined"
                          className="text-xs font-semibold bg-success-container text-on-success-container border-success/40"
                        >
                          <m3e-icon slot="icon" className="text-xs">
                            check_circle
                          </m3e-icon>
                          CONFIRMED
                        </m3e-chip>
                      )}
                      {b.booking_status === "PENDING" && (
                        <m3e-chip
                          variant="outlined"
                          className="text-xs font-semibold bg-primary-container text-on-primary-container border-primary/40"
                        >
                          <m3e-icon slot="icon" className="text-xs">
                            hourglass_empty
                          </m3e-icon>
                          PENDING
                        </m3e-chip>
                      )}
                      {b.booking_status === "REJECTED" && (
                        <m3e-chip
                          variant="outlined"
                          className="text-xs font-semibold bg-error-container text-on-error-container border-error/40"
                        >
                          <m3e-icon slot="icon" className="text-xs">
                            block
                          </m3e-icon>
                          REJECTED
                        </m3e-chip>
                      )}
                      {b.booking_status === "CANCELLED" && (
                        <m3e-chip
                          variant="outlined"
                          className="text-xs font-semibold bg-surface-container-high text-on-surface-variant border-outline-variant"
                        >
                          <m3e-icon slot="icon" className="text-xs">
                            cancel
                          </m3e-icon>
                          CANCELLED
                        </m3e-chip>
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
                          <m3e-icon slot="icon">cancel</m3e-icon>
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
