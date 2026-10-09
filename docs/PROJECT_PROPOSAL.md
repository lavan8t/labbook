# ASSESSMENT 6: Project Proposal & Database Design Document

**Course:** BCSE302P – Database Systems Lab  
**Slot:** D1 – L51 + L52  
**Faculty Name:** Prof. Sangeetha S  
**Date:** October 2026  

### Team Members
- **Narayanan Subramanian** – 24BCE2981
- **Lavanbarath B** – 24BDS0155

---

### Project Title
**Campus Auditorium & Lecture Hall Reservation and Administrative Authorization System (CampusBook)**

---

## 1. Introduction and Background
Universities host hundreds of academic and extracurricular gatherings every semester, ranging from combined department lectures, guest seminars, and examinations to student club hackathons, technical symposiums, and cultural festivals. These events rely heavily on finite campus venue infrastructure, primarily:
1. **Central Auditoriums and Mini-Auditoriums** (high capacity, specialized audio-visual consoles, acoustic paneling).
2. **Smart Lecture Halls and Seminar Halls** (medium capacity, smart podia, projection arrays, tiered seating).

Managing auditorium and lecture hall bookings is inherently complex. It cannot be treated as a trivial first-come-first-served calendar booking system. High-demand venues require rigorous administrative oversight:
- **Authorization & Credentials:** Student club heads must furnish verified club registration, faculty coordinator approvals, and anticipated participant metrics. Faculty members require department validation for large multi-section lecture merges or guest dignitary symposia.
- **Administrative Vetting:** An **Administrator** (e.g., Estate Officer, Dean of Student Affairs, or Academic Facilities Manager) must review pending requests, verify the legitimacy of requesters and their authorizations, verify that the slot is completely vacant, and explicitly grant a formal permit.
- **Temporal Integrity & Concurrency:** Multiple faculty coordinators or club heads frequently apply for the exact same premium slots (e.g., Friday afternoons or weekends). Without atomic, database-level conflict prevention, concurrent booking submissions and parallel administrator approvals lead to devastating double-booking anomalies and scheduling clashes.

The proposed system, **CampusBook**, provides a robust, relational database-driven backend designed specifically to manage auditorium and lecture hall allocation, enforce authorization hierarchies, handle high-concurrency requests, and prevent slot clashes at the database engine level.

---

## 2. Problem Statement
Manual, spreadsheet-based, or naive web reservation systems suffer from severe structural shortcomings in campus environments:
1. **Double Booking & Slot Overlaps:** Standard unique constraints (e.g., `UNIQUE(venue_id, start_time)`) fail to prevent overlapping ranges (e.g., Booking A from 10:00 to 13:00 conflicts with Booking B from 11:30 to 14:00).
2. **Race Conditions During Approval:** If two administrators simultaneously approve two competing requests for the same hall, or if an approval races with a new reservation, naive application-level checks allow race conditions to bypass validation.
3. **Unverified & Unauthorized Access:** Club heads or individuals may attempt to book large-capacity auditoriums without required institutional clearance, faculty endorsements, or valid club credentials.
4. **Lack of Centralized Administrative Oversight:** Administrators lack a unified dashboard to review slot conflicts, inspect conflicting candidate applications for the same time window, review equipment/capacity requirements, and issue official digital permits.
5. **No Auditability & Utilization Intelligence:** University leadership cannot reliably audit who authorized a venue, track cancellation histories, or assess resource utilization rates across academic departments and student bodies.

**The Solution:** An ACID-compliant PostgreSQL relational database architecture that implements:
- Role-based separation between **Normal Users** (Faculty and Student Club Heads) and **Administrators**.
- **PostgreSQL GiST Range Exclusion (`tstzrange` with `btree_gist`)** to mathematically prevent overlapping confirmed venue reservations directly in the database engine.
- Transactional pessimistic row-locking (`SELECT ... FOR UPDATE`) inside atomic stored procedures to serialize administrative approval decisions.
- Relational division queries to enforce authorization credentials prior to request generation or approval.

---

## 3. Objectives
The core objectives of the system are:
1. **Centralized Venue Catalog:** Maintain structured profiles for all campus venues (Auditoriums, Mini-Auditoriums, Smart Lecture Halls, Seminar Halls) including seating capacities, AV equipment, and availability statuses.
2. **Distinct Dual-Role Workflow:**
   - **Normal Users (Faculty & Student Club Heads):** Search venue availability, submit event/lecture booking requests, attach event metadata (expected attendance, topic, credentials), and monitor reservation statuses.
   - **Administrators:** Review pending queues, evaluate applicant credentials and authorization, inspect conflicting requests for contested slots, and atomically grant permits (confirm bookings) or reject requests with explanatory remarks.
