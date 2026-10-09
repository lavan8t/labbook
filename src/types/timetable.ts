export interface TimeSlotDef {
  slotIndex: number;
  time: string; // e.g. "08:00"
  label: string; // e.g. "8:00 AM"
  hour: number;
  minute: number;
}

export interface BookingSpan {
  startSlot: number;
  spanSlots: number;
  isVisible: boolean;
  clampedStart: boolean;
  clampedEnd: boolean;
}
