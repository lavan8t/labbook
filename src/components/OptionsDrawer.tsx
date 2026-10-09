"use client";

import React, { useState } from "react";

import "@m3e/web/button";
import "@m3e/web/icon";
import "@m3e/web/card";
import "@m3e/web/badge";

export interface OptionsDrawerProps {
  open: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSyncDb: () => void;
  syncLoading?: boolean;
  backendOnline?: boolean;
  adminPasscode: string;
  onUpdateAdminPasscode: (newPasscode: string) => void;
}

export function OptionsDrawer({
  open,
  onClose,
  theme,
  onToggleTheme,
  onSyncDb,
  syncLoading = false,
  backendOnline = false,
  adminPasscode,
  onUpdateAdminPasscode,
}: OptionsDrawerProps) {
  const [currentCodeInput, setCurrentCodeInput] = useState("");
  const [newCodeInput, setNewCodeInput] = useState("");
  const [confirmCodeInput, setConfirmCodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [passcodeSuccess, setPasscodeSuccess] = useState("");
  const [showPasscodes, setShowPasscodes] = useState(false);

  if (!open) return null;

  const handleUpdatePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError("");
    setPasscodeSuccess("");

    if (!currentCodeInput) {
      setPasscodeError("Please enter your current administrator passcode.");
      return;
    }

    if (currentCodeInput.trim() !== adminPasscode) {
      setPasscodeError("Current passcode is incorrect. Verification failed.");
      return;
    }

    if (newCodeInput.trim().length < 4) {
      setPasscodeError("New passcode must be at least 4 characters long.");
      return;
    }

    if (newCodeInput.trim() !== confirmCodeInput.trim()) {
      setPasscodeError("New passcode and confirmation do not match.");
      return;
    }

    onUpdateAdminPasscode(newCodeInput.trim());
    setPasscodeSuccess("Administrator passcode updated successfully!");
    setCurrentCodeInput("");
    setNewCodeInput("");
    setConfirmCodeInput("");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-150 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        className="relative w-full max-w-sm sm:max-w-md bg-surface text-on-surface h-full shadow-2xl border-l border-outline-variant flex flex-col z-10 animate-in slide-in-from-right duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Options"
      >
        {/* Header */}
        <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <m3e-icon name="tune" className="text-primary text-xl"></m3e-icon>
            <h2 className="text-base font-bold text-on-surface">Options</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label="Close Options"
          >
            <m3e-icon name="close"></m3e-icon>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Section 1: Appearance & Theme */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <m3e-icon name="palette" className="text-primary text-base"></m3e-icon>
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Appearance
              </h3>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface font-medium">Theme Mode</span>
                <span className="text-on-surface-variant capitalize text-[11px] font-mono">
                  {theme} mode active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (theme !== "light") onToggleTheme();
                  }}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    theme === "light"
                      ? "bg-primary text-on-primary border-primary font-semibold shadow-xs"
                      : "bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container"
                  }`}
                >
                  <m3e-icon name="light_mode" className="text-base"></m3e-icon>
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (theme !== "dark") onToggleTheme();
                  }}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    theme === "dark"
                      ? "bg-primary text-on-primary border-primary font-semibold shadow-xs"
                      : "bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container"
                  }`}
                >
                  <m3e-icon name="dark_mode" className="text-base"></m3e-icon>
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </section>

          {/* Section 2: Database Sync */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <m3e-icon name="database" className="text-primary text-base"></m3e-icon>
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Database Synchronization
              </h3>
            </div>

            <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface font-medium">Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    backendOnline
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  <m3e-icon
                    name={backendOnline ? "cloud_done" : "cloud_off"}
                    className="text-xs"
                  ></m3e-icon>
                  <span>{backendOnline ? "PostgreSQL Connected" : "Offline Fallback"}</span>
                </span>
              </div>

              <m3e-button
                variant="filled"
                onClick={onSyncDb}
                disabled={syncLoading}
                className="w-full text-xs justify-center font-semibold"
              >
                <m3e-icon
                  slot="icon"
                  name="sync"
                  className={syncLoading ? "animate-spin" : ""}
                ></m3e-icon>
                {syncLoading ? "Syncing..." : "Sync DB"}
              </m3e-button>
            </div>
          </section>

          {/* Section 3: Change Password / Passcode */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <m3e-icon name="lock_reset" className="text-primary text-base"></m3e-icon>
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Change Passcode
              </h3>
            </div>

            <form
              onSubmit={handleUpdatePasscode}
              className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-3.5 space-y-3"
            >

              {passcodeError && (
                <div className="p-2.5 rounded-lg bg-error/10 border border-error/20 text-error text-[11px] flex items-start gap-2">
                  <m3e-icon name="error" className="text-sm shrink-0 mt-0.5"></m3e-icon>
                  <span>{passcodeError}</span>
                </div>
              )}

              {passcodeSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] flex items-start gap-2">
                  <m3e-icon name="check_circle" className="text-sm shrink-0 mt-0.5"></m3e-icon>
                  <span>{passcodeSuccess}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-on-surface block">
                  Current Passcode
                </label>
                <input
                  type={showPasscodes ? "text" : "password"}
                  value={currentCodeInput}
                  onChange={(e) => setCurrentCodeInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-on-surface block">
                  New Passcode
                </label>
                <input
                  type={showPasscodes ? "text" : "password"}
                  value={newCodeInput}
                  onChange={(e) => setNewCodeInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-on-surface block">
                  Confirm New Passcode
                </label>
                <input
                  type={showPasscodes ? "text" : "password"}
                  value={confirmCodeInput}
                  onChange={(e) => setConfirmCodeInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasscodes(!showPasscodes)}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  <m3e-icon
                    name={showPasscodes ? "visibility_off" : "visibility"}
                    className="text-sm"
                  ></m3e-icon>
                  <span>{showPasscodes ? "Hide Passcode" : "Show Passcode"}</span>
                </button>

                <m3e-button
                  variant="outlined"
                  type="submit"
                  className="text-xs"
                >
                  <m3e-icon slot="icon" name="key"></m3e-icon>
                  Update Passcode
                </m3e-button>
              </div>
            </form>
          </section>
        </div>
      </aside>
    </div>
  );
}

export default OptionsDrawer;
