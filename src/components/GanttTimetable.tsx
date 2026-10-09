"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import type { Venue, Booking } from "@/lib/api";
import {
  generateTimeSlots,
  getBookingSpan,
  formatSlotTime,
} from "@/lib/timetableUtils";

import "@m3e/web/card";
import "@m3e/web/badge";
import "@m3e/web/chips";
import "@m3e/web/button";
import "@m3e/web/dialog";
import "@m3e/web/icon";

export interface GanttTimetableProps {
  venues: Venue[];
  bookings: Booking[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSelectFreeSlot: (
    venueId: number,
    date: string,
    startTime: string,
    endTime: string
  ) => void;
  onInspectBooking?: (booking: Booking) => void;
  loading?: boolean;
}

type CategoryFilter = "ALL" | "AUDITORIUM" | "LECTURE_HALL" | "SEMINAR_HALL";

interface CategoryOption {
  id: CategoryFilter;
  label: string;
  icon: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "ALL", label: "All Venues", icon: "domain" },
  { id: "AUDITORIUM", label: "Auditoriums", icon: "theater_comedy" },
  { id: "LECTURE_HALL", label: "Lecture Halls", icon: "school" },
  { id: "SEMINAR_HALL", label: "Seminar Halls", icon: "meeting_room" },
];

