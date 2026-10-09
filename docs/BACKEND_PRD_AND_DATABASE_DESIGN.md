# Backend Product Requirements Document (PRD) & Database Design Specification

**Project Title:** Campus Auditorium & Lecture Hall Reservation and Administrative Authorization System (CampusBook)  
**Target Environment:** PostgreSQL 16+, Node.js/Bun / Next.js backend (or Python/FastAPI / Spring Boot)  
**Academic Module:** BCSE302P – Database Systems Lab  
**Date:** October 2026  

---

## 1. Executive Summary & Product Overview

### 1.1 Purpose
The system manages campus auditoriums, mini-auditoriums, and smart lecture halls. It guarantees that high-capacity, high-demand university venues are booked strictly under verified authorizations, without scheduling conflicts, and with total auditability.

### 1.2 User Personas & Permissions
The system enforces a strict two-tier user access architecture:

1. **Normal Users:**
   - **Faculty Members:** Book lecture halls and auditoriums for combined lectures, examinations, departmental conferences, and guest speaker symposia.
   - **Student Club Heads:** Book auditoriums, mini-audis, and seminar halls for student-led workshops, hackathons, and cultural/technical fest activities.
   - *Capabilities:* Search venues, inspect slot availability, submit booking requests (`PENDING`), view status, attach required event details, and cancel their own bookings.
2. **Administrators (Estate Officers, Facilities Deans, Venue In-Charges):**
   - Oversee all campus auditoriums and lecture halls.
   - *Capabilities:* Review pending booking requests, verify user authorizations and event credentials, inspect slot availability and competing candidate applications, grant formal permits (`CONFIRM` bookings) or reject requests with recorded remarks, and schedule maintenance blackout periods.

---

## 2. Functional Requirements (FR)

### FR-1: Venue Catalog & Discovery
- The system must maintain a registry of all venues, categorizing them by type (`AUDITORIUM`, `MINI_AUDITORIUM`, `LECTURE_HALL`, `SEMINAR_HALL`), building location, seating capacity, and audio-visual/acoustic features.
- Users must be able to query venue availability across arbitrary timestamp intervals.

### FR-2: Booking Request Workflow
- Normal users submit requests with start timestamp, end timestamp, and event metadata.
- Submitted requests start in status `PENDING`.
- Normal users can only modify or cancel their own bookings before the scheduled start time.

### FR-3: Pre-requisite Authorization & Credential Verification
- Restrict sensitive venues (e.g., Grand Auditorium) to users who possess verified prerequisite credentials (e.g., "Dean Student Affairs Permit", "HoD Lecture Clearance", "AV Technician Clearance").
- Implemented using **relational division** at the database layer.

### FR-4: Administrative Vetting & Permit Granting
- Admins can view a prioritized queue of pending bookings with applicant details, event justification, and conflict indicators.
- Admin decision must be an atomic operation:
  - If approved, booking status transitions to `CONFIRMED`, an approval record is stored, and a digital permit reference is generated.
  - If rejected, booking status transitions to `REJECTED` with administrative remarks.

### FR-5: Concurrency Control & Slot Clash Prevention
- **Database Engine Enforcement:** The database engine must reject any two confirmed bookings that overlap in time on the same venue.
- **Race Condition Prevention:** The system must prevent race conditions where two administrators simultaneously approve competing requests for the same venue/slot.
- **Automatic Clash Cascade:** When a request is approved, competing pending requests for the same time window must be flagged or automatically transitioned to `REJECTED_CLASH`.

### FR-6: Maintenance & Emergency Blackout Windows
- Admins can declare maintenance blackout intervals on any venue.
- Blackout intervals must prevent any overlapping confirmed bookings.

### FR-7: Complete Auditability & Historical Reporting
- All state transitions, cancellations, approvals, and rejections must be immutably recorded with actor ID and timestamp.

---

## 3. Concurrency & Slot Clash Problem: Detailed Analysis & Database Solutions

