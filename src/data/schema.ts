export type Role = "Researcher" | "Faculty" | "Student";

export interface User {
  user_id: number;
  name: string;
  role: Role;
  department: string;
}

export interface Qualification {
  qualification_id: number;
  name: string;
}

export interface UserQualification {
  user_id: number;
  qualification_id: number;
  status: "VERIFIED" | "PENDING" | "EXPIRED";
  expiry: string;
}

export interface Equipment {
  resource_id: number;
  name: string;
  location: string;
  status: "AVAILABLE" | "MAINTENANCE" | "OFFLINE";
}

export interface EquipmentRequirement {
  resource_id: number;
  qualification_id: number;
}

export interface Booking {
  booking_id: number;
  resource_id: number;
  user_id: number;
  start_datetime: string;
  end_datetime: string;
  status: "CONFIRMED" | "CANCELLED" | "PENDING";
}

export interface DbState {
  users: User[];
  qualifications: Qualification[];
  user_qualifications: UserQualification[];
  equipment: Equipment[];
  equipment_requirements: EquipmentRequirement[];
  bookings: Booking[];
}

export const initialDb: DbState = {
  users: [
    { user_id: 1, name: "Alice Chen", role: "Researcher", department: "Bioengineering" },
    { user_id: 2, name: "Bob Kumar", role: "Researcher", department: "Materials Science" },
    { user_id: 3, name: "Charlie Davis", role: "Faculty", department: "Physics" },
  ],
  qualifications: [
    { qualification_id: 101, name: "Laser Safety Level 2" },
    { qualification_id: 102, name: "Biosafety Protocol BSL-2" },
  ],
  user_qualifications: [
    { user_id: 1, qualification_id: 101, status: "VERIFIED", expiry: "2027-12-31" },
    { user_id: 1, qualification_id: 102, status: "VERIFIED", expiry: "2027-12-31" },
    { user_id: 2, qualification_id: 102, status: "VERIFIED", expiry: "2027-12-31" },
  ],
  equipment: [
    { resource_id: 201, name: "Confocal Microscope", location: "Lab 3B", status: "AVAILABLE" },
    { resource_id: 202, name: "Field Emission SEM", location: "Cleanroom 1", status: "AVAILABLE" },
  ],
  equipment_requirements: [
    { resource_id: 201, qualification_id: 102 },
    { resource_id: 202, qualification_id: 101 },
    { resource_id: 202, qualification_id: 102 },
  ],
  bookings: [
    {
      booking_id: 501,
      resource_id: 201,
      user_id: 3,
      start_datetime: "2026-10-15T10:00:00Z",
      end_datetime: "2026-10-15T12:00:00Z",
      status: "CONFIRMED",
    },
  ],
};