3. **Database-Level Conflict & Clash Prevention:** Ensure that no two confirmed bookings or scheduled maintenance blackout periods can overlap for the same venue using PostgreSQL GiST temporal exclusion constraints.
4. **Concurrency and Race-Condition Protection:** Eliminate race conditions during concurrent booking requests and parallel administrative approvals through row-level locking (`SELECT ... FOR UPDATE`) and ACID transaction isolation.
5. **Authorization Verification via Relational Division:** Enforce that restricted facilities (e.g., Main Auditorium) can only be booked by users who possess all mandatory prerequisite authorizations.
6. **Automated Conflict Resolution:** When an administrator approves a request for a disputed slot, automatically flag or transition conflicting pending requests into a `REJECTED_CLASH` state within the same transaction.
7. **Comprehensive Audit Trail & Analytics:** Maintain historical logs of every request, administrator decision, timestamp, and modification, and support complex SQL analytical queries on venue utilization and booking trends.

---

## 4. Scope of the Project

### 4.1 Included in the Scope
- **User & Role Management:** Structured classification of users into Normal Users (Faculty, Student Club Heads) and Administrators.
- **Club & Department Profiles:** Association of club heads with registered student organizations and faculty with academic departments.
- **Venue Master Data:** Auditoriums, mini-auditoriums, and smart lecture halls categorized by capacity, location, air conditioning, projector arrays, sound systems, and acoustic ratings.
- **Event Metadata:** Details on academic lectures (course codes, combined sections) and club events (workshops, hackathons, guest speakers, expected footfall).
- **Authorization & Credential Tracking:** Department permits, Dean clearances, and safety/security sign-offs linked to users.
- **Booking Request Lifecycle:** Complete state transitions (`PENDING` $\rightarrow$ `CONFIRMED` / `REJECTED` / `CANCELLED`).
- **Administrative Permit Granting:** Approval workflow with mandatory administrator identity recording, timestamps, and justification remarks.
- **Database Engine Concurrency Control:**
  - GiST temporal exclusion constraints on timestamp ranges (`tstzrange`).
  - Pessimistic locking procedures for conflict-free approvals.
  - Cascade resolution of competing pending requests.
- **Database Queries & Analytical Reporting:** Venue occupancy rates, peak usage slots, department booking tallies, and cancellation audits.

### 4.2 Excluded from the Scope
- Physical smart-card door locks or RFID access turnstiles.
- In-person ticketing and payment gateway integration.
- Automated HVAC/air-conditioning IoT controller switching.
- Computer vision-based actual attendee head-counting.

---

## 5. Requirement Analysis

### 5.1 System Users & Permissions

```
+--------------------------------------------------------------------------+
|                               SYSTEM USERS                               |
+------------------------------------+-------------------------------------+
|            NORMAL USERS            |            ADMINISTRATORS           |
|  - Faculty                         |  - Estate Officer                   |
|  - Student Club Heads              |  - Dean / HoD / Facilities Admin    |
+------------------------------------+-------------------------------------+
| * Search available halls/audis     | * Oversee all auditoriums & halls   |
| * Check temporal slot availability | * Inspect all pending queue items   |
| * Submit booking requests          | * Verify requester authorizations   |
| * Provide event/lecture details    | * Evaluate slot clashes/conflicts   |
| * Track approval/rejection status  | * Grant permits (CONFIRM booking)   |
| * Cancel own pending requests      | * Reject with documented remarks    |
| * View personal booking history    | * Manage venue availability & stats |
+------------------------------------+-------------------------------------+
```

#### 1. Normal Users
- **Faculty Members:**
  - Submit booking requests for lecture halls or auditoriums for combined lectures, guest faculty visits, conferences, symposia, or departmental examinations.
  - Automatically verified via employee credentials and departmental affiliation.
- **Student Club Heads:**
  - Submit booking requests for auditoriums or lecture halls for extracurricular, technical, or cultural club activities.
  - Must supply event descriptions, expected attendance numbers, faculty coordinator endorsements, and valid club credentials.
  - Cannot self-approve; every request enters the `PENDING` queue.

#### 2. Administrators (Estate Officer / Facilities Dean / Venue In-Charge)
- Supervise all campus auditoriums and lecture halls.
- Review pending requests submitted by faculty and student club heads.
- Verify credentials, event feasibility, and faculty/dean authorization.
- Verify real-time slot vacancy (inspecting confirmed bookings and competing pending requests).
- Formally issue approval permits (which locks in the reservation as `CONFIRMED`) or reject requests with recorded remarks.
- Blackout venue slots for scheduled maintenance, structural inspections, or institutional reserve periods.

---

