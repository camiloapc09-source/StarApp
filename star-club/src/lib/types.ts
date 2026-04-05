export type UserRole = "ADMIN" | "COACH" | "PLAYER" | "PARENT";

export type PlayerStatus = "ACTIVE" | "PENDING" | "INACTIVE";

export type SessionType = "TRAINING" | "MATCH" | "EVENT";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export type PaymentStatus = "PENDING" | "COMPLETED" | "OVERDUE";

export type MissionType = "DAILY" | "WEEKLY" | "CHALLENGE" | "SPECIAL";

export type MissionStatus = "ACTIVE" | "COMPLETED" | "EXPIRED";

export type NotificationType = "INFO" | "ALERT" | "ACHIEVEMENT" | "PAYMENT" | "ATTENDANCE";

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface DashboardStat {
  label: string;
  value: string | number;
  change?: number;
  icon: string;
}
