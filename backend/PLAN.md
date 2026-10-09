# Step-by-Step Implementation Plan: Node.js & Express Backend for CampusBook

**Target:** Build a lightweight, modular REST API using Node.js and Express that connects to the PostgreSQL `campusbook` database and interfaces with the Next.js frontend.

---

## 1. Architecture & Technology Stack
- **Runtime:** Node.js (v18+ or Bun)
- **Framework:** Express.js 4.x
- **Database Driver:** `pg` (node-postgres connection pool)
- **Middleware:** `cors` (cross-origin resource sharing for Next.js on port 3000), `dotenv` (environment variables), `morgan` (HTTP request logging)
- **Default Backend Port:** `5000` (Frontend runs on `3000`)

---

## 2. Directory Structure to Build
```
backend/
├── database/
│   └── schema.sql              # Database DDL, stored procedures & seed data
├── src/
│   ├── config/
│   │   └── db.js               # PostgreSQL connection pool (pg.Pool)
│   ├── controllers/
│   │   ├── venueController.js  # Venue catalog, availability search, schedules
│   │   ├── bookingController.js# Create booking, view user bookings, cancel
│   │   └── adminController.js  # Pending approvals queue, inspect clashes, approve/reject
│   ├── routes/
│   │   ├── venueRoutes.js      # /api/venues
│   │   ├── bookingRoutes.js    # /api/bookings
│   │   └── adminRoutes.js      # /api/admin
│   ├── middleware/
│   │   └── errorHandler.js     # Catches PostgreSQL GiST exclusion errors (409) & format responses
│   └── server.js               # Main Express app, CORS configuration, route mounts
├── .env.example                # Config template
├── .env                        # Local database credentials
├── package.json
└── README.md
```

---

## 3. Step-by-Step Implementation Phases

### Phase 1: Project Initialization & Dependencies
- [ ] Initialize `backend/package.json` with scripts (`start`, `dev`).
- [ ] Install dependencies: `express`, `pg`, `dotenv`, `cors`, `morgan`.
- [ ] Install dev dependency: `nodemon` (for hot reloading).
- [ ] Create `.env` file pointing to `campusbook` database on `localhost:5432`.

### Phase 2: Database Connection Pool (`src/config/db.js`)
- [ ] Configure `pg.Pool` with connection parameters from `.env`.
- [ ] Implement query helper method with execution logging.
- [ ] Add an automatic connection health test on server startup.

### Phase 3: Centralized Error Handler Middleware (`src/middleware/errorHandler.js`)
- [ ] Catch PostgreSQL error code `23P01` (`exclusion_violation`) and return HTTP `409 Conflict` with clear message: *"Slot is already confirmed by another reservation"*.
- [ ] Catch foreign key violations (`23503`) and check constraint violations (`23514`).
- [ ] Standardize error responses `{ success: false, error: "..." }`.

### Phase 4: Venue API Routes & Controller (`/api/venues`)
- [ ] `GET /api/venues`: Return all venues with filters (`type`, `min_capacity`, `has_ac`).
- [ ] `GET /api/venues/:id`: Return single venue details and amenities.
- [ ] `GET /api/venues/:id/schedule`: Return confirmed reservations and maintenance blackout intervals for calendar rendering.
- [ ] `GET /api/venues/available`: Execute the available-slot query to find free halls between `?start=...&end=...`.

### Phase 5: Booking API Routes & Controller (`/api/bookings`)
- [ ] `POST /api/bookings`:
  - Validate input (`venue_id`, `user_id`, `event_details`, `start_time`, `end_time`).
  - Run **Relational Division** query to check if the user holds required authorizations for the venue. If missing, return `403 Forbidden` with missing credential names.
  - Insert booking in `PENDING` state with generated reference number (e.g., `BK-2026-004`).
- [ ] `GET /api/bookings/my`: Return past and active bookings for the logged-in user (`?user_id=X`).
- [ ] `DELETE /api/bookings/:id`: Allow requesters to cancel their own `PENDING` or `CONFIRMED` booking before the start time.

### Phase 6: Admin API Routes & Controller (`/api/admin`)
- [ ] `GET /api/admin/pending`: Retrieve pending approval queue sorted by urgency, showing requester role, club/department name, and competing pending count.
- [ ] `GET /api/admin/clashes/:id`: Run the slot clash inspector query returning all bookings competing with request `:id`.
- [ ] `POST /api/admin/approve/:id`:
  - Call stored procedure `CALL sp_approve_booking(p_booking_id, p_admin_id, p_remarks)` inside a transaction.
  - Returns `200 OK` with confirmed booking and list of automatically rejected competing requests.
  - If a GiST conflict occurs, catches and returns `409 Conflict`.
- [ ] `POST /api/admin/reject/:id`:
  - Call stored procedure `CALL sp_reject_booking(p_booking_id, p_admin_id, p_remarks)`.
- [ ] `GET /api/admin/reports/utilization`: Return monthly utilization rate percentage per auditorium.

### Phase 7: Server Entrypoint & CORS (`src/server.js`)
- [ ] Configure Express app with `express.json()`.
- [ ] Configure `cors` to allow requests from `http://localhost:3000`.
- [ ] Mount routes: `/api/venues`, `/api/bookings`, `/api/admin`.
- [ ] Add health-check endpoint: `GET /api/health`.

### Phase 8: Verification & API Testing
- [ ] Test health check and database ping via `curl` / browser.
- [ ] Test booking submission by Normal User (Faculty & Club Head).
- [ ] Test relational division rejection when user lacks required authorization.
- [ ] Test Admin approval: verify Booking becomes `CONFIRMED` and competing request is auto-rejected.
- [ ] Test GiST exclusion: verify database directly prevents double-booking.

### Phase 9: Connect Frontend to Backend
- [ ] Create API client service in frontend (`src/lib/api.ts` or `app/lib/api.ts`).
- [ ] Replace simulated in-memory state with live `fetch` calls to backend endpoints (`http://localhost:5000/api`).
- [ ] Wire up booking submission form, venue schedule calendar, and admin approval buttons.