Because this is a Database Systems project, the handling of concurrency and slot clashes is the architectural core.

### 3.1 The Failure of Naive Relational Approaches
A naive approach uses a simple table with a unique constraint:
```sql
-- NAIVE APPROACH (DOES NOT WORK FOR TIME RANGES)
CREATE TABLE naive_bookings (
    venue_id INT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    UNIQUE (venue_id, start_time) -- Fails!
);
```
**Why this fails:**
- If Booking 1 is `10:00 - 13:00` and Booking 2 is `11:30 - 14:00`, their start times are distinct (`10:00` vs `11:30`). The unique constraint passes, but the venue is **double-booked between 11:30 and 13:00**.
- If Booking 3 is `09:00 - 16:00`, it engulfs Booking 1 completely.
- Checking for conflicts in an application layer (`SELECT COUNT(*) ... WHERE start < new_end AND end > new_start`) is vulnerable to **race conditions** between the `SELECT` and `INSERT/UPDATE` steps unless explicit locks are used.

### 3.2 Architectural Solution 1: PostgreSQL GiST Range Exclusion (`btree_gist`)
PostgreSQL provides native range types (`tstzrange`), temporal operators (overlap `&&`, contains `@>`, adjacent `-|-`), and generalized search tree (GiST) indexing.

By enabling `btree_gist`, we can enforce exclusion constraints across both scalar equality and temporal overlap:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
ADD CONSTRAINT no_overlapping_confirmed_bookings
EXCLUDE USING gist (
    venue_id WITH =,
    tstzrange(start_datetime, end_datetime, '[)') WITH &&
)
WHERE (booking_status = 'CONFIRMED');
```

#### Why This Works:
1. `venue_id WITH =`: Ensures the constraint only applies to reservations for the **same venue**.
2. `tstzrange(start_datetime, end_datetime, '[)') WITH &&`: The `&&` operator detects if two intervals share any common points in time. The `[)` notation specifies closed start, open end (e.g., a booking ending at 12:00 allows another to start at exactly 12:00).
3. `WHERE (booking_status = 'CONFIRMED')`: **Conditional Partial Exclusion**. Multiple users can submit *pending* requests for the same time window, but only **one** booking can ever be transitioned to `CONFIRMED`.
4. Any attempt to insert or update a second overlapping booking to `CONFIRMED` raises a PostgreSQL exception (`exclusion_violation`, error code `23P01`), guaranteed at the database engine level.

---

### 3.3 Architectural Solution 2: Pessimistic Row Locking for Administrative Approvals
When an administrator reviews a booking request and clicks "Approve", another administrator might be approving a competing request for the same slot, or the user might be cancelling the booking.

To serialize concurrent approval decisions and prevent race conditions, the approval logic is encapsulated inside an atomic stored procedure using **pessimistic row locking** (`SELECT ... FOR UPDATE`):

```
Client Admin 1                           Client Admin 2
      │                                       │
      ▼                                       ▼
BEGIN TRANSACTION                       BEGIN TRANSACTION
SELECT ... FROM venues                  SELECT ... FROM venues
  WHERE venue_id = 1                      WHERE venue_id = 1
  FOR UPDATE; ───[Acquires Lock]          FOR UPDATE; ───[Blocks & Waits]
      │                                       │
Validate no confirmed conflicts               │
UPDATE booking #101 = 'CONFIRMED'             │
Auto-reject competing pending bookings        │
COMMIT; ─────[Releases Lock] ─────────────────┤
                                              ▼
                                        [Unblocks & Runs]
                                        Validate confirmed conflicts
                                        -> Finds booking #101 CONFIRMED!
                                        -> Aborts approval / returns conflict error
                                        ROLLBACK;