function formatTimeDisplay(isoStr: string): string {
  try {
    const match = isoStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = match[2];
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${displayH}:${m} ${period}`;
    }
  } catch {
    // fallback to raw string
  }
  return isoStr;
}

function formatTimeRangeDisplay(startIso: string, endIso: string): string {
  const start = formatTimeDisplay(startIso);
  const end = formatTimeDisplay(endIso);
  return `${start} – ${end}`;
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
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [inspectingBooking, setInspectingBooking] = useState<Booking | null>(
    null
  );
  const [hoveredPreview, setHoveredPreview] = useState<{
    booking: Booking;
    rect: DOMRect;
  } | null>(null);

  const dialogRef = useRef<HTMLElement>(null);
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
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Filter venues by selected category
  const filteredVenues = useMemo(() => {
    if (categoryFilter === "ALL") return venues;
    if (categoryFilter === "AUDITORIUM") {
      return venues.filter(
        (v) =>
          v.venue_type === "AUDITORIUM" || v.venue_type === "MINI_AUDITORIUM"
      );
    }
    return venues.filter((v) => v.venue_type === categoryFilter);
  }, [venues, categoryFilter]);

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
        (v) => Number(v.venue_id) === Number(inspectingBooking.venue_id)
      ) || null
    );
  }, [inspectingBooking, venues]);

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <m3e-card
        variant="outlined"
        className="block rounded-xl border border-outline-variant bg-surface p-4 shadow-xs"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Date Picker & Quick Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-surface-container-low rounded-lg border border-outline-variant px-3 py-1.5 shadow-2xs">
              <m3e-icon className="text-primary text-base mr-2">
                calendar_month
              </m3e-icon>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-on-surface focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1">
              <m3e-button
                variant="outlined"
                onClick={() => shiftDate(-1)}
                className="h-8 text-xs px-2.5"
                title="Previous Day"
              >
                <m3e-icon slot="icon" className="text-xs">
                  chevron_left
                </m3e-icon>
                Prev
              </m3e-button>

              <m3e-button
                variant="tonal"
                onClick={handleSetToday}
                className="h-8 text-xs px-3 font-semibold"
              >
                Today
              </m3e-button>

              <m3e-button
                variant="outlined"
                onClick={() => shiftDate(1)}
                className="h-8 text-xs px-2.5"
                title="Next Day"
              >
                Next
                <m3e-icon slot="trailing-icon" className="text-xs">
                  chevron_right
                </m3e-icon>
              </m3e-button>
            </div>

            <span className="text-xs font-bold text-on-surface-variant ml-2 hidden sm:inline">
              {formattedDateTitle}
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    isSelected
                      ? "bg-primary text-on-primary border-primary shadow-2xs"
                      : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <m3e-icon className="text-xs">{cat.icon}</m3e-icon>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend Row */}
        <div className="mt-3 pt-3 border-t border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Status Legend:
            </span>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              Confirmed Booking
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Pending Review
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface-variant border border-dashed border-outline text-[11px] font-medium">
              <m3e-icon className="text-xs text-primary">add_circle</m3e-icon>
              Available Slot (Click to Book)
            </div>
          </div>

          <div className="text-[11px] text-on-surface-variant italic">
            Showing {filteredVenues.length} venue
            {filteredVenues.length === 1 ? "" : "s"} &bull; 08:00 to 21:00
          </div>
        </div>
      </m3e-card>

      {/* Loading Bar */}
      {loading && (
        <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant flex items-center justify-center gap-2 text-xs text-primary font-medium animate-pulse">
          <m3e-icon className="animate-spin text-sm">sync</m3e-icon>
          Updating timetable bookings for {selectedDate}...
        </div>
      )}

      {/* Gantt Timetable Matrix */}
      <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface shadow-xs">
        <div className="overflow-x-auto relative">
          <div className="min-w-[1900px]">
            {/* Header: Venue Column + 26 Time Slots */}
            <div className="flex border-b border-outline-variant bg-surface-container-high sticky top-0 z-30">
              {/* Sticky Top-Left Corner Header */}
              <div className="sticky left-0 z-40 bg-surface-container-high min-w-[240px] max-w-[240px] p-3 border-r border-outline-variant flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Venue Catalog ({filteredVenues.length})
                </span>
                <m3e-icon className="text-on-surface-variant text-sm">
                  apartment
                </m3e-icon>
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
                      <span className="text-[11px] leading-tight">
                        {slot.label}
                      </span>
                      <span className="text-[9px] text-on-surface-variant/70 font-mono">
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
                <m3e-icon className="text-3xl text-on-surface-variant/50 mb-2">
                  search_off
                </m3e-icon>
                <p>No venues match the selected category filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/30">
                {filteredVenues.map((venue) => {
                  const venueIdNum = Number(venue.venue_id);
                  const venueBookings = bookings.filter(
                    (b) => Number(b.venue_id) === venueIdNum
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
                      selectedDate
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
                  const rowHeight = Math.max(68, totalTracks * 38 + 12);

                  return (
                    <div
                      key={venue.venue_id}
                      className="flex hover:bg-surface-container-lowest/30 transition-colors"
                      style={{ minHeight: `${rowHeight}px` }}
                    >
                      {/* Sticky Left Venue Cell */}
                      <div className="sticky left-0 z-20 bg-surface border-r border-outline-variant min-w-[240px] max-w-[240px] p-3 flex flex-col justify-center">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className="font-bold text-xs text-on-surface truncate"
                            title={venue.venue_name}
                          >
                            {venue.venue_name}
                          </span>
                        </div>

                        <div className="text-[10px] text-primary font-semibold uppercase tracking-wider mt-0.5">
                          {venue.venue_type.replace(/_/g, " ")}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mt-1">
                          <span
                            className="flex items-center gap-0.5"
                            title="Seating Capacity"
                          >
                            <m3e-icon className="text-[11px]">groups</m3e-icon>
                            {venue.seating_capacity} cap
                          </span>
                          <span>&bull;</span>
                          <span
                            className="truncate flex items-center gap-0.5"
                            title={venue.building}
                          >
                            <m3e-icon className="text-[11px]">
                              location_on
                            </m3e-icon>
                            {venue.building}
                          </span>
                        </div>
                      </div>

                      {/* Timeline Grid Row with 26 Slots and Overlaid Bookings */}
                      <div
                        className="flex-1 grid grid-cols-[repeat(26,minmax(64px,1fr))] relative"
                        style={{
                          gridTemplateRows: `repeat(${totalTracks}, minmax(36px, 1fr))`,
                        }}
                      >
                        {/* 26 Background Clickable Free Slots */}
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
                                <m3e-icon className="text-[10px]">add</m3e-icon>
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
                            booking.end_datetime
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
              hoveredPreview.rect.bottom + 8
            )}px`,
            left: `${Math.max(
              16,
              Math.min(
                window.innerWidth - 320,
                hoveredPreview.rect.left
              )
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
              <m3e-icon className="text-xs text-primary">schedule</m3e-icon>
              <span className="font-semibold text-on-surface">
                {formatTimeRangeDisplay(
                  hoveredPreview.booking.start_datetime,
                  hoveredPreview.booking.end_datetime
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <m3e-icon className="text-xs">person</m3e-icon>
              <span className="truncate">
                {hoveredPreview.booking.requester_name || "Unknown Requester"}
              </span>
            </div>

            {hoveredPreview.booking.department && (
              <div className="flex items-center gap-1.5">
                <m3e-icon className="text-xs">domain</m3e-icon>
                <span className="truncate">
                  {hoveredPreview.booking.department}
                </span>
              </div>
            )}

            {hoveredPreview.booking.expected_attendees !== undefined && (
              <div className="flex items-center gap-1.5">
                <m3e-icon className="text-xs">groups</m3e-icon>
                <span>
                  {hoveredPreview.booking.expected_attendees} Expected Attendees
                </span>
              </div>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-outline-variant/40 text-[10px] text-primary font-bold flex items-center justify-between">
            <span>Click to view full reservation details</span>
            <m3e-icon className="text-xs">open_in_new</m3e-icon>
          </div>
        </div>
      )}

      {/* Full Detail Modal: <m3e-dialog> */}
      <m3e-dialog
        ref={dialogRef}
        open={Boolean(inspectingBooking) || undefined}
        dismissible
        onclosed={() => setInspectingBooking(null)}
        className="w-full max-w-lg"
      >
        <div slot="header" className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <m3e-icon
              className={
                inspectingBooking?.booking_status === "CONFIRMED"
                  ? "text-success text-xl"
                  : "text-amber-500 text-xl"
              }
            >
              {inspectingBooking?.booking_status === "CONFIRMED"
                ? "verified"
                : "pending_actions"}
            </m3e-icon>
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
                  {selectedDate}
                </div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">
                  {formatTimeRangeDisplay(
                    inspectingBooking.start_datetime,
                    inspectingBooking.end_datetime
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
                            100
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
                                100
                            )
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
