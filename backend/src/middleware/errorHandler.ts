import type { Request, Response, NextFunction } from "express";

export interface CustomError extends Error {
  code?: string;
  status?: number;
  detail?: string;
  constraint?: string;
}

export function errorHandler(
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message || err);

  // PostgreSQL Error Codes
  // 23P01: exclusion_violation (GiST Temporal Slot Conflict)
  if (err.code === "23P01") {
    return res.status(409).json({
      success: false,
      error: "Slot Conflict: The requested auditorium/lecture hall is already booked or undergoing maintenance during this time range.",
      code: "SLOT_EXCLUSION_VIOLATION",
      detail: err.detail,
    });
  }

  // 23505: unique_violation
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      error: "Duplicate Resource: A record with this unique identifier already exists.",
      code: "UNIQUE_VIOLATION",
      detail: err.detail,
    });
  }

  // 23503: foreign_key_violation
  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      error: "Invalid Reference: Referenced user, venue, or event does not exist.",
      code: "FOREIGN_KEY_VIOLATION",
      detail: err.detail,
    });
  }

  // 23514: check_violation
  if (err.code === "23514") {
    return res.status(400).json({
      success: false,
      error: `Validation Constraint Failed: ${err.message}`,
      code: "CHECK_VIOLATION",
    });
  }

  // Stored procedure exceptions (PL/pgSQL RAISE EXCEPTION)
  if (err.message && err.message.includes("Slot Conflict:")) {
    return res.status(409).json({
      success: false,
      error: err.message,
      code: "SLOT_CONFLICT",
    });
  }

  if (err.message && err.message.includes("Authorization Error:")) {
    return res.status(403).json({
      success: false,
      error: err.message,
      code: "AUTHORIZATION_DENIED",
    });
  }

  const statusCode = err.status || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
}