```

---

### 3.4 Architectural Solution 3: Automatic Cascade Rejection of Competing Pending Slots
When an administrator approves a booking request:
1. Booking $B_1$ becomes `CONFIRMED`.
2. All other pending requests $B_k$ for the same venue where:
   $$\text{Range}(B_k) \cap \text{Range}(B_1) \neq \emptyset$$
   are automatically updated to `REJECTED` with remark: *"Slot allocated to confirmed booking [Ref No]"*.
3. This is executed inside the exact same database transaction, ensuring no dangling conflicting pending requests remain.

---

## 4. Complete Database Design (PostgreSQL DDL)

Below is the production-ready PostgreSQL schema including all data types, check constraints, foreign keys, GiST exclusions, stored procedures, and triggers.

```sql
-- ============================================================================
-- CAMPUSBOOK: CAMPUS AUDITORIUM & LECTURE HALL BOOKING SYSTEM SCHEMA
-- ============================================================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Step 2: Custom Enum Types
CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'FACULTY', 'CLUB_HEAD');
CREATE TYPE venue_type_enum AS ENUM ('AUDITORIUM', 'MINI_AUDITORIUM', 'LECTURE_HALL', 'SEMINAR_HALL');
CREATE TYPE venue_status_enum AS ENUM ('ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED');
CREATE TYPE booking_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED');
CREATE TYPE approval_decision_enum AS ENUM ('APPROVED', 'REJECTED');
CREATE TYPE event_type_enum AS ENUM (
    'ACADEMIC_LECTURE',
    'GUEST_LECTURE',
    'SEMINAR',
    'CONFERENCE',
    'WORKSHOP',
    'HACKATHON',
    'CULTURAL_EVENT',
    'EXAMINATION'
);

-- ============================================================================
-- TABLE 1: ROLES
-- ============================================================================
CREATE TABLE roles (
    role_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_code user_role_enum NOT NULL UNIQUE,
    role_name VARCHAR(50) NOT NULL,
    description TEXT
);

INSERT INTO roles (role_code, role_name, description) VALUES
('ADMIN', 'System Administrator', 'Facilities Dean or Estate Officer with venue management authority'),
('FACULTY', 'Faculty Member', 'Academic staff authorized to book lecture halls and auditoriums'),
('CLUB_HEAD', 'Student Club Head', 'Authorized representative of recognized student organizations');

