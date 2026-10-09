"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import type { Venue, Booking } from "@/lib/api";
import {
  generateTimeSlots,
  getBookingSpan,
  formatSlotTime,
  formatDateDDMMYYYY,
  formatDateDayDDMonYYYY,
  formatTimeRailway,
} from "@/lib/timetableUtils";

import "@m3e/web/card";
import "@m3e/web/badge";
import "@m3e/web/chips";
import "@m3e/web/button";
import "@m3e/web/dialog";
import "@m3e/web/icon";
import "@m3e/web/icon-button";
import "@m3e/web/form-field";
import "@m3e/web/date-input";
import "@m3e/web/datepicker";
import "@m3e/web/progress-indicator";

export interface GanttTimetableProps {
  venues: Venue[];
  bookings: Booking[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSelectFreeSlot: (
    venueId: number,
    date: string,
    startTime: string,
    endTime: string,
  ) => void;
  onInspectBooking?: (booking: Booking) => void;
  loading?: boolean;
}


function formatTimeDisplay(isoStr: string): string {
  return formatTimeRailway(isoStr);
}

function formatTimeRangeDisplay(startIso: string, endIso: string): string {
  return `${formatTimeRailway(startIso)} – ${formatTimeRailway(endIso)}`;
}

export function GanttTimetable({
  venues,
  bookings,
  selectedDate,
  onDateChange,
  onSelectFreeSlot,
  onInspectBooking,
  loading = false,
}: GanttTimetableProps) {
  const [inspectingBooking, setInspectingBooking] = useState<Booking | null>(
    null,
  );
  const [hoveredPreview, setHoveredPreview] = useState<{
    booking: Booking;
    rect: DOMRect;
  } | null>(null);

  const dialogRef = useRef<HTMLElement>(null);
  const datePickerRef = useRef<HTMLElement>(null);
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Synchronize modal state with native m3e-dialog Web Component
  useEffect(() => {
    const el = dialogRef.current as
      | (HTMLElement & { show?: () => void; hide?: () => void; open?: boolean })
      | null;
    if (el) {
      if (inspectingBooking) {
        el.open = true;
        el.show?.();
        el.setAttribute("open", "");
      } else {
        el.open = false;
        el.hide?.();
        el.removeAttribute("open");
      }
    }
  }, [inspectingBooking]);

  // Synchronize m3e-datepicker with React state
  useEffect(() => {
    const pickerEl = datePickerRef.current as
      | (HTMLElement & { date?: Date | null })
      | null;

    if (pickerEl) {
      const parts = selectedDate ? selectedDate.split("-").map(Number) : [];
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        pickerEl.date = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        pickerEl.date = null;
      }
    }

    const handleChange = (e: Event) => {
      const target = e.target as { value?: Date | string; date?: Date | string } | null;
      const val = target?.date ?? target?.value;
      if (val instanceof Date && !isNaN(val.getTime())) {
        const yr = val.getFullYear();
        const mo = String(val.getMonth() + 1).padStart(2, "0");
        const day = String(val.getDate()).padStart(2, "0");
        onDateChange(`${yr}-${mo}-${day}`);
      } else if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        onDateChange(val);
      }
    };

    pickerEl?.addEventListener("change", handleChange);
    return () => {
      pickerEl?.removeEventListener("change", handleChange);
    };
  }, [selectedDate, onDateChange]);

  // Date manipulation helpers
  const shiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const yr = dateObj.getFullYear();
    const mo = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    onDateChange(`${yr}-${mo}-${day}`);
  };

  const handleSetToday = () => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    onDateChange(`${yr}-${mo}-${day}`);
  };

  const formattedDateTitle = useMemo(() => {
    return formatDateDayDDMonYYYY(selectedDate);
  }, [selectedDate]);

  const filteredVenues = venues;

  const handleBookingClick = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    setHoveredPreview(null);
    setInspectingBooking(booking);
    if (onInspectBooking) {
      onInspectBooking(booking);
    }
  };

  const handleSlotClick = (venueId: number, slotIndex: number) => {
    const slot = timeSlots[slotIndex];
    if (!slot) return;
    const startTime = slot.time;
    const nextSlot = timeSlots[slotIndex + 1];
    const endTime = nextSlot ? nextSlot.time : "21:00";
    onSelectFreeSlot(venueId, selectedDate, startTime, endTime);
  };

  const inspectingVenue = useMemo(() => {
    if (!inspectingBooking) return null;
    return (
      venues.find(
        (v) => Number(v.venue_id) === Number(inspectingBooking.venue_id),
      ) || null
    );
  }, [inspectingBooking, venues]);

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Today Button */}
          <button
            type="button"
            onClick={handleSetToday}
            className="h-8 px-3 inline-flex items-center justify-center rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-xs font-semibold text-on-surface transition-colors cursor-pointer select-none"
          >
            Today
          </button>

          {/* Prev / Next Navigation Arrows */}
          <div className="inline-flex items-center rounded-lg border border-outline-variant bg-surface overflow-hidden">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="h-8 w-8 inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer border-r border-outline-variant/60"
              title="Previous Day"
              aria-label="Previous Day"
            >
              <m3e-icon name="chevron_left" className="text-base"></m3e-icon>
            </button>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="h-8 w-8 inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Next Day"
              aria-label="Next Day"
            >
              <m3e-icon name="chevron_right" className="text-base"></m3e-icon>
            </button>
          </div>

          {/* Date Text Trigger */}
          <div className="relative inline-flex items-center">
            <button
              type="button"
              id="gantt-timetable-date-trigger"
              className="h-8 inline-flex items-center gap-2 px-3 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-xs font-semibold text-on-surface transition-colors cursor-pointer select-none"
            >
              <m3e-icon name="calendar_today" className="text-sm text-primary"></m3e-icon>
              <span>{formattedDateTitle}</span>
              <m3e-datepicker-toggle for="gantt-timetable-datepicker"></m3e-datepicker-toggle>
            </button>
            <m3e-datepicker
              id="gantt-timetable-datepicker"
              ref={datePickerRef}
              variant="modal"
            ></m3e-datepicker>
          </div>
        </div>
      </div>

      {/* Loading Bar */}
      {loading && (
        <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant flex items-center justify-center gap-2 text-xs text-primary font-medium">
          <m3e-icon name="sync" className="animate-spin text-sm"></m3e-icon>
          Updating timetable bookings for {formatDateDDMMYYYY(selectedDate)}...
        </div>
      )}

      {/* Gantt Timetable Matrix */}
      <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface shadow-xs">
        <div className="overflow-x-auto relative">
          <div className="min-w-[1900px]">
            {/* Header: Venue Column + 26 Time Slots */}
            <div className="flex border-b border-outline-variant bg-surface-container-high sticky top-0 z-30">
              {/* Sticky Top-Left Corner Header */}
              <div className="sticky left-0 z-40 bg-surface-container-high min-w-[220px] max-w-[220px] px-4 py-3 border-r border-outline-variant flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Venues ({filteredVenues.length})
                </span>
                <m3e-icon name="apartment" className="text-on-surface-variant text-sm"></m3e-icon>
              </div>

              {/* Time Slot Columns Header */}
              <div className="flex-1 grid grid-cols-[repeat(26,minmax(64px,1fr))]">
                {timeSlots.map((slot) => {
                  const isHourBoundary = slot.minute === 0;
                  return (
                    <div
                      key={slot.slotIndex}
                      className={`p-2 text-center border-r border-outline-variant/40 flex flex-col items-center justify-center ${
                        isHourBoundary
                          ? "bg-surface-container-high/90 text-on-surface font-bold"
                          : "bg-surface-container/60 text-on-surface-variant font-medium"
                      }`}
                    >
                      <span className="text-[11px] font-mono font-semibold">
                        {slot.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matrix Body: Venue Rows */}
            {filteredVenues.length === 0 ? (
              <div className="p-12 text-center text-xs text-on-surface-variant bg-surface">
                <m3e-icon name="search_off" className="text-3xl text-on-surface-variant/50 mb-2"></m3e-icon>
                <p>No venues registered in system.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/30">
                {filteredVenues.map((venue) => {
                  const venueIdNum = Number(venue.venue_id);
                  const venueBookings = bookings.filter(
                    (b) => Number(b.venue_id) === venueIdNum,
                  );

                  // Calculate booking tracks for conflict/overlap stacking
                  const positionedBookings: Array<{
                    booking: Booking;
                    span: ReturnType<typeof getBookingSpan>;
                    track: number;
                  }> = [];
                  const tracks: Array<{ endSlot: number }> = [];

                  for (const b of venueBookings) {
                    const span = getBookingSpan(
                      b.start_datetime,
                      b.end_datetime,
                      selectedDate,
                    );
                    if (!span.isVisible) continue;

                    const endSlot = span.startSlot + span.spanSlots;
                    let assignedTrack = -1;
                    for (let t = 0; t < tracks.length; t++) {
                      if (tracks[t].endSlot <= span.startSlot) {
                        assignedTrack = t;
                        tracks[t].endSlot = endSlot;
                        break;
                      }
                    }
                    if (assignedTrack === -1) {
                      assignedTrack = tracks.length;
                      tracks.push({ endSlot });
                    }
                    positionedBookings.push({
                      booking: b,
                      span,
                      track: assignedTrack,
                    });
                  }

                  const totalTracks = Math.max(1, tracks.length);
                  const rowHeight = Math.max(64, totalTracks * 38 + 12);

                  return (
                    <div
                      key={venue.venue_id}
                      className="flex hover:bg-surface-container-lowest/30 transition-colors"
                      style={{ minHeight: `${rowHeight}px` }}
                    >
                      {/* Sticky Left Venue Cell: Venue name only, nothing else */}
                      <div className="sticky left-0 z-20 bg-surface border-r border-outline-variant min-w-[220px] max-w-[220px] px-4 py-3 flex items-center">
                        <span
                          className="font-bold text-xs text-on-surface truncate"
                          title={venue.venue_name}
                        >
                          {venue.venue_name}
                        </span>
                      </div>

                      {/* Timeline Grid Row with 26 Slots and Overlaid Bookings */}
                      <div
                        className="flex-1 grid grid-cols-[repeat(26,minmax(64px,1fr))] relative"
                        style={{
                          gridTemplateRows: `repeat(${totalTracks}, minmax(36px, auto))`,
                        }}
                      >
                        {/* 26 Discrete Slot Click Targets */}
                        {timeSlots.map((slot) => {
                          const isHourBoundary = slot.minute === 0;
                          return (
                            <div
                              key={slot.slotIndex}
                              onClick={() =>
                                handleSlotClick(venueIdNum, slot.slotIndex)
                              }
                              title={`Click to book ${venue.venue_name} at ${slot.time}`}
                              style={{
                                gridColumn: `${slot.slotIndex + 1} / span 1`,
                                gridRow: `1 / span ${totalTracks}`,
                                zIndex: 1,
                              }}
                              className={`border-r border-outline-variant/20 h-full relative cursor-pointer hover:bg-primary-container/20 transition-colors flex items-center justify-center group/slot ${
                                isHourBoundary
                                  ? "bg-surface-container-lowest/40"
                                  : "bg-surface"
                              }`}
                            >
                              <span className="opacity-0 group-hover/slot:opacity-100 text-[10px] text-primary font-bold transition-opacity select-none flex items-center gap-0.5 bg-surface/90 px-1.5 py-0.5 rounded shadow-2xs">
                                <m3e-icon name="add" className="text-[10px]"></m3e-icon>
                                Book
                              </span>
                            </div>
                          );
                        })}

                        {/* Merged Active Booking Blocks */}
                        {positionedBookings.map(({ booking, span, track }) => {
                          const isConfirmed =
                            booking.booking_status === "CONFIRMED";
                          const timeRangeStr = formatTimeRangeDisplay(
                            booking.start_datetime,
                            booking.end_datetime,
                          );

                          return (
                            <div
                              key={booking.booking_id}
                              onClick={(e) => handleBookingClick(booking, e)}
                              onMouseEnter={(e) => {
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setHoveredPreview({ booking, rect });
                              }}
                              onMouseLeave={() => setHoveredPreview(null)}
                              style={{
                                gridColumnStart: span.startSlot + 1,
                                gridColumnEnd: `span ${span.spanSlots}`,
                                gridRow: `${track + 1} / span 1`,
                                zIndex: 10,
                              }}
                              className={`m-1 p-2 rounded-lg cursor-pointer transition-all border shadow-xs hover:shadow-md hover:scale-[1.01] flex flex-col justify-center overflow-hidden select-none ${
                                isConfirmed
                                  ? "bg-emerald-700 text-white border-emerald-600 hover:bg-emerald-800"
                                  : "bg-amber-600 text-white border-amber-500 hover:bg-amber-700"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 leading-tight">
                                <span className="font-bold text-xs truncate">
                                  {booking.event_title}
                                </span>
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase shrink-0 ${
                                    isConfirmed
                                      ? "bg-white/20 text-white"
                                      : "bg-black/20 text-white"
                                  }`}
                                >
                                  {isConfirmed ? "Confirmed" : "Pending"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px] opacity-90 truncate mt-0.5">
                                <span>{timeRangeStr}</span>
                                {booking.requester_name && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="truncate">
                                      {booking.requester_name}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Hover Preview Popover */}
      {hoveredPreview && (
        <div
          style={{
            top: `${Math.min(
              window.innerHeight - 200,
              hoveredPreview.rect.bottom + 8,
            )}px`,
            left: `${Math.max(
              16,
              Math.min(window.innerWidth - 320, hoveredPreview.rect.left),
            )}px`,
          }}
          className="fixed z-50 w-80 p-3.5 bg-surface-container-highest/95 backdrop-blur-md rounded-xl shadow-xl border border-outline-variant pointer-events-none text-xs text-on-surface"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="font-bold text-xs text-on-surface leading-tight line-clamp-2">
              {hoveredPreview.booking.event_title}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                hoveredPreview.booking.booking_status === "CONFIRMED"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {hoveredPreview.booking.booking_status}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] text-on-surface-variant">
            <div className="flex items-center gap-1.5">
              <m3e-icon name="schedule" className="text-xs text-primary"></m3e-icon>
              <span className="font-semibold text-on-surface">
                {formatTimeRangeDisplay(
                  hoveredPreview.booking.start_datetime,
                  hoveredPreview.booking.end_datetime,
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <m3e-icon name="person" className="text-xs"></m3e-icon>
              <span className="truncate">
                {hoveredPreview.booking.requester_name || "Unknown Requester"}
              </span>
            </div>

            {hoveredPreview.booking.department && (
              <div className="flex items-center gap-1.5">
                <m3e-icon name="domain" className="text-xs"></m3e-icon>
                <span className="truncate">
                  {hoveredPreview.booking.department}
                </span>
              </div>
            )}

            {hoveredPreview.booking.expected_attendees !== undefined && (
              <div className="flex items-center gap-1.5">
                <m3e-icon name="groups" className="text-xs"></m3e-icon>
                <span>
                  {hoveredPreview.booking.expected_attendees} Expected Attendees
                </span>
              </div>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-outline-variant/40 text-[10px] text-primary font-bold flex items-center justify-between">
            <span>Click to view full reservation details</span>
            <m3e-icon name="open_in_new" className="text-xs"></m3e-icon>
          </div>
        </div>
      )}

      {/* Full Detail Modal: <m3e-dialog> */}
      <m3e-dialog
        ref={dialogRef}
        open={Boolean(inspectingBooking)}
        className="w-full max-w-lg"
      >
        <div slot="header" className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <m3e-icon
              name={
                inspectingBooking?.booking_status === "CONFIRMED"
                  ? "verified"
                  : "pending_actions"
              }
              className={
                inspectingBooking?.booking_status === "CONFIRMED"
                  ? "text-success text-xl"
                  : "text-amber-500 text-xl"
              }
            ></m3e-icon>
            <div>
              <span className="text-base font-bold text-on-surface">
                Reservation Record
              </span>
              <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded bg-surface-container-high text-on-surface">
                {inspectingBooking?.booking_ref}
              </span>
            </div>
          </div>
        </div>

        {inspectingBooking && (
          <div className="space-y-4 py-2 text-xs">
            {/* Event Title & Status */}
            <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-sm text-on-surface">
                  {inspectingBooking.event_title}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    inspectingBooking.booking_status === "CONFIRMED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {inspectingBooking.booking_status}
                </span>
              </div>
              <div className="text-[11px] text-on-surface-variant mt-1">
                Event Category:{" "}
                <span className="font-semibold text-on-surface">
                  {inspectingBooking.event_type.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Venue & Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-outline-variant bg-surface">
                <div className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">
                  Venue Location
                </div>
                <div className="font-semibold text-on-surface">
                  {inspectingBooking.venue_name || inspectingVenue?.venue_name}
                </div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">
                  {inspectingBooking.building || inspectingVenue?.building}
                  {inspectingVenue?.floor_number !== undefined
                    ? ` (Floor ${inspectingVenue.floor_number})`
                    : ""}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-outline-variant bg-surface">
                <div className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">
                  Date & Time
                </div>
                <div className="font-semibold text-on-surface">
                  {formatDateDDMMYYYY(selectedDate)}
                </div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">
                  {formatTimeRangeDisplay(
                    inspectingBooking.start_datetime,
                    inspectingBooking.end_datetime,
                  )}
                </div>
              </div>
            </div>

            {/* Organizer & Capacity Ratio */}
            <div className="p-3 rounded-lg border border-outline-variant bg-surface space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase">
                    Organizer / Requester
                  </div>
                  <div className="font-semibold text-on-surface">
                    {inspectingBooking.requester_name || "Unknown"}
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    {inspectingBooking.requester_email || ""} &bull;{" "}
                    {inspectingBooking.department || ""}
                  </div>
                </div>

                {inspectingBooking.club_name && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary-container text-on-primary-container font-semibold">
                    {inspectingBooking.club_name}
                  </span>
                )}
              </div>

              {/* Capacity Ratio */}
              {inspectingVenue?.seating_capacity &&
                inspectingBooking.expected_attendees !== undefined && (
                  <div className="pt-2 border-t border-outline-variant/40">
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className="text-on-surface-variant">
                        Expected Attendees vs Capacity
                      </span>
                      <span className="font-bold text-on-surface">
                        {inspectingBooking.expected_attendees} /{" "}
                        {inspectingVenue.seating_capacity} (
                        {Math.round(
                          (inspectingBooking.expected_attendees /
                            inspectingVenue.seating_capacity) *
                            100,
                        )}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (inspectingBooking.expected_attendees /
                                inspectingVenue.seating_capacity) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
            </div>

            {/* Notes & Justification */}
            <div className="p-3 rounded-lg border border-outline-variant bg-surface">
              <div className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">
                Purpose & Justification
              </div>
              <p className="text-[11px] text-on-surface leading-relaxed">
                {inspectingBooking.purpose_notes || "No notes provided."}
              </p>
            </div>

            {/* Administrative Remarks if any */}
            {(inspectingBooking.admin_remarks ||
              inspectingBooking.approval_decision) && (
              <div className="p-3 rounded-lg border border-outline-variant bg-surface-container-low">
                <div className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">
                  Administrative Decision & Remarks
                </div>
                <div className="text-[11px] text-on-surface">
                  {inspectingBooking.approval_decision && (
                    <span className="font-semibold mr-1">
                      Decision: {inspectingBooking.approval_decision} &bull;
                    </span>
                  )}
                  {inspectingBooking.admin_remarks || "No remarks entered."}
                </div>
              </div>
            )}
          </div>
        )}

        <div slot="actions" className="flex justify-end gap-2 w-full pt-2">
          <m3e-button
            variant="outlined"
            onClick={() => setInspectingBooking(null)}
          >
            Close
          </m3e-button>
        </div>
      </m3e-dialog>
    </div>
  );
}

export default GanttTimetable;
