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

import "@m3e/web/theme";
import "@m3e/web/card";
import "@m3e/web/badge";
import "@m3e/web/icon";
import "@m3e/web/snackbar";

import AppHeader from "@/components/AppHeader";
import { BookingForm } from "@/components/BookingForm";
import { VenueCatalog } from "@/components/VenueCatalog";
import MyBookings from "@/components/MyBookings";
import { AdminQueue } from "@/components/AdminQueue";
import { AdminReports } from "@/components/AdminReports";
import UserSwitcherModal from "@/components/UserSwitcherModal";

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

  // 6. Native M3 Snackbar State
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);

  function showToast(message: string) {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
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
    } catch (err: unknown) {
      const errorObj = err as { message?: string; isOffline?: boolean };
      if (!errorObj.isOffline) {
        showToast(errorObj.message || "Failed to sync with backend");
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
    } else {
      getPendingApprovals()
        .then((res) => { if (res.success) setPendingQueue(res.data); })
        .catch(() => {});
      getUtilizationReport()
        .then((res) => { if (res.success) setUtilizationStats(res.data); })
        .catch(() => {});
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
      setShowUserModal(false);
      setAdminCodeInput("");
      setAdminCodeError("");
      setShowAdminCodeModal(true);
    } else {
      setCurrentUser(targetUser);
      if (activeTab.startsWith("admin")) {
        setActiveTab("book");
      }
      setShowUserModal(false);
      showToast(`Switched active profile to ${targetUser.name} (${targetUser.role_display})`);
    }
  }

  function handleVerifyAdminCode() {
    if (adminCodeInput.trim() === ADMIN_ACCESS_CODE) {
      const adminUser = APP_USERS.find((u) => u.user_type === "admin")!;
      setCurrentUser(adminUser);
      if (!activeTab.startsWith("admin")) {
        setActiveTab("admin-pending");
      }
      setShowAdminCodeModal(false);
      setAdminCodeInput("");
      setAdminCodeError("");
      showToast("Access Granted: Welcome Dr. A. Ramanathan (Estate Administrator)");
    } else {
      setAdminCodeError("Incorrect Passcode. Verification failed.");
    }
  }

  // Handle Booking Submission
  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault();

    if (!prerequisiteCheck.eligible) {
      showToast(
        `Authorization Denied: Missing mandatory clearance (${prerequisiteCheck.missing.map((m) => m.auth_name).join(", ")})`
      );
      return;
    }

    if (expectedAttendees > selectedVenue.seating_capacity) {
      showToast(
        `Capacity Warning: Expected ${expectedAttendees} attendees exceeds venue capacity of ${selectedVenue.seating_capacity}`
      );
      return;
    }

    const startISO = new Date(`${bookingDate}T${startTime}:00`).toISOString();
    const endISO = new Date(`${bookingDate}T${endTime}:00`).toISOString();

    if (new Date(endISO) <= new Date(startISO)) {
      showToast("End time must be after start time.");
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
        showToast(`Request Submitted! Ref: ${res.data.booking_ref}. Queued for Admin review.`);
        setEventTitle("");
        setPurposeNotes("");
        refreshData();
        setActiveTab("my-bookings");
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showToast(errorObj.message || "Failed to submit booking request.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Booking Cancellation
  async function handleCancelBooking(bookingId: number | string) {
    if (!confirm("Confirm cancellation of this booking request?")) return;
    try {
      setLoading(true);
      const res = await cancelBooking(bookingId, currentUser.user_id);
      if (res.success) {
        showToast("Booking request cancelled.");
        refreshData();
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showToast(errorObj.message || "Could not cancel booking.");
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
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showToast(errorObj.message || "Could not retrieve clashes.");
    } finally {
      setClashesLoading(false);
    }
  }

  // Admin: Approve Booking
  async function handleConfirmApprove() {
    if (!actionBooking) return;
    try {
      setLoading(true);
      const res = await approveBooking(actionBooking.booking_id, currentUser.user_id, approvalRemarks);
      if (res.success) {
        const rejectedCount = res.cascade_rejected_count || 0;
        showToast(
          `Permit Issued! Booking ${actionBooking.booking_ref} CONFIRMED.${
            rejectedCount > 0 ? ` ${rejectedCount} conflicting request(s) auto-rejected.` : ""
          }`
        );
        setShowApprovalModal(false);
        setActionBooking(null);
        refreshData();
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showToast(errorObj.message || "Approval transaction failed.");
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
        showToast(`Booking ${actionBooking.booking_ref} rejected with recorded remarks.`);
        setShowRejectionModal(false);
        setActionBooking(null);
        refreshData();
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      showToast(errorObj.message || "Rejection failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <m3e-theme color="#C85A32" scheme="light" variant="tonal-spot">
      <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans">
        {/* Global Academic Header & Role Tabs */}
        <AppHeader
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={(tab: string) => setActiveTab(tab as ActiveTab)}
          backendOnline={backendOnline}
          onOpenUserModal={() => setShowUserModal(true)}
          refreshData={refreshData}
          loading={loading}
          venuesCount={venues.length}
          myBookingsCount={myBookingsList.length}
          pendingQueueCount={pendingQueue.length}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
          {/* TAB 1: BOOK HALL / AUDI */}
          {activeTab === "book" && (
            <BookingForm
              venues={venues}
              currentUser={currentUser}
              selectedVenueId={selectedVenueId}
              setSelectedVenueId={setSelectedVenueId}
              selectedVenue={selectedVenue}
              bookingDate={bookingDate}
              setBookingDate={setBookingDate}
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              eventTitle={eventTitle}
              setEventTitle={setEventTitle}
              eventType={eventType}
              setEventType={setEventType}
              expectedAttendees={expectedAttendees}
              setExpectedAttendees={setExpectedAttendees}
              purposeNotes={purposeNotes}
              setPurposeNotes={setPurposeNotes}
              loading={loading}
              onSubmit={handleSubmitBooking}
              prerequisiteCheck={prerequisiteCheck}
            />
          )}

          {/* TAB 2: VENUES CATALOG */}
          {activeTab === "catalog" && (
            <VenueCatalog
              venues={venues}
              currentUser={currentUser}
              selectedVenueId={selectedVenueId}
              onRequestVenue={(id) => {
                setSelectedVenueId(id);
                setActiveTab("book");
              }}
            />
          )}

          {/* TAB 3: MY BOOKINGS */}
          {activeTab === "my-bookings" && (
            <MyBookings
              currentUser={currentUser}
              myBookingsList={myBookingsList}
              handleCancelBooking={handleCancelBooking}
              refreshData={refreshData}
              setActiveTab={(tab: string) => setActiveTab(tab as ActiveTab)}
              loading={loading}
            />
          )}

          {/* TAB 4: ADMIN PENDING APPROVALS QUEUE */}
          {activeTab === "admin-pending" && currentUser.user_type === "admin" && (
            <AdminQueue
              pendingQueue={pendingQueue}
              inspectingBooking={inspectingBooking}
              clashesData={clashesData}
              clashesLoading={clashesLoading}
              onInspectClashes={handleInspectClashes}
              onCloseClashes={() => setInspectingBooking(null)}
              onOpenApprove={(b) => {
                setActionBooking(b);
                setShowApprovalModal(true);
              }}
              onOpenReject={(b) => {
                setActionBooking(b);
                setShowRejectionModal(true);
              }}
              showApprovalModal={showApprovalModal}
              showRejectionModal={showRejectionModal}
              actionBooking={actionBooking}
              approvalRemarks={approvalRemarks}
              rejectionRemarks={rejectionRemarks}
              setApprovalRemarks={setApprovalRemarks}
              setRejectionRemarks={setRejectionRemarks}
              onConfirmApprove={handleConfirmApprove}
              onConfirmReject={handleConfirmReject}
              onCancelModal={() => {
                setShowApprovalModal(false);
                setShowRejectionModal(false);
                setActionBooking(null);
              }}
              loading={loading}
            />
          )}

          {/* TAB 5: ADMIN FACILITIES OVERVIEW */}
          {activeTab === "admin-venues" && currentUser.user_type === "admin" && (
            <div className="space-y-6">
              <div className="bg-surface rounded-lg border border-outline-variant p-6">
                <div className="border-b border-outline-variant pb-3 mb-4">
                  <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <m3e-icon className="text-primary text-xl">domain</m3e-icon>
                    <span>Campus Facilities Management</span>
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Operational inventory and telemetry for campus auditoriums and smart lecture halls.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {venues.map((v) => (
                    <m3e-card key={v.venue_id} variant="outlined" className="p-4 text-xs bg-surface-container-low">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-on-surface">{v.venue_name}</span>
                        <m3e-badge variant="small">{v.venue_status}</m3e-badge>
                      </div>
                      <div className="text-on-surface-variant">{v.venue_type} • {v.seating_capacity} seats</div>
                      <div className="text-on-surface-variant opacity-80 mt-0.5">{v.building}, Floor {v.floor_number}</div>
                    </m3e-card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ADMIN UTILIZATION REPORTS */}
          {activeTab === "admin-reports" && currentUser.user_type === "admin" && (
            <AdminReports utilizationStats={utilizationStats} />
          )}
        </main>

        {/* User Persona Switcher & Passcode Modal (Zero code leaks) */}
        <UserSwitcherModal
          open={showUserModal}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          onClose={() => setShowUserModal(false)}
          showAdminCodeModal={showAdminCodeModal}
          onCloseAdminModal={() => setShowAdminCodeModal(false)}
          adminCodeInput={adminCodeInput}
          setAdminCodeInput={setAdminCodeInput}
          adminCodeError={adminCodeError}
          setAdminCodeError={setAdminCodeError}
          onVerifyAdminCode={handleVerifyAdminCode}
        />

        {/* M3 Native Snackbar Notification */}
        <m3e-snackbar
          open={snackbarOpen}
          dismissible
          duration={5000}
          onclosed={() => setSnackbarOpen(false)}
        >
          {snackbarMessage}
        </m3e-snackbar>

        {/* Academic Footer */}
        <footer className="bg-surface border-t border-outline-variant px-6 py-3 text-center text-xs text-on-surface-variant">
          <span>BCSE302P Database Systems Lab • Assessment 6 • CampusBook</span>
          <span className="mx-2">•</span>
          <span>Narayanan Subramanian (24BCE2981) & Lavanbarath B (24BDS0155)</span>
        </footer>
      </div>
    </m3e-theme>
  );
}
