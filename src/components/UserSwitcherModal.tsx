"use client";

import React, { useState, useEffect, useRef } from "react";
import { APP_USERS, ADMIN_ACCESS_CODE, type CampusUser } from "@/data/schema";

import "@m3e/web/dialog";
import "@m3e/web/card";
import "@m3e/web/avatar";
import "@m3e/web/button";
import "@m3e/web/form-field";
import "@m3e/web/icon";
import "@m3e/web/badge";

export interface UserSwitcherModalProps {
  // Modal 1: Persona Switcher
  open?: boolean;
  isOpen?: boolean;
  showUserModal?: boolean;
  onClose?: () => void;
  setShowUserModal?: (show: boolean) => void;
  currentUser: CampusUser;
  onSelectUser?: (user: CampusUser) => void;
  handleSelectUser?: (user: CampusUser) => void;
  setCurrentUser?: (user: CampusUser) => void;
  users?: CampusUser[];

  // Modal 2: Admin PIN Verification Dialog
  showAdminCodeModal?: boolean;
  isAdminModalOpen?: boolean;
  setShowAdminCodeModal?: (show: boolean) => void;
  onCloseAdminModal?: () => void;
  adminCodeInput?: string;
  setAdminCodeInput?: (code: string) => void;
  adminCodeError?: string;
  setAdminCodeError?: (error: string) => void;
  onVerifyAdminCode?: () => void;
  handleVerifyAdminCode?: () => void;
}

