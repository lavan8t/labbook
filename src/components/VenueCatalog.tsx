"use client";

import React from "react";
import type { CampusUser } from "@/data/schema";
import type { Venue } from "@/lib/api";

import "@m3e/web/card";
import "@m3e/web/chips";
import "@m3e/web/badge";
import "@m3e/web/button";
import "@m3e/web/icon";

export interface VenueCatalogProps {
  venues: Venue[];
  currentUser?: CampusUser;
  selectedVenueId?: number;
  onSelectVenue?: (venueId: number) => void;
  onRequestVenue?: (venueId: number) => void;
}

export function VenueCatalog({
  venues,
  currentUser,
  selectedVenueId,
  onSelectVenue,
  onRequestVenue,
}: VenueCatalogProps) {
  const handleRequestVenue = (venueId: number) => {
    if (onRequestVenue) {
      onRequestVenue(venueId);
    } else if (onSelectVenue) {
      onSelectVenue(venueId);
    }
  };

  const userCredsText = (currentUser?.credentials || []).join(" ").toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-base font-bold text-on-surface">Campus Venues Master Catalog</h2>
          <p className="text-xs text-on-surface-variant">
            Comprehensive overview of university auditoriums, mini-audis, and smart lecture halls.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {venues.map((venue) => {
          const isSelected =
            selectedVenueId !== undefined && Number(venue.venue_id) === Number(selectedVenueId);

          const hasClearances =
            !venue.required_authorizations ||
            venue.required_authorizations.length === 0 ||
            venue.required_authorizations.every((req) =>
              userCredsText.includes(req.auth_code.toUpperCase())
            );

          return (
            <m3e-card
              key={venue.venue_id}
              variant={isSelected ? "elevated" : "outlined"}
              className={`block rounded-lg border transition-colors ${
                isSelected
                  ? "bg-surface-container border-primary"
                  : "bg-surface-container-low border-outline-variant hover:border-primary"
              }`}
            >
              <div className="p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-surface-container-high text-on-surface-variant uppercase tracking-wider">
                      {venue.venue_type}
                    </span>
                    <m3e-badge size="large">
                      {venue.seating_capacity} Seats
                    </m3e-badge>
                  </div>

                  <h3 className="text-base font-bold text-on-surface mt-2.5">
                    {venue.venue_name}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {venue.building}, Floor {venue.floor_number}
                  </p>

                  {/* Equipped Amenities Chip Set */}
                  <div className="mt-4">
                    <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                      Equipped Amenities:
                    </span>
                    <m3e-chip-set>
                      {venue.has_air_conditioning && (
                        <m3e-assist-chip variant="outlined">
                          <m3e-icon slot="icon" name="ac_unit">ac_unit</m3e-icon>
                          Central AC
                        </m3e-assist-chip>
                      )}
                      {venue.projector_count > 0 && (
                        <m3e-assist-chip variant="outlined">
                          <m3e-icon slot="icon" name="videocam">videocam</m3e-icon>
                          {venue.projector_count} Projector{venue.projector_count > 1 ? "s" : ""}
                        </m3e-assist-chip>
                      )}
                      {venue.has_sound_system && (
                        <m3e-assist-chip variant="outlined">
                          <m3e-icon slot="icon" name="volume_up">volume_up</m3e-icon>
                          Sound System
                        </m3e-assist-chip>
                      )}
                      {venue.has_smart_podium && (
                        <m3e-assist-chip variant="outlined">
                          <m3e-icon slot="icon" name="podium">podium</m3e-icon>
                          Smart Podium
                        </m3e-assist-chip>
                      )}
                    </m3e-chip-set>
                  </div>

                  {/* Mandatory Clearances Section */}
                  {venue.required_authorizations && venue.required_authorizations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-outline-variant">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                          Mandatory Clearances:
                        </span>
                        {currentUser && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              hasClearances
                                ? "bg-surface-container-high text-primary"
                                : "bg-error-container text-on-error-container"
                            }`}
                          >
                            {hasClearances ? "Eligible" : "Requires Permit"}
                          </span>
                        )}
                      </div>
                      <m3e-chip-set>
                        {venue.required_authorizations.map((auth) => (
                          <m3e-assist-chip key={auth.auth_id} variant="outlined">
                            <m3e-icon slot="icon" name="lock">lock</m3e-icon>
                            {auth.auth_name}
                          </m3e-assist-chip>
                        ))}
                      </m3e-chip-set>
                    </div>
                  )}
                </div>

                {/* Request Venue Action */}
                <div className="pt-3 border-t border-outline-variant">
                  <m3e-button
                    variant="tonal"
                    onClick={() => handleRequestVenue(Number(venue.venue_id))}
                    className="w-full"
                  >
                    <m3e-icon slot="icon" name="arrow_forward">arrow_forward</m3e-icon>
                    Request Venue
                  </m3e-button>
                </div>
              </div>
            </m3e-card>
          );
        })}
      </div>
    </div>
  );
}

export default VenueCatalog;
