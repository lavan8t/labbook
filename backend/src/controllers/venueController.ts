import type { Request, Response, NextFunction } from "express";
import { query } from "../config/db";

// GET /api/venues
export async function getAllVenues(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, min_capacity, has_ac } = req.query;

    let sql = `
      SELECT 
        v.venue_id,
        v.venue_name,
        v.venue_type,
        v.building,
        v.floor_number,
        v.seating_capacity,
        v.has_air_conditioning,
        v.projector_count,
        v.has_sound_system,
        v.has_smart_podium,
        v.venue_status,
        COALESCE(
          json_agg(
            json_build_object('auth_id', a.auth_id, 'auth_code', a.auth_code, 'auth_name', a.auth_name)
          ) FILTER (WHERE a.auth_id IS NOT NULL),
          '[]'
        ) AS required_authorizations
      FROM venues v
      LEFT JOIN venue_requirements vr ON v.venue_id = vr.venue_id
      LEFT JOIN authorizations a ON vr.auth_id = a.auth_id
      WHERE v.venue_status = 'ACTIVE'
    `;

    const params: any[] = [];

    if (type) {
      params.push(type);
      sql += ` AND v.venue_type = $${params.length}`;
    }

    if (min_capacity) {
      params.push(Number(min_capacity));
      sql += ` AND v.seating_capacity >= $${params.length}`;
    }

    if (has_ac !== undefined) {
      params.push(has_ac === "true");
      sql += ` AND v.has_air_conditioning = $${params.length}`;
    }

    sql += ` GROUP BY v.venue_id ORDER BY v.seating_capacity DESC`;

    const result = await query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
}

// GET /api/venues/:id
export async function getVenueById(req: Request, res: Response, next: NextFunction) {
  try {
    const venueId = Number(req.params.id);

    const venueResult = await query(
      `SELECT * FROM venues WHERE venue_id = $1`,
      [venueId]
    );

    if (venueResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Venue not found" });
    }

    const reqResult = await query(
      `SELECT a.auth_id, a.auth_code, a.auth_name, a.description, a.issuing_authority
       FROM venue_requirements vr
       JOIN authorizations a ON vr.auth_id = a.auth_id
       WHERE vr.venue_id = $1`,
      [venueId]
    );

    res.json({
      success: true,
      data: {
        ...venueResult.rows[0],
        required_authorizations: reqResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/venues/:id/schedule
export async function getVenueSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const venueId = Number(req.params.id);
    const { start, end } = req.query;

    const startDate = start ? new Date(String(start)) : new Date();
    const endDate = end ? new Date(String(end)) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const bookingsResult = await query(
      `SELECT 
        b.booking_id,
        b.booking_ref,
        b.start_datetime,
        b.end_datetime,
        b.booking_status,
        e.event_title,
        e.event_type,
        u.full_name AS organizer_name
       FROM bookings b
       JOIN events e ON b.event_id = e.event_id
       JOIN users u ON b.user_id = u.user_id
       WHERE b.venue_id = $1
         AND b.booking_status = 'CONFIRMED'
         AND b.start_datetime < $3
         AND b.end_datetime > $2
       ORDER BY b.start_datetime ASC`,
      [venueId, startDate, endDate]
    );

    const maintenanceResult = await query(
      `SELECT 
        maintenance_id,
        start_datetime,
        end_datetime,
        reason
       FROM venue_maintenance
       WHERE venue_id = $1
         AND start_datetime < $3
         AND end_datetime > $2
       ORDER BY start_datetime ASC`,
      [venueId, startDate, endDate]
    );

    res.json({
      success: true,
      data: {
        confirmed_bookings: bookingsResult.rows,
        maintenance_windows: maintenanceResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/venues/search/available
export async function searchAvailableVenues(req: Request, res: Response, next: NextFunction) {
  try {
    const { start, end, min_capacity, type } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: "Both 'start' and 'end' ISO datetime query parameters are required.",
      });
    }

    const params: any[] = [start, end];
    let sql = `
      SELECT v.venue_id, v.venue_name, v.venue_type, v.seating_capacity, v.building, v.floor_number
      FROM venues v
      WHERE v.venue_status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.venue_id = v.venue_id
            AND b.booking_status = 'CONFIRMED'
            AND tstzrange(b.start_datetime, b.end_datetime, '[)') && tstzrange($1::timestamptz, $2::timestamptz, '[)')
        )
        AND NOT EXISTS (
          SELECT 1 FROM venue_maintenance vm
          WHERE vm.venue_id = v.venue_id
            AND tstzrange(vm.start_datetime, vm.end_datetime, '[)') && tstzrange($1::timestamptz, $2::timestamptz, '[)')
        )
    `;

    if (min_capacity) {
      params.push(Number(min_capacity));
      sql += ` AND v.seating_capacity >= $${params.length}`;
    }

    if (type) {
      params.push(type);
      sql += ` AND v.venue_type = $${params.length}`;
    }

    sql += ` ORDER BY v.seating_capacity DESC`;

    const result = await query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
}
