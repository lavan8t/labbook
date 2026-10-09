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
      <div className="px-6 py-5 border-b border-outline-variant/60 flex items-center justify-between shrink-0">
        <span className="text-xl font-bold tracking-tight text-on-surface">
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

      {/* Account Info with Grouped Button & Separated Right Dropdown Arrow */}
      <div className="mx-4 my-4 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <m3e-avatar className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs bg-primary text-on-primary shrink-0">
            {currentUser.avatar_initials}
          </m3e-avatar>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-on-surface truncate">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-on-surface-variant truncate">
              {currentUser.role_display}
            </div>
          </div>
        </div>

        {/* Grouped split button with right dropdown arrow separated from m3e repo */}
        <m3e-split-button variant="tonal" size="small" className="shrink-0">
          <m3e-button
            slot="leading-button"
            onClick={() => {
              onOpenUserModal();
              if (onCloseMobile) onCloseMobile();
            }}
            className="text-xs px-2"
            title="Switch User"
          >
            Switch
          </m3e-button>
          <m3e-icon-button
            slot="trailing-button"
            onClick={() => {
              onOpenUserModal();
              if (onCloseMobile) onCloseMobile();
            }}
            aria-label="Switch User"
            title="Switch User"
          >
            <m3e-icon name="arrow_drop_down"></m3e-icon>
          </m3e-icon-button>
        </m3e-split-button>
      </div>

      {/* Navigation Rail from m3e repository */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <m3e-nav-rail mode="expanded" className="w-full flex flex-col gap-1">
          {standardNavItems.map((item) => (
            <m3e-nav-item
              key={item.id}
              selected={activeTab === item.id}
              onClick={() => handleNavClick(item.id)}
              className="cursor-pointer"
            >
              <m3e-icon slot="icon" name={item.icon}></m3e-icon>
              <span className="flex items-center justify-between w-full pr-2">
                <span>{item.label}</span>
                {Boolean(item.badge && item.badge > 0) && (
                  <m3e-badge className="ml-auto">{item.badge}</m3e-badge>
                )}
              </span>
            </m3e-nav-item>
          ))}

          {isAdmin && (
            <div className="pt-4 mt-3 border-t border-outline-variant/60 flex flex-col gap-1">
              <div className="px-4 pb-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                Administration
              </div>
              {adminNavItems.map((item) => (
                <m3e-nav-item
                  key={item.id}
                  selected={activeTab === item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="cursor-pointer"
                >
                  <m3e-icon slot="icon" name={item.icon}></m3e-icon>
                  <span className="flex items-center justify-between w-full pr-2">
                    <span>{item.label}</span>
                    {Boolean(item.badge && item.badge > 0) && (
                      <m3e-badge className="ml-auto">{item.badge}</m3e-badge>
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
      {/* Desktop Sidebar: spacious w-72 (less compact) */}
      <aside className="hidden md:block w-72 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

export default AppSidebar;
