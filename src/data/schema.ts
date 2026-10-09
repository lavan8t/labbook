// CampusBook Schema Definitions & User Personas

export type UserType = "admin" | "normal";
export type UserRole = "CLUB_HEAD" | "FACULTY" | "ADMIN";

export interface CampusUser {
  user_id: number;
  name: string;
  email: string;
  user_type: UserType;
  role: UserRole;
  role_display: string;
  department: string;
  avatar_initials: string;
  credentials: string[];
}

export const ADMIN_ACCESS_CODE = "0406";

export const APP_USERS: CampusUser[] = [
  {
    user_id: 4,
    name: "Aditya Sharma",
    email: "aditya.sharma2024@vitstudent.ac.in",
    user_type: "normal",
    role: "CLUB_HEAD",
    role_display: "Student Club Head (ACM)",
    department: "ACM Student Chapter",
    avatar_initials: "AS",
    credentials: [
      "Dean of Student Affairs Clearance (DEAN_PERMIT)",
      "Acoustic & AV Console Certification (AV_TECH_CERT)",
    ],
  },
  {
    user_id: 2,
    name: "Prof. K. Venkatesh",
    email: "kvenkatesh@vit.ac.in",
    user_type: "normal",
    role: "FACULTY",
    role_display: "Faculty Member",
    department: "Department of Computer Science",
    avatar_initials: "KV",
    credentials: [
      "HoD Academic Clearance (HOD_ACAD_CLEARANCE)",
    ],
  },
  {
    user_id: 1,
    name: "Dr. A. Ramanathan",
    email: "ramanathan@vit.ac.in",
    user_type: "admin",
    role: "ADMIN",
    role_display: "Estate & Facilities Administrator",
    department: "Estate Office",
    avatar_initials: "AR",
    credentials: [
      "Full Campus Venue Management & Permit Authority",
    ],
  },
];

export interface FallbackVenue {
  venue_id: number;
  venue_name: string;
  venue_type: "AUDITORIUM" | "MINI_AUDITORIUM" | "LECTURE_HALL" | "SEMINAR_HALL";
  building: string;
  floor_number: number;
  seating_capacity: number;
  has_air_conditioning: boolean;
  projector_count: number;
  has_sound_system: boolean;
  has_smart_podium: boolean;
  venue_status: "ACTIVE" | "MAINTENANCE" | "DECOMMISSIONED";
  required_authorizations: {
    auth_id: number;
    auth_code: string;
    auth_name: string;
  }[];
}

export const FALLBACK_VENUES: FallbackVenue[] = [
  {
    venue_id: 1,
    venue_name: "Anna Auditorium",
    venue_type: "AUDITORIUM",
    building: "Main Administrative Block",
    floor_number: 1,
    seating_capacity: 1500,
    has_air_conditioning: true,
    projector_count: 4,
    has_sound_system: true,
    has_smart_podium: true,
    venue_status: "ACTIVE",
    required_authorizations: [
      { auth_id: 1, auth_code: "DEAN_PERMIT", auth_name: "Dean of Student Affairs Clearance" },
      { auth_id: 3, auth_code: "AV_TECH_CERT", auth_name: "Acoustic & AV Console Certification" },
    ],
  },
  {
    venue_id: 2,
    venue_name: "Kamaraj Mini Auditorium",
    venue_type: "MINI_AUDITORIUM",
    building: "Technology Tower",
    floor_number: 2,
    seating_capacity: 450,
    has_air_conditioning: true,
    projector_count: 2,
    has_sound_system: true,
    has_smart_podium: true,
    venue_status: "ACTIVE",
    required_authorizations: [],
  },
  {
    venue_id: 3,
    venue_name: "Smart Lecture Hall TT-101",
    venue_type: "LECTURE_HALL",
    building: "Technology Tower",
    floor_number: 1,
    seating_capacity: 120,
    has_air_conditioning: true,
    projector_count: 1,
    has_sound_system: true,
    has_smart_podium: true,
    venue_status: "ACTIVE",
    required_authorizations: [],
  },
  {
    venue_id: 4,
    venue_name: "Smart Lecture Hall SJT-204",
    venue_type: "LECTURE_HALL",
    building: "Silver Jubilee Tower",
    floor_number: 2,
    seating_capacity: 180,
    has_air_conditioning: true,
    projector_count: 2,
    has_sound_system: true,
    has_smart_podium: true,
    venue_status: "ACTIVE",
    required_authorizations: [],
  },
  {
    venue_id: 5,
    venue_name: "Mahatma Gandhi Seminar Hall",
    venue_type: "SEMINAR_HALL",
    building: "Library Complex",
    floor_number: 3,
    seating_capacity: 200,
    has_air_conditioning: true,
    projector_count: 1,
    has_sound_system: true,
    has_smart_podium: false,
    venue_status: "ACTIVE",
    required_authorizations: [],
  },
];