-- ============================================================================
-- TABLE 2: USERS
-- ============================================================================
CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- TABLE 3: VENUES (Auditoriums and Lecture Halls)
-- ============================================================================
CREATE TABLE venues (
    venue_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venue_name VARCHAR(120) NOT NULL UNIQUE,
    venue_type venue_type_enum NOT NULL,
    building VARCHAR(100) NOT NULL,
    floor_number INT NOT NULL DEFAULT 1,
    seating_capacity INT NOT NULL CHECK (seating_capacity > 0),
    has_air_conditioning BOOLEAN NOT NULL DEFAULT TRUE,
    projector_count INT NOT NULL DEFAULT 1 CHECK (projector_count >= 0),
    has_sound_system BOOLEAN NOT NULL DEFAULT TRUE,
    has_smart_podium BOOLEAN NOT NULL DEFAULT FALSE,
    venue_status venue_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_venues_type_capacity ON venues(venue_type, seating_capacity);

-- ============================================================================
-- TABLE 4: STUDENT CLUBS
-- ============================================================================
CREATE TABLE clubs (
    club_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    club_name VARCHAR(120) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- e.g. Technical, Cultural, Sports, Social
    club_head_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    faculty_coordinator_name VARCHAR(150) NOT NULL,
    faculty_coordinator_email VARCHAR(150) NOT NULL,
    is_recognized BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clubs_head ON clubs(club_head_user_id);

-- ============================================================================
-- TABLE 5: EVENTS
-- ============================================================================
CREATE TABLE events (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_title VARCHAR(200) NOT NULL,
    event_type event_type_enum NOT NULL,
    description TEXT,
    expected_attendees INT NOT NULL CHECK (expected_attendees > 0),
    organizer_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    club_id BIGINT REFERENCES clubs(club_id) ON DELETE SET NULL, -- Nullable for Faculty lectures
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_organizer ON events(organizer_user_id);
CREATE INDEX idx_events_club ON events(club_id);

-- ============================================================================
-- TABLE 6: AUTHORIZATIONS & CREDENTIALS MASTER
-- ============================================================================
CREATE TABLE authorizations (
    auth_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auth_code VARCHAR(50) NOT NULL UNIQUE,
    auth_name VARCHAR(150) NOT NULL,
    description TEXT,
    issuing_authority VARCHAR(150) NOT NULL
);

INSERT INTO authorizations (auth_code, auth_name, description, issuing_authority) VALUES
('DEAN_PERMIT', 'Dean of Student Affairs Clearance', 'Mandatory permit for mega-events in main auditoriums', 'Office of Dean Student Affairs'),
('HOD_ACAD_CLEARANCE', 'HoD Academic Clearance', 'Clearance for multi-class joint lectures and departmental symposia', 'Department Head'),
('AV_TECH_CERT', 'Acoustic & AV Console Certification', 'Authorization to operate high-end auditorium audio consoles', 'Campus AV Center'),
('SAFETY_PROTOCOL_CLEARANCE', 'Campus Safety & Fire Clearance', 'Clearance for events exceeding 500 attendees', 'Campus Safety Department');

-- ============================================================================
-- TABLE 7: USER AUTHORIZATIONS MAPPING
-- ============================================================================
CREATE TABLE user_authorizations (
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    auth_id INT NOT NULL REFERENCES authorizations(auth_id) ON DELETE CASCADE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('VERIFIED', 'REVOKED', 'EXPIRED')),
    verified_by_user_id BIGINT REFERENCES users(user_id),
    PRIMARY KEY (user_id, auth_id),
    CHECK (expiry_date >= issue_date)
);

-- ============================================================================
-- TABLE 8: VENUE REQUIREMENTS (Relational Division Target)
-- ============================================================================
CREATE TABLE venue_requirements (
    venue_id BIGINT NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    auth_id INT NOT NULL REFERENCES authorizations(auth_id) ON DELETE RESTRICT,
    PRIMARY KEY (venue_id, auth_id)
);

-- ============================================================================
-- TABLE 9: BOOKINGS (Temporal Range Exclusion & Clash Prevention)
-- ============================================================================
CREATE TABLE bookings (
    booking_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_ref VARCHAR(20) NOT NULL UNIQUE,
    venue_id BIGINT NOT NULL REFERENCES venues(venue_id) ON DELETE RESTRICT,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    event_id BIGINT NOT NULL REFERENCES events(event_id) ON DELETE RESTRICT,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    booking_status booking_status_enum NOT NULL DEFAULT 'PENDING',
    purpose_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Temporal integrity: End time must strictly follow start time
    CONSTRAINT chk_booking_time_order CHECK (end_datetime > start_datetime),

    -- Booking cannot span more than 14 consecutive hours
    CONSTRAINT chk_booking_max_duration CHECK (end_datetime - start_datetime <= INTERVAL '14 hours'),

    -- CRITICAL CONSTRAINTS: Temporal GiST Exclusion
    -- Prevents overlapping confirmed bookings on the same venue
    CONSTRAINT no_overlapping_confirmed_bookings
    EXCLUDE USING gist (
        venue_id WITH =,
        tstzrange(start_datetime, end_datetime, '[)') WITH &&
    )
    WHERE (booking_status = 'CONFIRMED')
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_venue ON bookings(venue_id);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_timerange ON bookings USING gist (tstzrange(start_datetime, end_datetime, '[)'));

-- ============================================================================
-- TABLE 10: BOOKING APPROVALS (Administrative Permits Ledger)
-- ============================================================================
CREATE TABLE booking_approvals (
    approval_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(booking_id) ON DELETE CASCADE,
    admin_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    decision approval_decision_enum NOT NULL,
    decision_datetime TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT NOT NULL
);

CREATE INDEX idx_approvals_admin ON booking_approvals(admin_id);

-- ============================================================================
-- TABLE 11: VENUE MAINTENANCE BLACKOUTS
-- ============================================================================
CREATE TABLE venue_maintenance (
    maintenance_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venue_id BIGINT NOT NULL REFERENCES venues(venue_id) ON DELETE CASCADE,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    scheduled_by BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_maint_time_order CHECK (end_datetime > start_datetime),

    -- Prevent maintenance blackout from overlapping confirmed bookings
    CONSTRAINT no_overlapping_maintenance_confirmed_bookings
    EXCLUDE USING gist (
        venue_id WITH =,
        tstzrange(start_datetime, end_datetime, '[)') WITH &&
    )
);

-- ============================================================================
-- TABLE 12: AUDIT LOGS
-- ============================================================================
CREATE TABLE audit_logs (
    log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    action_type VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    record_id BIGINT NOT NULL,
    actor_user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    old_data JSONB,
    new_data JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id);
```

---

## 5. Concurrency Handling Stored Procedures & Atomic Functions

To prevent race conditions during high-concurrency booking and approval operations, the following PL/pgSQL stored procedures handle atomic checks, locks, and automatic cascade rejections:

### 5.1 Atomic Approval & Automatic Conflict Cascade Procedure

```sql
CREATE OR REPLACE PROCEDURE sp_approve_booking(
    p_booking_id BIGINT,
    p_admin_id BIGINT,
    p_remarks TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_venue_id BIGINT;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
    v_current_status booking_status_enum;
    v_admin_role user_role_enum;
    v_conflict_count INT;
    v_competing_id BIGINT;
BEGIN
    -- 1. Verify administrator credentials
    SELECT r.role_code INTO v_admin_role
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE u.user_id = p_admin_id AND u.is_active = TRUE;

    IF v_admin_role IS NULL OR v_admin_role <> 'ADMIN' THEN
        RAISE EXCEPTION 'Authorization Error: User ID % does not have ADMIN privileges.', p_admin_id;
    END IF;

    -- 2. Lock the target booking row for update
    SELECT venue_id, start_datetime, end_datetime, booking_status
    INTO v_venue_id, v_start, v_end, v_current_status
    FROM bookings
    WHERE booking_id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking ID % not found.', p_booking_id;
    END IF;

    IF v_current_status <> 'PENDING' THEN
        RAISE EXCEPTION 'Invalid State Transition: Booking % is currently %, cannot be approved.', p_booking_id, v_current_status;
    END IF;

    -- 3. Pessimistic Row Lock on the Venue to serialize concurrent approvals for the same venue
    PERFORM venue_id 
    FROM venues 
    WHERE venue_id = v_venue_id 
    FOR UPDATE;

    -- 4. Check for any overlapping CONFIRMED booking
    SELECT COUNT(*) INTO v_conflict_count
    FROM bookings
    WHERE venue_id = v_venue_id
      AND booking_status = 'CONFIRMED'
      AND tstzrange(start_datetime, end_datetime, '[)') && tstzrange(v_start, v_end, '[)');

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Slot Conflict: An overlapping booking is already CONFIRMED for venue % during interval [%, %).',
            v_venue_id, v_start, v_end;
    END IF;

    -- 5. Check for any overlapping MAINTENANCE window
    SELECT COUNT(*) INTO v_conflict_count
    FROM venue_maintenance
    WHERE venue_id = v_venue_id
      AND tstzrange(start_datetime, end_datetime, '[)') && tstzrange(v_start, v_end, '[)');

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Slot Conflict: Venue % is under scheduled MAINTENANCE during interval [%, %).',
            v_venue_id, v_start, v_end;
    END IF;

    -- 6. Transition target booking to CONFIRMED
    UPDATE bookings
    SET booking_status = 'CONFIRMED',
        updated_at = CURRENT_TIMESTAMP
    WHERE booking_id = p_booking_id;

    -- 7. Record formal approval permit
    INSERT INTO booking_approvals (booking_id, admin_id, decision, remarks)
    VALUES (p_booking_id, p_admin_id, 'APPROVED', p_remarks);

    -- 8. AUTOMATIC CASCADE: Reject competing PENDING bookings overlapping this slot
    FOR v_competing_id IN
        SELECT booking_id
        FROM bookings
        WHERE venue_id = v_venue_id
          AND booking_id <> p_booking_id
          AND booking_status = 'PENDING'
          AND tstzrange(start_datetime, end_datetime, '[)') && tstzrange(v_start, v_end, '[)')
        FOR UPDATE
    LOOP
        UPDATE bookings
        SET booking_status = 'REJECTED',
            updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = v_competing_id;

        INSERT INTO booking_approvals (booking_id, admin_id, decision, remarks)
        VALUES (
            v_competing_id,
            p_admin_id,
            'REJECTED',
            FORMAT('Automatically rejected due to slot clash with confirmed booking #%s.', p_booking_id)
        );
    END LOOP;

    -- Transaction completes atomically
END;
$$;
```

---

### 5.2 Atomic Rejection Procedure

```sql
CREATE OR REPLACE PROCEDURE sp_reject_booking(
    p_booking_id BIGINT,
    p_admin_id BIGINT,
    p_remarks TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_admin_role user_role_enum;
    v_current_status booking_status_enum;
BEGIN
    -- Verify administrator credentials
    SELECT r.role_code INTO v_admin_role
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE u.user_id = p_admin_id AND u.is_active = TRUE;

    IF v_admin_role IS NULL OR v_admin_role <> 'ADMIN' THEN
        RAISE EXCEPTION 'Authorization Error: User ID % does not have ADMIN privileges.', p_admin_id;
    END IF;

    SELECT booking_status INTO v_current_status
    FROM bookings
    WHERE booking_id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking ID % not found.', p_booking_id;
    END IF;

    IF v_current_status <> 'PENDING' THEN
        RAISE EXCEPTION 'Cannot reject booking %; current status is %.', p_booking_id, v_current_status;
    END IF;

    UPDATE bookings
    SET booking_status = 'REJECTED',
        updated_at = CURRENT_TIMESTAMP
    WHERE booking_id = p_booking_id;

    INSERT INTO booking_approvals (booking_id, admin_id, decision, remarks)
    VALUES (p_booking_id, p_admin_id, 'REJECTED', p_remarks);
END;
$$;
```

---

## 6. Relational Division: Authorization Verification

A key database requirement is verifying whether a user holds **every** prerequisite qualification required by a restricted auditorium.

### Relational Division SQL Query
Given a requester (`:user_id`) and a requested venue (`:venue_id`):

```sql
-- Relational Division using EXCEPT (Set Difference)
-- Returns 0 rows if user is eligible; returns missing auth_ids if ineligible.
SELECT auth_id
FROM venue_requirements
WHERE venue_id = :venue_id

EXCEPT

SELECT auth_id
FROM user_authorizations
WHERE user_id = :user_id
  AND verification_status = 'VERIFIED'
  AND expiry_date >= CURRENT_DATE;
```

#### Alternative Division Pattern using `NOT EXISTS`:
```sql
SELECT v.venue_name
FROM venues v
WHERE v.venue_id = :venue_id
  AND NOT EXISTS (
      -- Mandatory authorizations for the venue that the user DOES NOT have
      SELECT vr.auth_id
      FROM venue_requirements vr
      WHERE vr.venue_id = v.venue_id
        AND NOT EXISTS (
            SELECT 1
            FROM user_authorizations ua
            WHERE ua.auth_id = vr.auth_id
              AND ua.user_id = :user_id
              AND ua.verification_status = 'VERIFIED'
              AND ua.expiry_date >= CURRENT_DATE
        )
  );
```

If the outer query returns a row, the user is authorized. If it returns zero rows, the user lacks at least one required credential.

---

## 7. Critical Analytical & Operational Queries

### Query 1: Free Venue Search (Available Slots Filter)
Find all auditoriums with capacity $\ge 300$ that have **no confirmed bookings** and **no maintenance blackouts** between a given start and end timestamp:

```sql
SELECT v.venue_id, v.venue_name, v.seating_capacity, v.building, v.floor_number
FROM venues v
WHERE v.venue_type IN ('AUDITORIUM', 'MINI_AUDITORIUM')
  AND v.seating_capacity >= 300
  AND v.venue_status = 'ACTIVE'
  -- Exclude venues with overlapping confirmed bookings
  AND NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.venue_id = v.venue_id
        AND b.booking_status = 'CONFIRMED'
        AND tstzrange(b.start_datetime, b.end_datetime, '[)') && 
            tstzrange('2026-10-20 10:00:00+05:30', '2026-10-20 14:00:00+05:30', '[)')
  )
  -- Exclude venues under maintenance
  AND NOT EXISTS (
      SELECT 1
      FROM venue_maintenance vm
      WHERE vm.venue_id = v.venue_id
        AND tstzrange(vm.start_datetime, vm.end_datetime, '[)') && 
            tstzrange('2026-10-20 10:00:00+05:30', '2026-10-20 14:00:00+05:30', '[)')
  )
ORDER BY v.seating_capacity DESC;
```

---

### Query 2: Slot Clash Inspector for Administrators
When an administrator inspects a pending booking, list all competing pending and confirmed requests that collide with it:

```sql
SELECT 
    b.booking_id,
    b.booking_ref,
    b.booking_status,
    u.full_name AS requester_name,
    r.role_code AS requester_role,
    e.event_title,
    e.expected_attendees,
    b.start_datetime,
    b.end_datetime,
    -- Overlap duration in hours
    ROUND(EXTRACT(EPOCH FROM (
        LEAST(b.end_datetime, target.end_datetime) - 
        GREATEST(b.start_datetime, target.start_datetime)
    )) / 3600.0, 2) AS overlap_hours
FROM bookings b
JOIN users u ON b.user_id = u.user_id
JOIN roles r ON u.role_id = r.role_id
JOIN events e ON b.event_id = e.event_id
CROSS JOIN (
    SELECT venue_id, start_datetime, end_datetime 
    FROM bookings 
    WHERE booking_id = :target_booking_id
) AS target
WHERE b.venue_id = target.venue_id
  AND b.booking_id <> :target_booking_id
  AND b.booking_status IN ('PENDING', 'CONFIRMED')
  AND tstzrange(b.start_datetime, b.end_datetime, '[)') && 
      tstzrange(target.start_datetime, target.end_datetime, '[)')
ORDER BY b.booking_status DESC, b.created_at ASC;
```

---

### Query 3: Administrator Pending Queue (Prioritized)
Retrieve all pending booking requests ordered by event start date:

```sql
SELECT 
    b.booking_id,
    b.booking_ref,
    v.venue_name,
    v.seating_capacity,
    u.full_name AS requester_name,
    u.department,
    r.role_code AS requester_role,
    c.club_name,
    e.event_title,
    e.event_type,
    e.expected_attendees,
    b.start_datetime,
    b.end_datetime,
    b.created_at AS requested_at,
    -- Competing pending requests count
    (
        SELECT COUNT(*)
        FROM bookings comp
        WHERE comp.venue_id = b.venue_id
          AND comp.booking_id <> b.booking_id
          AND comp.booking_status = 'PENDING'
          AND tstzrange(comp.start_datetime, comp.end_datetime, '[)') && 
              tstzrange(b.start_datetime, b.end_datetime, '[)')
    ) AS competing_pending_count
FROM bookings b
JOIN venues v ON b.venue_id = v.venue_id
JOIN users u ON b.user_id = u.user_id
JOIN roles r ON u.role_id = r.role_id
JOIN events e ON b.event_id = e.event_id
LEFT JOIN clubs c ON e.club_id = c.club_id
WHERE b.booking_status = 'PENDING'
ORDER BY b.start_datetime ASC, b.created_at ASC;
```

---

### Query 4: Venue Utilization Rate Analytics (Admin Report)
Calculate the monthly utilization rate of each auditorium (hours booked vs. available hours based on 12 operational hours/day):

```sql
WITH venue_hours AS (
    SELECT 
        v.venue_id,
        v.venue_name,
        v.venue_type,
        v.seating_capacity,
        COALESCE(SUM(
            EXTRACT(EPOCH FROM (b.end_datetime - b.start_datetime)) / 3600.0
        ), 0) AS total_hours_booked,
        COUNT(b.booking_id) AS total_events_hosted
    FROM venues v
    LEFT JOIN bookings b ON v.venue_id = b.venue_id 
        AND b.booking_status = 'CONFIRMED'
        AND b.start_datetime >= DATE_TRUNC('month', CURRENT_DATE)
        AND b.start_datetime < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    GROUP BY v.venue_id, v.venue_name, v.venue_type, v.seating_capacity
)
SELECT 
    venue_id,
    venue_name,
    venue_type,
    seating_capacity,
    total_events_hosted,
    ROUND(total_hours_booked::NUMERIC, 2) AS hours_booked,
    -- Assuming 30 days * 12 operating hours = 360 hours available per month
    ROUND((total_hours_booked / 360.0 * 100)::NUMERIC, 2) AS utilization_percentage
FROM venue_hours
ORDER BY utilization_percentage DESC;
```

---

## 8. Backend REST API Specifications

| Method | Endpoint | Authorized Roles | Description |
|---|---|---|---|
| `GET` | `/api/venues` | All | List all venues with filters (capacity, type, features, date range) |
| `GET` | `/api/venues/:id/schedule` | All | Fetch confirmed calendar schedule and blackout slots for a venue |
| `POST` | `/api/bookings` | Normal (Faculty, Club Head) | Submit new booking request (validates credentials via relational division) |
| `GET` | `/api/bookings/my` | Normal | Fetch current user's past and active booking requests |
| `DELETE` | `/api/bookings/:id` | Normal (Owner) | Cancel own pending or confirmed booking |
| `GET` | `/api/admin/pending` | Admin | Fetch pending approval queue with competing conflict counts |
| `GET` | `/api/admin/clashes/:id` | Admin | Inspect all overlapping bookings (pending & confirmed) for request `:id` |
| `POST` | `/api/admin/approvals/:id` | Admin | Atomically approve booking via `sp_approve_booking` (grants permit) |
| `POST` | `/api/admin/rejections/:id` | Admin | Reject booking with remarks via `sp_reject_booking` |
| `POST` | `/api/admin/maintenance` | Admin | Schedule venue maintenance blackout window |
| `GET` | `/api/admin/reports/utilization` | Admin | Get monthly venue utilization metrics and statistics |
| `GET` | `/api/admin/audit-logs` | Admin | Query historical system audit log events |

---

## 9. Normalization & Schema Integrity Verification

1. **1NF (First Normal Form):** Every attribute is atomic; no repeating groups. Arrays replaced with junction tables (`venue_requirements`, `user_authorizations`).
2. **2NF (Second Normal Form):** All non-key attributes are fully functionally dependent on the entire primary key. In composite junction tables (`user_authorizations`, `venue_requirements`), attributes depend on both keys.
3. **3NF (Third Normal Form):** No transitive dependencies exist. User details (department, designation) depend solely on `user_id`; venue attributes depend on `venue_id`; approval data depends on `approval_id`.
4. **BCNF (Boyce-Codd Normal Form):** Every determinant in every functional dependency is a superkey.