export default function UserSwitcherModal({
  open,
  isOpen,
  showUserModal,
  onClose,
  setShowUserModal,
  currentUser,
  onSelectUser,
  handleSelectUser,
  setCurrentUser,
  users = APP_USERS,
  showAdminCodeModal,
  isAdminModalOpen,
  setShowAdminCodeModal,
  onCloseAdminModal,
  adminCodeInput,
  setAdminCodeInput,
  adminCodeError,
  setAdminCodeError,
  onVerifyAdminCode,
  handleVerifyAdminCode,
}: UserSwitcherModalProps) {
  const [internalUserModalOpen, setInternalUserModalOpen] = useState(false);
  const [internalAdminModalOpen, setInternalAdminModalOpen] = useState(false);
  const [internalCodeInput, setInternalCodeInput] = useState("");
  const [internalCodeError, setInternalCodeError] = useState("");

  const isUserModalOpen = showUserModal ?? open ?? isOpen ?? internalUserModalOpen;
  const isAdminPinOpen = showAdminCodeModal ?? isAdminModalOpen ?? internalAdminModalOpen;

  const codeValue = adminCodeInput ?? internalCodeInput;
  const errorValue = adminCodeError ?? internalCodeError;

  const userDialogRef = useRef<HTMLElement>(null);
  const adminDialogRef = useRef<HTMLElement>(null);

  // Synchronize modal state with native m3e-dialog Web Component
  useEffect(() => {
    const el = userDialogRef.current as (HTMLElement & { show?: () => void; hide?: () => void; open?: boolean }) | null;
    if (el) {
      if (isUserModalOpen) {
        el.open = true;
        el.show?.();
        el.setAttribute("open", "");
      } else {
        el.open = false;
        el.hide?.();
        el.removeAttribute("open");
      }
    }
  }, [isUserModalOpen]);

  useEffect(() => {
    const el = adminDialogRef.current as (HTMLElement & { show?: () => void; hide?: () => void; open?: boolean }) | null;
    if (el) {
      if (isAdminPinOpen) {
        el.open = true;
        el.show?.();
        el.setAttribute("open", "");
      } else {
        el.open = false;
        el.hide?.();
        el.removeAttribute("open");
      }
    }
  }, [isAdminPinOpen]);

  const handleUserModalClose = () => {
    if (onClose) onClose();
    if (setShowUserModal) setShowUserModal(false);
    setInternalUserModalOpen(false);
  };

  const handleAdminModalClose = () => {
    if (onCloseAdminModal) onCloseAdminModal();
    if (setShowAdminCodeModal) setShowAdminCodeModal(false);
    setInternalAdminModalOpen(false);
    handleCodeChange("");
    handleErrorChange("");
  };

  const handleCodeChange = (val: string) => {
    if (setAdminCodeInput) setAdminCodeInput(val);
    else setInternalCodeInput(val);

    if (setAdminCodeError) setAdminCodeError("");
    else setInternalCodeError("");
  };

  const handleErrorChange = (val: string) => {
    if (setAdminCodeError) setAdminCodeError(val);
    else setInternalCodeError(val);
  };

  const handleUserClick = (targetUser: CampusUser) => {
    if (handleSelectUser) {
      handleSelectUser(targetUser);
      return;
    }
    if (onSelectUser) {
      onSelectUser(targetUser);
      return;
    }

    if (targetUser.user_type === "admin") {
      handleUserModalClose();
      handleCodeChange("");
      handleErrorChange("");
      if (setShowAdminCodeModal) setShowAdminCodeModal(true);
      else setInternalAdminModalOpen(true);
    } else {
      if (setCurrentUser) setCurrentUser(targetUser);
      handleUserModalClose();
    }
  };

  const handleAuthorize = () => {
    if (handleVerifyAdminCode) {
      handleVerifyAdminCode();
      return;
    }
    if (onVerifyAdminCode) {
      onVerifyAdminCode();
      return;
    }

    if (codeValue.trim() === ADMIN_ACCESS_CODE) {
      const adminUser = users.find((u) => u.user_type === "admin") || APP_USERS.find((u) => u.user_type === "admin");
      if (adminUser && setCurrentUser) {
        setCurrentUser(adminUser);
      }
      handleAdminModalClose();
    } else {
      handleErrorChange("Incorrect administrator security passcode.");
    }
  };

  return (
    <>
      {/* 1. User Persona Selection Dialog */}
      <m3e-dialog
        ref={userDialogRef}
        open={isUserModalOpen || undefined}
        dismissible
        onclosed={handleUserModalClose}
      >
        <div slot="header" className="flex justify-between items-center w-full">
          <span className="text-base font-bold text-on-surface">Switch Active Persona</span>
          <m3e-button
            variant="text"
            onClick={handleUserModalClose}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <m3e-icon>close</m3e-icon>
          </m3e-button>
        </div>

        <div className="py-2 space-y-3">
          <p className="text-xs text-on-surface-variant">
            Select a user persona to test role-based permissions, credential verification, and administrative approvals:
          </p>

          <div className="space-y-3 pt-1">
            {users.map((user) => {
              const isSelected = currentUser.user_id === user.user_id;
              return (
                <m3e-card
                  key={user.user_id}
                  variant="outlined"
                  onClick={() => handleUserClick(user)}
                  className={`block rounded-lg transition-colors cursor-pointer border ${
                    isSelected
                      ? "border-primary bg-primary-container/20"
                      : "border-outline-variant hover:bg-surface-container"
                  }`}
                >
                  <div className="p-3.5 flex items-start gap-3">
                    <m3e-avatar className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs bg-primary text-on-primary shrink-0">
                      {user.avatar_initials}
                    </m3e-avatar>

                    <div className="flex-1 text-xs">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-on-surface">{user.name}</span>
                        {user.user_type === "admin" && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-error-container text-on-error-container font-semibold flex items-center gap-1 shrink-0">
                            <m3e-icon className="text-xs">lock</m3e-icon>
                            Administrator Verification Required
                          </span>
                        )}
                      </div>

                      <div className="text-on-surface-variant mt-0.5">{user.role_display}</div>
                      <div className="text-[11px] text-on-surface-variant/80 mt-1">
                        Credentials: {user.credentials.join(", ")}
                      </div>
                    </div>
                  </div>
                </m3e-card>
              );
            })}
          </div>
        </div>

        <div slot="actions" className="flex items-center justify-end w-full pt-3">
          <m3e-button variant="outlined" onClick={handleUserModalClose}>
            Cancel
          </m3e-button>
        </div>
      </m3e-dialog>

      {/* 2. Admin PIN Verification Dialog (Zero Password Hints) */}
      <m3e-dialog
        ref={adminDialogRef}
        open={isAdminPinOpen || undefined}
        dismissible
        onclosed={handleAdminModalClose}
      >
        <div slot="header" className="flex items-center gap-2">
          <m3e-icon className="text-primary text-xl">lock</m3e-icon>
          <span className="text-base font-bold text-on-surface">
            Administrator Access Verification
          </span>
        </div>

        <div className="py-3">
          <p className="text-xs text-on-surface-variant mb-4">
            Switching to <strong>Dr. A. Ramanathan (Estate Office)</strong> requires administrator authorization.
          </p>

          <div className="mb-2">
            <m3e-form-field
              label="Administrator Passcode"
              variant="outlined"
              className="w-full"
            >
              <label slot="label">Administrator Passcode</label>
              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="Enter passcode"
                value={codeValue}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAuthorize();
                }}
                className="w-full text-center tracking-widest text-base font-mono bg-transparent text-on-surface focus:outline-none"
              />
            </m3e-form-field>
            {errorValue && (
              <p className="text-[11px] text-error mt-1.5 text-center font-medium">
                {errorValue}
              </p>
            )}
          </div>
        </div>

        <div slot="actions" className="flex items-center justify-end gap-2 w-full pt-2">
          <m3e-button variant="outlined" onClick={handleAdminModalClose}>
            Cancel
          </m3e-button>
          <m3e-button variant="filled" onClick={handleAuthorize}>
            Authorize
          </m3e-button>
        </div>
      </m3e-dialog>
    </>
  );
}