### 5.2 Data to be Stored
1. **User Data:** User ID, full name, institutional email (unique), phone number, role type (`ADMIN`, `FACULTY`, `CLUB_HEAD`), department ID, account status.
2. **Venue Data:** Venue ID, venue name, venue type (`AUDITORIUM`, `MINI_AUDITORIUM`, `LECTURE_HALL`, `SEMINAR_HALL`), building/location, seating capacity, AV equipment specs, air-conditioned status, operational status (`ACTIVE`, `MAINTENANCE`, `INACTIVE`).
3. **Club Data:** Club ID, club name, category (Technical, Cultural, Sports), registered department, designated club head (User ID), faculty coordinator name and contact.
4. **Event Data:** Event ID, event title, category (`ACADEMIC_LECTURE`, `GUEST_SPEECH`, `WORKSHOP`, `HACKATHON`, `CULTURAL_EVENT`, `EXAM`), description, expected attendance, associated club ID (nullable for faculty lectures).
5. **Authorization / Credential Data:** Authorization ID, authorization name (e.g., "Dean Student Affairs Event Permit", "HoD Lecture Clearance", "Acoustic Console Clearance"), validity period.
6. **User Authorization Mapping:** User ID, Authorization ID, issue date, expiration date, issuing authority, verification status (`VERIFIED`, `REVOKED`).
7. **Venue Authorization Requirements:** Venue ID, required Authorization ID (defines which credentials a requester must possess to book high-stakes venues like the Central Auditorium).
8. **Booking Requests:** Booking ID, unique booking reference code, venue ID, requester User ID, event ID, start timestamp, end timestamp, current status (`PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`), submission timestamp.
9. **Permit & Approval Records:** Approval ID, booking ID, approving administrator User ID, decision (`APPROVED`, `REJECTED`), decision timestamp, administrative remarks.
10. **Maintenance Records:** Maintenance ID, venue ID, maintenance window (`tstzrange`), description, assigned contractor/team.
11. **System Audit Logs:** Log ID, event type, actor User ID, affected table, old state, new state, client IP/timestamp.

---

### 5.3 Major Operations
1. **Venue Discovery & Availability Search:** Query venue catalog filtered by capacity, amenities, and available time slots.
2. **Booking Request Submission:** Normal user submits requested venue, time range, and event metadata. System verifies no identical user duplicate exists and creates a `PENDING` booking.
3. **Prerequisite Authorization Check (Relational Division):** Verify that the requester holds all mandatory credentials configured for that venue.
4. **Slot Conflict Inspection:** Determine whether the requested time window overlaps with any existing `CONFIRMED` booking or scheduled maintenance.
5. **Administrative Permit Issuance (Atomic Approval):**
   - Acquire pessimistic lock on the venue row.
   - Confirm slot remains free from any conflicting `CONFIRMED` booking.
   - Update target booking status to `CONFIRMED`.
   - Record administrator permit in the approvals ledger.
   - Automatically notify or reject overlapping `PENDING` candidate requests.
6. **Booking Cancellation:** Normal user can cancel their own `PENDING` or `CONFIRMED` booking before the start timestamp, freeing the slot.
7. **Maintenance Blackout Scheduling:** Administrator locks out a venue for repairs or cleaning, immediately preventing new bookings.

---

### 5.4 Database Queries & Analytical Reports
The schema supports essential queries for campus venue management:
- **Free Slot Search:** Find all auditoriums with capacity $\ge 500$ that have no confirmed booking between `2026-10-15 14:00` and `2026-10-15 18:00`.
- **Pending Approvals Queue:** List all pending booking requests ordered by event start date, displaying requester role, club/department name, and expected attendance.
- **Conflicting Requests Report:** Given a requested booking ID, return all other pending requests competing for overlapping time ranges on the same venue.
- **Relational Division Check:** Check whether a club head has all required clearances for the Grand Auditorium using relational division (set difference `EXCEPT`).
- **Utilization Rate Analysis:** Calculate total booked hours per auditorium over a semester to identify under-utilized and over-utilized venues.
- **Club Activity Ledger:** Rank student clubs by approved auditorium hours and cancellation frequency.
- **Administrator Decision Log:** Audit all permits granted or rejected by a specific administrator within a given date range.

---

## 6. Database Selection & Technical Justification

### 6.1 Selected Database
**PostgreSQL 16+ (Relational Database Management System)**

### 6.2 Technical Justification
Campus venue scheduling requires uncompromising ACID transactional guarantees and specialized temporal logic:

