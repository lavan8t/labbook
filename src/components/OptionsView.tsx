"use client";

import React, { useState } from "react";

import "@m3e/web/button";
import "@m3e/web/icon";
import "@m3e/web/card";

export interface OptionsViewProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSyncDb: () => void;
  syncLoading?: boolean;
  adminPasscode: string;
  onUpdateAdminPasscode: (newPasscode: string) => void;
}

export function OptionsView({
  theme,
  onToggleTheme,
  onSyncDb,
  syncLoading = false,
  adminPasscode,
  onUpdateAdminPasscode,
}: OptionsViewProps) {
  const [currentCodeInput, setCurrentCodeInput] = useState("");
  const [newCodeInput, setNewCodeInput] = useState("");
  const [confirmCodeInput, setConfirmCodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [passcodeSuccess, setPasscodeSuccess] = useState("");
  const [showPasscodes, setShowPasscodes] = useState(false);

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
    <div className="bg-surface rounded-xl border border-outline-variant p-6 sm:p-8 space-y-6 max-w-2xl">
      {/* Section 1: Appearance & Theme */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <m3e-icon name="palette" className="text-primary text-base"></m3e-icon>
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Appearance
          </span>
        </div>

        <m3e-card
          variant="outlined"
          className="block bg-surface-container-low border border-outline-variant/60 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface font-medium">Theme Mode</span>
            <span className="text-on-surface-variant capitalize text-[11px] font-mono">
              {theme} mode active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (theme !== "light") onToggleTheme();
              }}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
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
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                theme === "dark"
                  ? "bg-primary text-on-primary border-primary font-semibold shadow-xs"
                  : "bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container"
              }`}
            >
              <m3e-icon name="dark_mode" className="text-base"></m3e-icon>
              <span>Dark</span>
            </button>
          </div>
        </m3e-card>
      </section>

      {/* Section 2: Database Sync (without yellow fallback pill) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <m3e-icon name="database" className="text-primary text-base"></m3e-icon>
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Database Synchronization
          </span>
        </div>

        <m3e-card
          variant="outlined"
          className="block bg-surface-container-low border border-outline-variant/60 rounded-xl p-4 space-y-3"
        >
          <p className="text-xs text-on-surface-variant">
            Re-sync schema entities, venue inventories, and active bookings with the database backend.
          </p>

          <m3e-button
            variant="filled"
            onClick={onSyncDb}
            disabled={syncLoading}
            className="text-xs justify-center font-semibold"
          >
            <m3e-icon
              slot="icon"
              name="sync"
              className={syncLoading ? "animate-spin" : ""}
            ></m3e-icon>
            {syncLoading ? "Syncing..." : "Sync DB"}
          </m3e-button>
        </m3e-card>
      </section>

      {/* Section 3: Change Passcode */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <m3e-icon name="lock_reset" className="text-primary text-base"></m3e-icon>
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Change Passcode
          </span>
        </div>

        <form
          onSubmit={handleUpdatePasscode}
          className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-4 space-y-3"
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
              placeholder="Enter current passcode"
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:outline-hidden focus:border-primary"
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
              placeholder="Enter at least 4 digits/characters"
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:outline-hidden focus:border-primary"
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
              placeholder="Re-enter new passcode"
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:outline-hidden focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPasscodes}
                onChange={(e) => setShowPasscodes(e.target.checked)}
                className="rounded border-outline-variant"
              />
              <span>Show passcodes</span>
            </label>

            <m3e-button
              type="submit"
              variant="filled"
              className="text-xs px-4 font-semibold"
            >
              Update Passcode
            </m3e-button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default OptionsView;
