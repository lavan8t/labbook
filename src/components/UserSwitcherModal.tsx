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
  open: boolean;
  onClose: () => void;
  currentUser: CampusUser;
  onSelectUser: (user: CampusUser) => void;
  users?: CampusUser[];

  // Modal 2: Admin PIN Verification Dialog
  showAdminCodeModal?: boolean;
  onCloseAdminModal?: () => void;
  adminCodeInput?: string;
  setAdminCodeInput?: (code: string) => void;
  adminCodeError?: string;
  setAdminCodeError?: (error: string) => void;
  onVerifyAdminCode?: () => void;
  adminPasscode?: string;
}

export default function UserSwitcherModal({
  open,
  onClose,
  currentUser,
  onSelectUser,
  users = APP_USERS,
  showAdminCodeModal = false,
  onCloseAdminModal,
  adminCodeInput,
  setAdminCodeInput,
  adminCodeError,
  setAdminCodeError,
  onVerifyAdminCode,
  adminPasscode,
}: UserSwitcherModalProps) {
  const [internalCodeInput, setInternalCodeInput] = useState("");
  const [internalCodeError, setInternalCodeError] = useState("");

  const isUserModalOpen = open;
  const isAdminPinOpen = showAdminCodeModal;

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
  };

  const handleAdminModalClose = () => {
    if (onCloseAdminModal) onCloseAdminModal();
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
    onSelectUser(targetUser);
  };

  const handleAuthorize = () => {
    if (onVerifyAdminCode) {
      onVerifyAdminCode();
      return;
    }

    const expectedCode = adminPasscode ?? ADMIN_ACCESS_CODE;
    if (codeValue.trim() === expectedCode) {
      const adminUser = users.find((u) => u.user_type === "admin") || APP_USERS.find((u) => u.user_type === "admin");
      if (adminUser) {
        onSelectUser(adminUser);
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
        <span slot="header" className="text-base font-bold text-on-surface">
          Switch Active Persona
        </span>

        <div className="py-2 space-y-3">
          <div className="space-y-3 pt-1">
            {users.map((user) => {
              const isSelected = currentUser.user_id === user.user_id;
              return (
                <div
                  key={user.user_id}
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
                            <m3e-icon name="lock" className="text-xs"></m3e-icon>
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
                </div>
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
          <m3e-icon name="lock" className="text-primary text-xl"></m3e-icon>
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
