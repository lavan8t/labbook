import type { DbState } from "@/data/schema";

export interface DivisionResult {
  eligible: boolean;
  requiredQualificationIds: number[];
  userQualificationIds: number[];
  missingQualificationIds: number[];
}

export function evaluateQualificationDivision(
  db: DbState,
  targetUserId: number,
  targetResourceId: number
): DivisionResult {
  const requiredQualificationIds = db.equipment_requirements
    .filter((r) => r.resource_id === targetResourceId)
    .map((r) => r.qualification_id);

  const userQualificationIds = db.user_qualifications
    .filter((u) => u.user_id === targetUserId && u.status === "VERIFIED")
    .map((u) => u.qualification_id);

  const userSet = new Set(userQualificationIds);
  const missingQualificationIds = requiredQualificationIds.filter(
    (id) => !userSet.has(id)
  );

  return {
    eligible: missingQualificationIds.length === 0,
    requiredQualificationIds,
    userQualificationIds,
    missingQualificationIds,
  };
}

export interface RangeConflict {
  conflict: boolean;
  bookingId?: number;
  interval?: string;
}

export function checkRangeConflict(
  db: DbState,
  targetResourceId: number,
  targetStart: string,
  targetEnd: string
): RangeConflict {
  const start = new Date(targetStart).getTime();
  const end = new Date(targetEnd).getTime();

  const hit = db.bookings.find((b) => {
    if (b.resource_id !== targetResourceId || b.status !== "CONFIRMED") return false;
    const bStart = new Date(b.start_datetime).getTime();
    const bEnd = new Date(b.end_datetime).getTime();
    return start < bEnd && end > bStart;
  });

  if (!hit) return { conflict: false };
  return {
    conflict: true,
    bookingId: hit.booking_id,
    interval: `[${hit.start_datetime}, ${hit.end_datetime})`,
  };
}
