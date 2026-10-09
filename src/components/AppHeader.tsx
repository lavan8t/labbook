"use client";

import React from "react";
import type { CampusUser } from "@/data/schema";
import type { Venue, Booking } from "@/lib/api";

import "@m3e/web/app-bar";
import "@m3e/web/avatar";
import "@m3e/web/badge";
import "@m3e/web/button";
import "@m3e/web/icon";
import "@m3e/web/tabs";

export interface AppHeaderProps {
  currentUser: CampusUser;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  backendOnline: boolean;
  onOpenUserModal?: () => void;
  onSwitchRole?: () => void;
  setShowUserModal?: (show: boolean) => void;
  onRefreshData?: () => void;
  refreshData?: () => void;
  loading?: boolean;
  venuesCount?: number;
  venues?: Venue[];
  myBookingsCount?: number;
  myBookingsList?: Booking[];
  pendingQueueCount?: number;
  pendingQueue?: Booking[];
}

export default function AppHeader({
  currentUser,
  activeTab,
  setActiveTab,
  backendOnline,
  onOpenUserModal,
  onSwitchRole,
  setShowUserModal,
  onRefreshData,
  refreshData,
  loading = false,
  venuesCount,
  venues,
  myBookingsCount,
  myBookingsList,
  pendingQueueCount,
  pendingQueue,
}: AppHeaderProps) {
  const handleSwitchRole = () => {
    if (onOpenUserModal) onOpenUserModal();
    else if (onSwitchRole) onSwitchRole();
    else if (setShowUserModal) setShowUserModal(true);
  };

  const handleRefresh = () => {
    if (onRefreshData) onRefreshData();
    else if (refreshData) refreshData();
  };

  const totalVenues = venuesCount ?? venues?.length ?? 0;
  const totalBookings = myBookingsCount ?? myBookingsList?.length ?? 0;
  const totalPending = pendingQueueCount ?? pendingQueue?.length ?? 0;

  return (
    <header className="bg-surface border-b border-outline-variant sticky top-0 z-40">
      {/* Global Academic Header Bar */}
      <div className="border-b border-outline-variant bg-surface px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Brand & System Status */}
          <div className="flex items-center gap-3">
            
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold tracking-tight text-on-surface">
                  CampusBook
                </span>
                
              </div>
              
            </div>
          </div>

          {/* Active User Persona Badge & Switch User Action */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-surface-container-high px-3 py-1.5 rounded-lg">
              <m3e-avatar className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-primary text-on-primary shrink-0">
                {currentUser.avatar_initials}
              </m3e-avatar>
              <div className="text-left">
                <div className="text-xs font-semibold text-on-surface leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-on-surface-variant leading-tight">
                  {currentUser.role_display}
                </div>
              </div>
            </div>

            <m3e-button
              variant="filled"
              onClick={handleSwitchRole}
              className="text-xs font-semibold"
            >
              <m3e-icon slot="icon" name="swap_horiz"></m3e-icon>
              Switch User
            </m3e-button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-surface px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto py-2">
          <m3e-tabs variant="primary" className="flex items-center gap-1">
            {currentUser.user_type === "normal" ? (
              <>
                <m3e-tab
                  selected={activeTab === "book"}
                  onClick={() => setActiveTab("book")}
                >
                  <m3e-icon slot="icon" name="event"></m3e-icon>
                  Book Hall / Audi
                </m3e-tab>
                <m3e-tab
                  selected={activeTab === "catalog"}
                  onClick={() => setActiveTab("catalog")}
                >
                  <m3e-icon slot="icon" name="apartment"></m3e-icon>
                  Venues Catalog
                </m3e-tab>
                <m3e-tab
                  selected={activeTab === "my-bookings"}
                  onClick={() => setActiveTab("my-bookings")}
                >
                  <m3e-icon slot="icon" name="book_online"></m3e-icon>
                  My Bookings
                  {totalBookings > 0 && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-on-primary font-bold">
                      {totalBookings}
                    </span>
                  )}
                </m3e-tab>
              </>
            ) : (
              <>
                <m3e-tab
                  selected={activeTab === "admin-pending"}
                  onClick={() => setActiveTab("admin-pending")}
                >
                  <m3e-icon slot="icon" name="pending_actions"></m3e-icon>
                  Pending Approvals Queue
                  {totalPending > 0 && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-error text-on-error font-bold">
                      {totalPending}
                    </span>
                  )}
                </m3e-tab>
                <m3e-tab
                  selected={activeTab === "admin-venues"}
                  onClick={() => setActiveTab("admin-venues")}
                >
                  <m3e-icon slot="icon" name="meeting_room"></m3e-icon>
                  All Auditoriums
                </m3e-tab>
                <m3e-tab
                  selected={activeTab === "admin-reports"}
                  onClick={() => setActiveTab("admin-reports")}
                >
                  <m3e-icon slot="icon" name="analytics"></m3e-icon>
                  Monthly Reports
                </m3e-tab>
              </>
            )}
          </m3e-tabs>

          <div className="ml-auto flex items-center gap-2">
            <m3e-button
              variant="text"
              onClick={handleRefresh}
              disabled={loading}
              className="text-xs text-on-surface-variant hover:text-primary"
              title="Refresh from PostgreSQL"
            >
              <m3e-icon slot="icon" name="sync"></m3e-icon>
              <span>{loading ? "Syncing..." : "Sync DB"}</span>
            </m3e-button>
          </div>
        </div>
      </div>
    </header>
  );
}
