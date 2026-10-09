import type { TimeSlotDef, BookingSpan } from "../types/timetable";

export const TIMETABLE_START_HOUR = 8;
export const TIMETABLE_END_HOUR = 21;
export const SLOT_DURATION_MINUTES = 30;
export const TOTAL_SLOTS = (TIMETABLE_END_HOUR - TIMETABLE_START_HOUR) * 2; // 26 slots

export function generateTimeSlots(): TimeSlotDef[] {
  const slots: TimeSlotDef[] = [];
  let index = 0;
  for (let hour = TIMETABLE_START_HOUR; hour < TIMETABLE_END_HOUR; hour++) {
    for (const minute of [0, 30]) {
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      slots.push({ slotIndex: index++, time, label: time, hour, minute });
    }
  }
  return slots;
}

export function formatDateDDMMYYYY(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return "";
  if (typeof dateVal === "string") {
    const isoMatch = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
  }
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (d instanceof Date && !isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return String(dateVal);
}

export function formatTimeRailway(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return "";
  if (typeof dateVal === "string") {
    const timeMatch = dateVal.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
    }
  }
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (d instanceof Date && !isNaN(d.getTime())) {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  return String(dateVal);
}

export function timeToSlotIndex(timeStr: string): number {
  if (!timeStr) return -1;
  let cleanTime = timeStr;
  if (cleanTime.includes("T")) {
    cleanTime = cleanTime.split("T")[1];
  } else if (cleanTime.includes(" ")) {
    const parts = cleanTime.split(" ");
    cleanTime = parts[1] || parts[0];
  }
  const [hStr, mStr] = cleanTime.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return -1;
  const minutesFromStart = (h - TIMETABLE_START_HOUR) * 60 + m;
  if (minutesFromStart < 0) return -1;
  return Math.floor(minutesFromStart / SLOT_DURATION_MINUTES);
}

export function formatSlotTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseIsoParts(isoStr: string): { date: string; minutes: number } | null {
  if (!isoStr) return null;
  const match = isoStr.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})/);
  if (match) {
    const date = match[1];
    const hour = parseInt(match[2], 10);
    const minute = parseInt(match[3], 10);
    return { date, minutes: hour * 60 + minute };
  }
  const d = new Date(isoStr);
  if (!isNaN(d.getTime())) {
    return {
      date: d.toISOString().split("T")[0],
      minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
    };
  }
  return null;
}

export function getBookingSpan(startIso: string, endIso: string, targetDateStr: string): BookingSpan {
  const startParts = parseIsoParts(startIso);
  const endParts = parseIsoParts(endIso);

  if (!startParts || !endParts) {
    return { startSlot: -1, spanSlots: 0, isVisible: false, clampedStart: false, clampedEnd: false };
  }

  // Filter if not overlapping target date
  if (startParts.date !== targetDateStr && endParts.date !== targetDateStr) {
    return { startSlot: -1, spanSlots: 0, isVisible: false, clampedStart: false, clampedEnd: false };
  }

  const timetableStartMinutes = TIMETABLE_START_HOUR * 60; // 480 (08:00)
  const timetableEndMinutes = TIMETABLE_END_HOUR * 60; // 1260 (21:00)

  let startMinutes = startParts.minutes;
  let endMinutes = endParts.minutes;

  if (startParts.date < targetDateStr) {
    startMinutes = 0;
  }
  if (endParts.date > targetDateStr) {
    endMinutes = 24 * 60;
  }

  if (endMinutes <= timetableStartMinutes || startMinutes >= timetableEndMinutes) {
    return { startSlot: -1, spanSlots: 0, isVisible: false, clampedStart: false, clampedEnd: false };
  }

  const clampedStartMin = Math.max(timetableStartMinutes, startMinutes);
  const clampedEndMin = Math.min(timetableEndMinutes, endMinutes);

  const startSlot = Math.floor((clampedStartMin - timetableStartMinutes) / SLOT_DURATION_MINUTES);
  const endSlot = Math.ceil((clampedEndMin - timetableStartMinutes) / SLOT_DURATION_MINUTES);
  const spanSlots = Math.max(1, endSlot - startSlot);

  return {
    startSlot,
    spanSlots,
    isVisible: true,
    clampedStart: startMinutes < timetableStartMinutes,
    clampedEnd: endMinutes > timetableEndMinutes,
  };
}
