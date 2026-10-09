"use client";

import React from "react";
import type { CampusUser } from "@/data/schema";

import "@m3e/web/avatar";
import "@m3e/web/badge";
import "@m3e/web/button";
import "@m3e/web/button-group";
import "@m3e/web/split-button";
import "@m3e/web/icon-button";
import "@m3e/web/icon";
import "@m3e/web/nav-rail";
import "@m3e/web/nav-bar";

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
    { id: "timetable", label: "Timetable", icon: "calendar_month" },
    { id: "book", label: "Book Hall / Audi", icon: "add_circle" },
    { id: "catalog", label: "Venues Catalog", icon: "domain" },
    {
      id: "my-bookings",
      label: "My Bookings",
      icon: "book_online",
      badge: myBookingsCount,
    },
  ];

  const adminNavItems: NavItemDef[] = [
    {
      id: "admin-pending",
      label: "Pending Approvals",
      icon: "pending_actions",
      badge: pendingQueueCount,
    },
    {
      id: "admin-venues",
      label: "All Facilities",
      icon: "meeting_room",
    },
    {
      id: "admin-reports",
      label: "Monthly Reports",
      icon: "analytics",
    },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface border-r border-outline-variant select-none">
      {/* Top Brand Header: CampusBook alone, no title icon, no subtitle */}
      <div className="px-3 py-3.5 border-b border-outline-variant/60 flex items-center justify-between shrink-0">
        <span className="text-base font-bold tracking-tight text-on-surface truncate">
          CampusBook
        </span>
        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Close navigation"
          >
            <m3e-icon name="close"></m3e-icon>
          </button>
        )}
      </div>

      {/* Account Info with Down Arrow Button */}
      <div className="mx-2 my-2.5 p-2 rounded-xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between gap-1 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <m3e-avatar className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] bg-primary text-on-primary shrink-0">
            {currentUser.avatar_initials}
          </m3e-avatar>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-on-surface truncate" title={currentUser.name}>
              {currentUser.name}
            </div>
            <div className="text-[10px] text-on-surface-variant truncate" title={currentUser.role_display}>
              {currentUser.role_display}
            </div>
          </div>
        </div>

        <m3e-icon-button
          onClick={() => {
            onOpenUserModal();
            if (onCloseMobile) onCloseMobile();
          }}
          aria-label="Switch User"
          title="Switch User"
          className="shrink-0 -mr-1"
        >
          <m3e-icon name="arrow_drop_down"></m3e-icon>
        </m3e-icon-button>
      </div>

      {/* Navigation Rail from m3e repository */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1.5">
        <m3e-nav-rail mode="expanded" className="w-full flex flex-col gap-0.5">
          {standardNavItems.map((item) => (
            <m3e-nav-item
              key={item.id}
              selected={activeTab === item.id}
              onClick={() => handleNavClick(item.id)}
              className="cursor-pointer"
            >
              <m3e-icon slot="icon" name={item.icon}></m3e-icon>
              <span className="flex items-center justify-between w-full min-w-0 pr-1 text-xs">
                <span className="truncate">{item.label}</span>
                {Boolean(item.badge && item.badge > 0) && (
                  <m3e-badge className="ml-1 shrink-0">{item.badge}</m3e-badge>
                )}
              </span>
            </m3e-nav-item>
          ))}

          {isAdmin && (
            <div className="pt-3 mt-2 border-t border-outline-variant/60 flex flex-col gap-0.5">
              <div className="px-2 pb-1 text-[9px] font-bold text-on-surface-variant uppercase tracking-wider truncate">
                Admin
              </div>
              {adminNavItems.map((item) => (
                <m3e-nav-item
                  key={item.id}
                  selected={activeTab === item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="cursor-pointer"
                >
                  <m3e-icon slot="icon" name={item.icon}></m3e-icon>
                  <span className="flex items-center justify-between w-full min-w-0 pr-1 text-xs">
                    <span className="truncate">{item.label}</span>
                    {Boolean(item.badge && item.badge > 0) && (
                      <m3e-badge className="ml-1 shrink-0">{item.badge}</m3e-badge>
                    )}
                  </span>
                </m3e-nav-item>
              ))}
            </div>
          )}
        </m3e-nav-rail>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: reduced width by half to w-36 (144px) */}
      <aside className="hidden md:block w-36 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-150"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-36 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-150">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

export default AppSidebar;