1. **PostgreSQL GiST Temporal Range Exclusion:**
   Standard relational databases (e.g., MySQL) only enforce equality constraints (`UNIQUE(venue_id, start_datetime)`). This fails when an event spans `10:00 - 14:00` and another attempts to book `11:00 - 12:00`. PostgreSQL provides native range types (`tstzrange`), the GiST index access method, and the `btree_gist` extension, enabling:
   ```sql
   ALTER TABLE bookings
   ADD CONSTRAINT no_overlapping_confirmed_bookings
   EXCLUDE USING gist (
       venue_id WITH =,
       tstzrange(start_datetime, end_datetime, '[)') WITH &&
   )
   WHERE (booking_status = 'CONFIRMED');
   ```
   This mathematically guarantees that no two confirmed bookings for the same venue can overlap in time, rejected instantly at the database engine level regardless of application bugs.

2. **ACID Concurrency & Pessimistic Locking:**
   When multiple administrators evaluate requests or multiple normal users submit bookings concurrently, PostgreSQL provides row-level pessimistic locking (`SELECT ... FOR UPDATE`) and configurable isolation levels (`READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`), preventing phantom reads and double-commit anomalies.

3. **Complex Relational Modeling & Division:**
   Relational division (checking if a user holds all required qualifications) is natively and efficiently executed in PostgreSQL via set operations (`EXCEPT`), subqueries with `NOT EXISTS`, or aggregation filters (`HAVING COUNT(*) = ...`).

4. **Extensible Functions & Triggers (PL/pgSQL):**
   PostgreSQL allows encapsulating business logic (e.g., atomic approval, conflicting request rejection, audit logging) directly into database triggers and stored procedures for guaranteed data consistency.

---

## 7. Relational Schema Summary

```
+------------------+         1:N          +------------------+
|      ROLES       | -------------------> |      USERS       |
+------------------+                      +------------------+
                                                    |
                      +-----------------------------+-----------------------------+
                      | 1:N                                                       | 1:N
                      v                                                           v
             +------------------+                                        +------------------+
             |      CLUBS       |                                        | USER_AUTH_MAP    |
             +------------------+                                        +------------------+
                      | 1:N                                                       | N:1
                      v                                                           v
             +------------------+                                        +------------------+
             |      EVENTS      |                                        |  AUTHORIZATIONS  |
             +------------------+                                        +------------------+
                      | 1:N                                                       ^
                      v                                                           | N:1
+------------------+ 1:N +------------------+ N:1 +------------------+ 1:N +------------------+
|      VENUES      | <-- |     BOOKINGS     | --> |    APPROVALS     |     |   VENUE_REQ_MAP  |
+------------------+     +------------------+     +------------------+     +------------------+
          | 1:N                   |                                               | N:1
          v                       |                                               |
+------------------+              +-----------------------------------------------+
|   MAINTENANCE    |
+------------------+
```

### Relational Schema Definitions
- `roles(role_id PK, role_name, description)`
- `users(user_id PK, full_name, email UNIQUE, phone, role_id FK, department, is_active)`
- `venues(venue_id PK, venue_name, venue_type, building, floor, capacity, has_ac, projector_count, sound_system, is_active)`
- `clubs(club_id PK, club_name, category, club_head_user_id FK, faculty_coordinator_name, contact_email)`
- `events(event_id PK, event_title, event_type, description, expected_attendees, organizer_user_id FK, club_id FK [nullable])`
- `authorizations(auth_id PK, auth_name, description, issuing_body, validity_days)`
- `user_authorizations(user_id FK, auth_id FK, issue_date, expiry_date, status, PK(user_id, auth_id))`
- `venue_requirements(venue_id FK, auth_id FK, PK(venue_id, auth_id))`
- `bookings(booking_id PK, booking_ref UNIQUE, venue_id FK, user_id FK, event_id FK, start_datetime, end_datetime, booking_status, created_at)`
  - *Exclusion constraint on `(venue_id, [start_datetime, end_datetime))` where `booking_status = 'CONFIRMED'`*
- `booking_approvals(approval_id PK, booking_id FK UNIQUE, admin_id FK, decision, decision_datetime, remarks)`
- `venue_maintenance(maintenance_id PK, venue_id FK, start_datetime, end_datetime, reason, status)`
- `audit_logs(log_id PK, table_name, action, record_id, changed_by FK, old_values, new_values, logged_at)`

---

## 8. Summary of Revisions in this Assessment
1. **Domain Focus Refinement:** Transitioned project focus from laboratory instruments and research equipment to **Campus Auditoriums and Smart Lecture Halls**, directly aligning with the real-world operational challenges of university event booking.
2. **Dual-Role Specification:** Formally established the two user tiers:
   - **Normal Users:** Faculty (academic lectures, symposia) and Student Club Heads (club events, workshops).
   - **Administrators:** Facility in-charge / Deans with exclusive authority to review credentials, evaluate slot clashes, and grant permits.
3. **Database-First Concurrency Architecture:** Placed database engine-level concurrency control at the center of the project, employing PostgreSQL GiST range exclusions and pessimistic locking stored procedures to permanently prevent slot clashes and double bookings.
