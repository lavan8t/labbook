"use client";

import React from "react";
import type { CampusUser } from "@/data/schema";

import "@m3e/web/avatar";
import "@m3e/web/badge";
import "@m3e/web/button";
import "@m3e/web/icon";

export interface AppSidebarProps {
  currentUser: CampusUser;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenUserModal: () => void;
  myBookingsCount?: number;
  pendingQueueCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItemDef {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  badgeVariant?: "primary" | "error";
  adminOnly?: boolean;
}

export function AppSidebar({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenUserModal,
  myBookingsCount = 0,
  pendingQueueCount = 0,
  mobileOpen = false,
  onCloseMobile,
}: AppSidebarProps) {
  const isAdmin = currentUser.user_type === "admin";

  const standardNavItems: NavItemDef[] = [
    { id: "timetable", label: "Timetable", icon: "schedule" },
    { id: "book", label: "Book Hall / Audi", icon: "event" },
    { id: "catalog", label: "Venues Catalog", icon: "apartment" },
    {
      id: "my-bookings",
      label: "My Bookings",
      icon: "book_online",
      badge: myBookingsCount,
      badgeVariant: "primary",
    },
  ];

  const adminNavItems: NavItemDef[] = [
    {
      id: "admin-pending",
      label: "Pending Approvals",
      icon: "pending_actions",
      badge: pendingQueueCount,
      badgeVariant: "error",
      adminOnly: true,
    },
    {
      id: "admin-venues",
      label: "All Facilities",
      icon: "meeting_room",
      adminOnly: true,
    },
    {
      id: "admin-reports",
      label: "Monthly Reports",
      icon: "analytics",
      adminOnly: true,
    },
  ];

  const renderNavButton = (item: NavItemDef) => {
    const isSelected = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          setActiveTab(item.id);
          if (onCloseMobile) onCloseMobile();
        }}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium transition-all ${
          isSelected
            ? "bg-primary text-on-primary font-semibold shadow-xs"
            : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        }`}
      >
        <m3e-icon className="text-lg shrink-0">{item.icon}</m3e-icon>
        <span className="truncate flex-1 text-left">{item.label}</span>
        {Boolean(item.badge && item.badge > 0) && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isSelected
                ? "bg-on-primary text-primary"
                : item.badgeVariant === "error"
                ? "bg-error text-on-error"
                : "bg-primary text-on-primary"
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface border-r border-outline-variant select-none">
      {/* Top Brand Header */}
      <div className="p-4 border-b border-outline-variant flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-xs shrink-0">
            <m3e-icon className="text-xl">calendar_month</m3e-icon>
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-on-surface leading-tight">
              CampusBook
            </div>
            <div className="text-[10px] text-on-surface-variant leading-tight">
              Timetable & Facilities
            </div>
          </div>
        </div>
        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
            aria-label="Close navigation"
          >
            <m3e-icon>close</m3e-icon>
          </button>
        )}
      </div>

      {/* User Profile Card */}
      <div className="p-3 m-3 rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <m3e-avatar className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-primary text-on-primary shrink-0">
            {currentUser.avatar_initials}
          </m3e-avatar>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-on-surface truncate">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-on-surface-variant truncate">
              {currentUser.role_display}
            </div>
          </div>
        </div>

        <m3e-button
          variant="outlined"
          onClick={() => {
            onOpenUserModal();
            if (onCloseMobile) onCloseMobile();
          }}
          className="text-xs w-full justify-center"
        >
          <m3e-icon slot="icon">swap_horiz</m3e-icon>
          Switch User
        </m3e-button>
      </div>

      {/* Vertical Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="space-y-1">
          {standardNavItems.map(renderNavButton)}
        </div>

        {isAdmin && (
          <div className="pt-4 mt-3 border-t border-outline-variant/60 space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Administration
            </div>
            {adminNavItems.map(renderNavButton)}
          </div>
        )}
      </div>

      {/* Footer System Badge */}
      <div className="p-3 border-t border-outline-variant text-[11px] text-on-surface-variant flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online</span>
        </span>
        <span className="text-[10px] opacity-75 font-mono">v1.2</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Sticky and fixed width */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

export default AppSidebar;
