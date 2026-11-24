export type UserRole = "passenger" | "driver" | "admin";

export interface NavItem {
  label: string;
  href: string;
  icon:
    | "layout-dashboard"
    | "map-pin"
    | "navigation"
    | "history"
    | "user"
    | "bell"
    | "shield-check"
    | "radio"
    | "wallet"
    | "users"
    | "bike"
    | "route"
    | "sliders"
    | "bar-chart"
    | "file-text";
  badge?: string;
}

export const PASSENGER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/passenger", icon: "layout-dashboard" },
  { label: "Book a Ride", href: "/passenger/book", icon: "map-pin" },
  { label: "Active Ride", href: "/passenger/active-ride", icon: "navigation", badge: "Live" },
  { label: "Ride History", href: "/passenger/history", icon: "history" },
  { label: "Profile", href: "/passenger/profile", icon: "user" },
  { label: "Notifications", href: "/passenger/notifications", icon: "bell", badge: "3" },
];

export const DRIVER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/driver", icon: "layout-dashboard" },
  { label: "Driver Verification", href: "/driver/verification", icon: "shield-check" },
  { label: "Available Rides", href: "/driver/available-rides", icon: "radio", badge: "2" },
  { label: "Active Ride", href: "/driver/active-ride", icon: "navigation" },
  { label: "Earnings", href: "/driver/earnings", icon: "wallet" },
  { label: "Profile", href: "/driver/profile", icon: "user" },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "layout-dashboard" },
  { label: "Driver Management", href: "/admin/drivers", icon: "bike" },
  { label: "Driver Verification", href: "/admin/verification", icon: "shield-check" },
  { label: "Motorcycle Management", href: "/admin/motorcycles", icon: "bike" },
  { label: "Ride Management", href: "/admin/rides", icon: "route" },
  { label: "Fare Settings", href: "/admin/fares", icon: "sliders" },
  { label: "Reports", href: "/admin/reports", icon: "bar-chart" },
];
