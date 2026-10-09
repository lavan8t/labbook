"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APP_USERS,
  ADMIN_ACCESS_CODE,
  FALLBACK_VENUES,
  type CampusUser,
} from "@/data/schema";
import {
  getVenues,
  getVenueSchedule,
  createBooking,
  getMyBookings,
  cancelBooking,
  getPendingApprovals,
  getClashes,
  approveBooking,
  rejectBooking,
  getUtilizationReport,
  checkBackendHealth,
  type Venue,
  type Booking,
  type CompetingClash,
  type UtilizationStat,
} from "@/lib/api";

import "@m3e/web/select";
import "@m3e/web/option";
import "@m3e/web/form-field";
import "@m3e/web/button";
import "@m3e/web/button-group";
import "@m3e/web/theme";
import "@m3e/web/chips";
import "@m3e/web/switch";
import "@m3e/web/divider";
import "@m3e/web/tabs";
import "@m3e/web/icon";

type NormalTab = "book" | "catalog" | "my-bookings";
type AdminTab = "admin-pending" | "admin-venues" | "admin-reports";
type ActiveTab = NormalTab | AdminTab;

export default function CampusBookPage() {
  // 1. Current Active User State (Default: Aditya Sharma - Club Head)
  const [currentUser, setCurrentUser] = useState<CampusUser>(APP_USERS[0]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("book");

  // 2. Data State from Backend
  const [venues, setVenues] = useState<Venue[]>(FALLBACK_VENUES as unknown as Venue[]);
  const [myBookingsList, setMyBookingsList] = useState<Booking[]>([]);
  const [pendingQueue, setPendingQueue] = useState<Booking[]>([]);
  const [utilizationStats, setUtilizationStats] = useState<UtilizationStat[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // 3. User Switching & Admin Auth Modal State
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [showAdminCodeModal, setShowAdminCodeModal] = useState<boolean>(false);
  const [adminCodeInput, setAdminCodeInput] = useState<string>("");
  const [adminCodeError, setAdminCodeError] = useState<string>("");

  // 4. Booking Form State (Normal Users)
  const [selectedVenueId, setSelectedVenueId] = useState<number>(1);
  const [bookingDate, setBookingDate] = useState<string>("2026-10-22");
  const [startTime, setStartTime] = useState<string>("10:00");
  const [endTime, setEndTime] = useState<string>("13:00");
  const [eventTitle, setEventTitle] = useState<string>("");
  const [eventType, setEventType] = useState<string>("ACADEMIC_LECTURE");
  const [expectedAttendees, setExpectedAttendees] = useState<number>(100);
  const [purposeNotes, setPurposeNotes] = useState<string>("");

  // 5. Admin Clash & Approval Modals
  const [inspectingBooking, setInspectingBooking] = useState<Booking | null>(null);
  const [clashesData, setClashesData] = useState<CompetingClash[]>([]);
  const [clashesLoading, setClashesLoading] = useState<boolean>(false);
  const [actionBooking, setActionBooking] = useState<Booking | null>(null);
  const [approvalRemarks, setApprovalRemarks] = useState<string>("Permit granted after administrative review.");
  const [rejectionRemarks, setRejectionRemarks] = useState<string>("Slot unavailable or conflicting priority event.");
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [showRejectionModal, setShowRejectionModal] = useState<boolean>(false);

  // 6. Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  // Check health and load initial data
  useEffect(() => {
    checkHealthAndFetch();
  }, []);

  async function checkHealthAndFetch() {
    try {
      await checkBackendHealth();
      setBackendOnline(true);
      refreshData();
    } catch {
      setBackendOnline(false);
    }
  }

  async function refreshData() {
    try {
      setLoading(true);
      const vRes = await getVenues();
      if (vRes.success) setVenues(vRes.data);

      if (currentUser.user_type === "normal") {
        const bRes = await getMyBookings(currentUser.user_id);
        if (bRes.success) setMyBookingsList(bRes.data);
      } else {
        const pRes = await getPendingApprovals();
        if (pRes.success) setPendingQueue(pRes.data);

        const uRes = await getUtilizationReport();
        if (uRes.success) setUtilizationStats(uRes.data);
      }
    } catch (err: any) {
      if (!err.isOffline) {
        showToast(err.message || "Failed to sync with backend", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  // Refresh bookings when switching users
  useEffect(() => {
    if (currentUser.user_type === "normal") {
      getMyBookings(currentUser.user_id)
        .then((res) => { if (res.success) setMyBookingsList(res.data); })
        .catch(() => {});
      if (activeTab.startsWith("admin")) {
        setActiveTab("book");
      }
    } else {
      getPendingApprovals()
        .then((res) => { if (res.success) setPendingQueue(res.data); })
        .catch(() => {});
      getUtilizationReport()
        .then((res) => { if (res.success) setUtilizationStats(res.data); })
        .catch(() => {});
      if (!activeTab.startsWith("admin")) {
        setActiveTab("admin-pending");
      }
    }
  }, [currentUser]);

  // Selected Venue Details
  const selectedVenue = useMemo(() => {
    return venues.find((v) => Number(v.venue_id) === Number(selectedVenueId)) || venues[0];
  }, [venues, selectedVenueId]);

  // Relational Division Prerequisite Check for Selected Venue
  const prerequisiteCheck = useMemo(() => {
    if (!selectedVenue || !selectedVenue.required_authorizations) {
      return { eligible: true, missing: [] };
    }
    if (selectedVenue.required_authorizations.length === 0) {
      return { eligible: true, missing: [] };
    }

    // Check user credentials against required authorizations
    const userCredsText = currentUser.credentials.join(" ").toUpperCase();
    const missing = selectedVenue.required_authorizations.filter((req) => {
      return !userCredsText.includes(req.auth_code.toUpperCase());
    });

    return {
      eligible: missing.length === 0,
      missing,
    };
  }, [selectedVenue, currentUser]);

  // Handle User Switching
  function handleSelectUser(targetUser: CampusUser) {
    if (targetUser.user_type === "admin") {
      // Prompt for Admin Access Code "0406"
      setShowUserModal(false);
      setAdminCodeInput("");
      setAdminCodeError("");
      setShowAdminCodeModal(true);
    } else {
      setCurrentUser(targetUser);
      setShowUserModal(false);
      showToast(`Switched active profile to ${targetUser.name} (${targetUser.role_display})`, "info");
    }
  }

  function handleVerifyAdminCode() {
    if (adminCodeInput.trim() === ADMIN_ACCESS_CODE) {
      const adminUser = APP_USERS.find((u) => u.user_type === "admin")!;
      setCurrentUser(adminUser);
      setShowAdminCodeModal(false);
      setAdminCodeInput("");
      setAdminCodeError("");
      showToast("Access Granted: Welcome Dr. A. Ramanathan (Estate Administrator)", "success");
    } else {
      setAdminCodeError("Incorrect Access Code. Please enter '0406' to proceed.");
    }
  }

  // Handle Booking Submission
  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault();

    if (!prerequisiteCheck.eligible) {
      showToast(
        `Authorization Denied: Missing mandatory clearance (${prerequisiteCheck.missing.map((m) => m.auth_name).join(", ")})`,
        "error"
      );
      return;
    }

    if (expectedAttendees > selectedVenue.seating_capacity) {
      showToast(
        `Capacity Warning: Expected ${expectedAttendees} attendees exceeds venue capacity of ${selectedVenue.seating_capacity}!`,
        "error"
      );
      return;
    }

    const startISO = new Date(`${bookingDate}T${startTime}:00`).toISOString();
    const endISO = new Date(`${bookingDate}T${endTime}:00`).toISOString();

    if (new Date(endISO) <= new Date(startISO)) {
      showToast("End time must be after start time.", "error");
      return;
    }

    try {
      setLoading(true);
      const res = await createBooking({
        user_id: currentUser.user_id,
        venue_id: Number(selectedVenueId),
        start_datetime: startISO,
        end_datetime: endISO,
        event_title: eventTitle || "Campus Academic Gathering",
        event_type: eventType,
        expected_attendees: expectedAttendees,
        purpose_notes: purposeNotes,
        club_id: currentUser.role === "CLUB_HEAD" ? 1 : null,
      });

      if (res.success) {
        showToast(
          `Request Submitted! Ref: ${res.data.booking_ref}. Queued for Admin review.`,
          "success"
        );
        setEventTitle("");
        setPurposeNotes("");
        refreshData();
        setActiveTab("my-bookings");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to submit booking request.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Handle Booking Cancellation
  async function handleCancelBooking(bookingId: number | string) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      setLoading(true);
      const res = await cancelBooking(bookingId, currentUser.user_id);
      if (res.success) {
        showToast("Booking request cancelled.", "info");
        refreshData();
      }
    } catch (err: any) {
      showToast(err.message || "Could not cancel booking.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Admin: Inspect Clashes
  async function handleInspectClashes(booking: Booking) {
    setInspectingBooking(booking);
    setClashesLoading(true);
    try {
      const res = await getClashes(booking.booking_id);
      if (res.success) {
        setClashesData(res.competing_requests);
      }
    } catch (err: any) {
      showToast(err.message || "Could not retrieve clashes.", "error");
    } finally {
      setClashesLoading(false);
    }
  }

  // Admin: Approve Booking (Calls Stored Procedure)
  async function handleConfirmApprove() {
    if (!actionBooking) return;
    try {
      setLoading(true);
      const res = await approveBooking(actionBooking.booking_id, currentUser.user_id, approvalRemarks);
      if (res.success) {
        const rejectedCount = res.cascade_rejected_count || 0;
        showToast(
          `Permit Issued! Booking ${actionBooking.booking_ref} CONFIRMED. ${
            rejectedCount > 0 ? `${rejectedCount} conflicting pending request(s) auto-rejected.` : ""
          }`,
          "success"
        );
        setShowApprovalModal(false);
        setActionBooking(null);
        refreshData();
      }
    } catch (err: any) {
      showToast(err.message || "Approval transaction failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Admin: Reject Booking
  async function handleConfirmReject() {
    if (!actionBooking) return;
    try {
      setLoading(true);
      const res = await rejectBooking(actionBooking.booking_id, currentUser.user_id, rejectionRemarks);
      if (res.success) {
        showToast(`Booking ${actionBooking.booking_ref} rejected with recorded remarks.`, "info");
        setShowRejectionModal(false);
        setActionBooking(null);
        refreshData();
      }
    } catch (err: any) {
      showToast(err.message || "Rejection failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <m3e-theme variant="vibrant">
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        {/* Top Notification Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-md shadow-lg border text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : toast.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-300"
                : "bg-indigo-50 text-indigo-800 border-indigo-300"
            }`}
          >
            <span>
              {toast.type === "success" && "✓"}
              {toast.type === "error" && "⚠"}
              {toast.type === "info" && "ℹ"}
            </span>
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Academic Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Project Brand */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-indigo-900">
                  CampusBook
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                  PostgreSQL GiST
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded flex items-center gap-1 ${
                    backendOnline
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                  title={
                    backendOnline
                      ? "Connected to localhost:5000"
                      : "Offline mode. Run 'cd backend && bun run dev'"
                  }
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      backendOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  ></span>
                  {backendOnline ? "Backend Live :5000" : "Backend Offline"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Campus Auditorium & Smart Lecture Hall Reservation and Authorization System
              </p>
            </div>

            {/* Active User Persona Badge & Switch Button */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-slate-100/80 border border-slate-200 px-3 py-1.5 rounded-lg">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                    currentUser.user_type === "admin"
                      ? "bg-rose-600"
                      : currentUser.role === "FACULTY"
                      ? "bg-indigo-600"
                      : "bg-teal-600"
                  }`}
                >
                  {currentUser.avatar_initials}
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    {currentUser.role_display}
                  </div>
                </div>
              </div>

              <m3e-button
                variant="outlined"
                onClick={() => setShowUserModal(true)}
                className="text-xs font-medium"
              >
                Switch Role
              </m3e-button>
            </div>
          </div>
        </header>

        {/* Navigation Tabs Bar */}
        <div className="bg-white border-b border-slate-200 px-6">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2">
            {currentUser.user_type === "normal" ? (
              <>
                <button
                  onClick={() => setActiveTab("book")}
                  className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
                    activeTab === "book"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Book Hall / Audi
                </button>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
                    activeTab === "catalog"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Venues Catalog ({venues.length})
                </button>
                <button
                  onClick={() => setActiveTab("my-bookings")}
                  className={`px-4 py-2 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 ${
                    activeTab === "my-bookings"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>My Bookings</span>
                  {myBookingsList.length > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        activeTab === "my-bookings"
                          ? "bg-white text-indigo-700 font-bold"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {myBookingsList.length}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab("admin-pending")}
                  className={`px-4 py-2 text-xs font-semibold rounded transition-colors flex items-center gap-2 ${
                    activeTab === "admin-pending"
                      ? "bg-rose-700 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>Pending Approvals Queue</span>
                  {pendingQueue.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-200 text-rose-900">
                      {pendingQueue.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("admin-venues")}
                  className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
                    activeTab === "admin-venues"
                      ? "bg-rose-700 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  All Auditoriums & Schedules
                </button>
                <button
                  onClick={() => setActiveTab("admin-reports")}
                  className={`px-4 py-2 text-xs font-semibold rounded transition-colors ${
                    activeTab === "admin-reports"
                      ? "bg-rose-700 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Monthly Utilization Analytics
                </button>
              </>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={refreshData}
                disabled={loading}
                className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-slate-100"
                title="Refresh from PostgreSQL"
              >
                <span>↻</span> {loading ? "Syncing..." : "Sync DB"}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1">
          {/* TAB 1: BOOK HALL / AUDI (NORMAL USERS) */}
          {activeTab === "book" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Booking Form */}
              <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6">
                <div className="border-b border-slate-100 pb-4 mb-5">
                  <h2 className="text-base font-bold text-slate-900">
                    Submit Auditorium / Hall Booking Request
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Bookings are submitted in <span className="font-semibold text-amber-600">PENDING</span> status and reviewed by the Estate Administrator.
                  </p>
                </div>

                <form onSubmit={handleSubmitBooking} className="space-y-4">
                  {/* Venue Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Venue / Hall *
                    </label>
                    <select
                      value={selectedVenueId}
                      onChange={(e) => setSelectedVenueId(Number(e.target.value))}
                      className="w-full text-sm border border-slate-300 rounded px-3 py-2 bg-white focus:outline-none focus:border-indigo-500"
                    >
                      {venues.map((v) => (
                        <option key={v.venue_id} value={v.venue_id}>
                          {v.venue_name} ({v.venue_type} — {v.seating_capacity} Seats, {v.building})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Relational Division Prerequisite Check Banner */}
                  <div
                    className={`p-3 rounded border text-xs flex items-start gap-2.5 ${
                      prerequisiteCheck.eligible
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    <span className="text-base leading-none">
                      {prerequisiteCheck.eligible ? "✓" : "⚠"}
                    </span>
                    <div>
                      <div className="font-semibold">
                        {prerequisiteCheck.eligible
                          ? "Prerequisite Verification: CLEARED"
                          : "Authorization Restriction: MISSING CLEARANCE"}
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {prerequisiteCheck.eligible ? (
                          `You possess all required clearances for ${selectedVenue.venue_name}.`
                        ) : (
                          <span>
                            This venue requires:{" "}
                            <strong>
                              {prerequisiteCheck.missing.map((m) => m.auth_name).join(", ")}
                            </strong>
                            . Your request cannot be processed without these credentials.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date & Time Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Reservation Date *
                      </label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        End Time *
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Quick Duration Buttons */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Duration presets:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime("09:00");
                        setEndTime("11:00");
                      }}
                      className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      2h Lecture
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime("10:00");
                        setEndTime("14:00");
                      }}
                      className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      4h Symposium
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStartTime("09:00");
                        setEndTime("17:00");
                      }}
                      className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      8h Full Day
                    </button>
                  </div>

                  {/* Event Title & Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Event / Lecture Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Annual Tech Hackathon Inauguration"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Event Category *
                      </label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="ACADEMIC_LECTURE">Academic Lecture / Class Merge</option>
                        <option value="GUEST_LECTURE">Guest Lecture / Keynote</option>
                        <option value="WORKSHOP">Workshop / Hands-on Lab</option>
                        <option value="HACKATHON">Hackathon / Tech Competition</option>
                        <option value="CULTURAL_EVENT">Cultural Event / Audition</option>
                        <option value="CONFERENCE">Conference / Symposium</option>
                        <option value="EXAMINATION">Department Examination</option>
                      </select>
                    </div>
                  </div>

                  {/* Expected Attendees */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Expected Attendees * (Max capacity: {selectedVenue.seating_capacity})
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={selectedVenue.seating_capacity + 200}
                      value={expectedAttendees}
                      onChange={(e) => setExpectedAttendees(Number(e.target.value))}
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Purpose Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Justification & Special Requirements
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Specify AV requirements, external guests, or departmental rationale..."
                      value={purposeNotes}
                      onChange={(e) => setPurposeNotes(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white focus:outline-none focus:border-indigo-500"
                    ></textarea>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading || !prerequisiteCheck.eligible}
                      className={`w-full py-2.5 rounded font-semibold text-xs tracking-wider uppercase transition-colors ${
                        !prerequisiteCheck.eligible
                          ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {loading ? "Submitting to Database..." : "Submit Booking Request"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Venue Details Card */}
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                    Venue Specifications
                  </h3>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Venue Name</span>
                      <span className="font-semibold text-slate-800">{selectedVenue.venue_name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Category</span>
                      <span className="font-medium text-slate-800">{selectedVenue.venue_type}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Building / Floor</span>
                      <span className="font-medium text-slate-800">
                        {selectedVenue.building}, Floor {selectedVenue.floor_number}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Seating Capacity</span>
                      <span className="font-bold text-indigo-700">
                        {selectedVenue.seating_capacity} seats
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Air Conditioned</span>
                      <span className="font-medium text-slate-800">
                        {selectedVenue.has_air_conditioning ? "Yes (Central AC)" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Projector Arrays</span>
                      <span className="font-medium text-slate-800">
                        {selectedVenue.projector_count} Units
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Sound System</span>
                      <span className="font-medium text-slate-800">
                        {selectedVenue.has_sound_system ? "Installed & Tuned" : "Basic"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Smart Podium</span>
                      <span className="font-medium text-slate-800">
                        {selectedVenue.has_smart_podium ? "Yes (Touch display)" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50/60 rounded-lg border border-indigo-100 p-4 text-xs text-indigo-900">
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    <span>🛡️</span> Concurrency & Conflict Policy
                  </div>
                  <p className="text-[11px] leading-relaxed text-indigo-800">
                    PostgreSQL GiST exclusion prevents double-booking at the database level. Multiple pending requests for the same time window may be submitted; once an Admin confirms a slot, all competing requests are automatically rejected.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VENUES CATALOG (ALL USERS) */}
          {activeTab === "catalog" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Campus Venues Master Catalog</h2>
                  <p className="text-xs text-slate-500">
                    Comprehensive overview of all 5 university auditoriums, mini-audis, and lecture halls.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {venues.map((venue) => (
                  <div
                    key={venue.venue_id}
                    className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                          {venue.venue_type}
                        </span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {venue.seating_capacity} Seats
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-2">
                        {venue.venue_name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {venue.building}, Floor {venue.floor_number}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {venue.has_air_conditioning && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            ❄ Central AC
                          </span>
                        )}
                        {venue.projector_count > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            📽 {venue.projector_count} Projector{venue.projector_count > 1 ? "s" : ""}
                          </span>
                        )}
                        {venue.has_sound_system && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            🔊 Sound System
                          </span>
                        )}
                        {venue.has_smart_podium && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            🖥 Smart Podium
                          </span>
                        )}
                      </div>

                      {venue.required_authorizations && venue.required_authorizations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider block mb-1">
                            Mandatory Clearances:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {venue.required_authorizations.map((auth) => (
                              <span
                                key={auth.auth_id}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-100"
                              >
                                {auth.auth_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setSelectedVenueId(Number(venue.venue_id));
                          setActiveTab("book");
                        }}
                        className="w-full py-1.5 text-xs font-semibold rounded bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 transition-colors"
                      >
                        Request This Venue →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MY BOOKINGS (NORMAL USERS) */}
          {activeTab === "my-bookings" && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    My Venue Reservations ({currentUser.name})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Track the lifecycle of your booking requests, admin approvals, and permits.
                  </p>
                </div>
                <button
                  onClick={refreshData}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Refresh Status
                </button>
              </div>

              {myBookingsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <span className="text-3xl block mb-2">📋</span>
                  <p className="text-sm">No reservations found for your profile.</p>
                  <button
                    onClick={() => setActiveTab("book")}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold rounded bg-indigo-600 text-white"
                  >
                    Submit a Booking Request
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3">Ref Code</th>
                        <th className="py-2.5 px-3">Venue</th>
                        <th className="py-2.5 px-3">Event Title</th>
                        <th className="py-2.5 px-3">Date & Time Range</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Admin Notes / Remarks</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myBookingsList.map((b) => (
                        <tr key={b.booking_id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                            {b.booking_ref}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{b.venue_name}</div>
                            <div className="text-[11px] text-slate-400">{b.building}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800">{b.event_title}</div>
                            <div className="text-[10px] text-slate-400">{b.event_type}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div>{new Date(b.start_datetime).toLocaleDateString()}</div>
                            <div className="text-[11px] text-slate-500">
                              {new Date(b.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                              {new Date(b.end_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.booking_status === "CONFIRMED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : b.booking_status === "PENDING"
                                  ? "bg-amber-100 text-amber-800"
                                  : b.booking_status === "REJECTED"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {b.booking_status}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-xs text-[11px] text-slate-600">
                            {b.admin_remarks || b.purpose_notes || "—"}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {b.booking_status !== "CANCELLED" && b.booking_status !== "REJECTED" && (
                              <button
                                onClick={() => handleCancelBooking(b.booking_id)}
                                className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADMIN PENDING APPROVALS QUEUE */}
          {activeTab === "admin-pending" && currentUser.user_type === "admin" && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Administrator Pending Approvals Queue
                  </h2>
                  <p className="text-xs text-slate-500">
                    Review candidate bookings, inspect slot clashes, and issue formal permits.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Pending Requests:</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
                    {pendingQueue.length}
                  </span>
                </div>
              </div>

              {pendingQueue.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <span className="text-3xl block mb-2">🎉</span>
                  <p className="text-sm">Queue is clear! No requests currently awaiting administrative approval.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3">Ref</th>
                        <th className="py-2.5 px-3">Venue</th>
                        <th className="py-2.5 px-3">Requester & Role</th>
                        <th className="py-2.5 px-3">Event Details</th>
                        <th className="py-2.5 px-3">Requested Time</th>
                        <th className="py-2.5 px-3">Conflict Status</th>
                        <th className="py-2.5 px-3 text-right">Decision Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingQueue.map((b) => {
                        const hasConflict = Number(b.competing_pending_count || 0) > 0;
                        return (
                          <tr key={b.booking_id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900">
                              {b.booking_ref}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-800">{b.venue_name}</div>
                              <div className="text-[10px] text-slate-500">{b.seating_capacity} seats</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-medium text-slate-800">{b.requester_name}</div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    b.requester_role === "FACULTY"
                                      ? "bg-indigo-100 text-indigo-800"
                                      : "bg-teal-100 text-teal-800"
                                  }`}
                                >
                                  {b.requester_role}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                                  {b.club_name || b.department}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-medium text-slate-800">{b.event_title}</div>
                              <div className="text-[10px] text-slate-500">
                                {b.event_type} • {b.expected_attendees} attendees
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div>{new Date(b.start_datetime).toLocaleDateString()}</div>
                              <div className="text-[11px] text-slate-500">
                                {new Date(b.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                                {new Date(b.end_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {hasConflict ? (
                                <button
                                  onClick={() => handleInspectClashes(b)}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 flex items-center gap-1"
                                >
                                  <span>⚠️</span>
                                  <span>{b.competing_pending_count} Clash Bid(s)</span>
                                </button>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  ✓ Slot Vacant
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex justify-end items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setActionBooking(b);
                                    setShowApprovalModal(true);
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setActionBooking(b);
                                    setShowRejectionModal(true);
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold rounded border border-rose-300 text-rose-700 hover:bg-rose-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ADMIN VENUES & SCHEDULES */}
          {activeTab === "admin-venues" && currentUser.user_type === "admin" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-base font-bold text-slate-900 mb-1">
                  Campus Facilities Management
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Oversee all 5 auditoriums and smart lecture halls, facility features, and operational statuses.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {venues.map((v) => (
                    <div key={v.venue_id} className="border border-slate-200 rounded p-4 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-800">{v.venue_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                          {v.venue_status}
                        </span>
                      </div>
                      <div className="text-slate-500">{v.venue_type} • {v.seating_capacity} seats</div>
                      <div className="text-slate-400 mt-0.5">{v.building}, Floor {v.floor_number}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ADMIN UTILIZATION REPORTS */}
          {activeTab === "admin-reports" && currentUser.user_type === "admin" && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="border-b border-slate-100 pb-3 mb-5">
                <h2 className="text-base font-bold text-slate-900">
                  Monthly Venue Utilization & Occupancy Analytics
                </h2>
                <p className="text-xs text-slate-500">
                  Computed live from confirmed reservations in the PostgreSQL database.
                </p>
              </div>

              {utilizationStats.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No confirmed events recorded yet this month to compute utilization stats.
                </div>
              ) : (
                <div className="space-y-4">
                  {utilizationStats.map((stat) => (
                    <div key={stat.venue_id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{stat.venue_name}</span>
                          <span className="text-xs text-slate-500 ml-2">
                            ({stat.venue_type} • {stat.seating_capacity} Seats)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-indigo-700">
                            {stat.utilization_percentage}% Occupancy
                          </span>
                          <span className="text-xs text-slate-400 block">
                            {stat.hours_booked} hours booked ({stat.total_events_hosted} events)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${Math.min(100, Number(stat.utilization_percentage) || 5)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* MODAL 1: USER ROLE SWITCHER */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-900">Switch Active Persona</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Select a user persona to test role-based permissions, credential verification, and administrative approvals:
              </p>

              <div className="space-y-3">
                {APP_USERS.map((user) => (
                  <div
                    key={user.user_id}
                    onClick={() => handleSelectUser(user)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      currentUser.user_id === user.user_id
                        ? "border-indigo-600 bg-indigo-50/50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                        user.user_type === "admin"
                          ? "bg-rose-600"
                          : user.role === "FACULTY"
                          ? "bg-indigo-600"
                          : "bg-teal-600"
                      }`}
                    >
                      {user.avatar_initials}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{user.name}</span>
                        {user.user_type === "admin" && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                            Requires Code: 0406
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500">{user.role_display}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Credentials: {user.credentials.join(", ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: ADMIN ACCESS CODE VERIFICATION DIALOG (Code: "0406") */}
        {showAdminCodeModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-6">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto text-xl mb-2">
                  🔒
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Administrator Access Verification
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Switching to <strong>Dr. A. Ramanathan (Estate Office)</strong> requires the administrative security pass code.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter Admin Pass Code (Hint: 0406)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="Enter code..."
                  value={adminCodeInput}
                  onChange={(e) => {
                    setAdminCodeInput(e.target.value);
                    setAdminCodeError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyAdminCode();
                  }}
                  className="w-full text-center tracking-widest text-base font-mono border border-slate-300 rounded px-3 py-2 bg-white focus:outline-none focus:border-rose-500"
                />
                {adminCodeError && (
                  <p className="text-[11px] text-rose-600 mt-1.5 text-center font-medium">
                    {adminCodeError}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminCodeModal(false)}
                  className="w-1/2 py-2 text-xs font-semibold rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAdminCode}
                  className="w-1/2 py-2 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Authorize
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: INSPECT SLOT CLASHES */}
        {inspectingBooking && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-xl w-full p-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Slot Clash Analysis: {inspectingBooking.booking_ref}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Overlapping requests competing for {inspectingBooking.venue_name}
                  </p>
                </div>
                <button
                  onClick={() => setInspectingBooking(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  ✕
                </button>
              </div>

              {clashesLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Scanning PostgreSQL GiST range overlaps...
                </div>
              ) : clashesData.length === 0 ? (
                <div className="py-6 text-center text-xs text-emerald-700 bg-emerald-50 rounded">
                  ✓ No overlapping bids detected for this time range.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-slate-600 font-medium">
                    Found <strong>{clashesData.length}</strong> competing candidate request(s) on this slot:
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {clashesData.map((c) => (
                      <div
                        key={c.booking_id}
                        className="p-3 rounded border border-amber-200 bg-amber-50/50 text-xs flex justify-between items-start"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {c.booking_ref}: {c.event_title}
                          </div>
                          <div className="text-slate-600 text-[11px] mt-0.5">
                            Applicant: <strong>{c.requester_name}</strong> ({c.requester_role}) • {c.expected_attendees} attendees
                          </div>
                          <div className="text-slate-500 text-[10px] mt-1">
                            {new Date(c.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                            {new Date(c.end_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                            {c.overlap_hours}h Overlap
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 mt-3">
                    💡 <strong>Automatic Cascade Rule:</strong> Approving {inspectingBooking.booking_ref} will grant its official permit and atomically transition these competing bids to <code>REJECTED</code>.
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setInspectingBooking(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: CONFIRM APPROVAL / ISSUE PERMIT */}
        {showApprovalModal && actionBooking && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Issue Administrative Permit: {actionBooking.booking_ref}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                You are approving <strong>{actionBooking.event_title}</strong> for <strong>{actionBooking.venue_name}</strong>.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Permit Approval Remarks / Instructions
                </label>
                <textarea
                  rows={2}
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="w-1/2 py-2 text-xs font-semibold rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApprove}
                  disabled={loading}
                  className="w-1/2 py-2 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {loading ? "Processing..." : "Confirm & Grant Permit"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: CONFIRM REJECTION */}
        {showRejectionModal && actionBooking && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Reject Booking Request: {actionBooking.booking_ref}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Document reason for rejection for <strong>{actionBooking.requester_name}</strong>.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rejection Reason / Remarks
                </label>
                <textarea
                  rows={2}
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className="w-1/2 py-2 text-xs font-semibold rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={loading}
                  className="w-1/2 py-2 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {loading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Academic Footer */}
        <footer className="bg-white border-t border-slate-200 px-6 py-3 text-center text-xs text-slate-500">
          <span>BCSE302P Database Systems Lab • Assessment 6 • CampusBook</span>
          <span className="mx-2">•</span>
          <span>Narayanan Subramanian (24BCE2981) & Lavanbarath B (24BDS0155)</span>
        </footer>
      </div>
    </m3e-theme>
  );
}
