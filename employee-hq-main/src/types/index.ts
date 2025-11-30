export type UserRoleType = 'employee' | 'manager';

export interface Profile {
  id: string;
  employee_id: string;
  name: string;
  department: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: UserRoleType;
  created_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half-day';

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: AttendanceStatus;
  total_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceWithProfile extends Attendance {
  profile: Profile;
}

export interface MonthlySummary {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  totalHours: number;
}

export interface TodayStatus {
  status: AttendanceStatus | 'not-marked';
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: number;
}
