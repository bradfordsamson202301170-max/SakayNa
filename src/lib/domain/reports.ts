export interface RideSummaryInput {
  id: string;
  driver_id: string | null;
  status: string;
  created_at: string;
}

export interface RideTimeWindowMetrics {
  dailyRides: number;
  weeklyRides: number;
  monthlyRides: number;
  completedRides: number;
  cancelledRides: number;
  completionRate: number;
}

export interface DriverPerformanceRow {
  driverId: string;
  driverName: string;
  approvalStatus: string;
  completedRides: number;
  ratingAverage: number;
  totalRatings: number;
  grossRevenue: number;
  driverNetPayout: number;
}

const CANCELLED_STATUSES = new Set([
  "cancelled_by_passenger",
  "cancelled_by_driver",
  "cancelled_by_admin",
  "expired",
]);

export function aggregateRideTimeWindows(
  rides: RideSummaryInput[],
  now: Date = new Date()
): RideTimeWindowMetrics {
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const sevenDaysAgo = startOfDay - 6 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = startOfDay - 29 * 24 * 60 * 60 * 1000;

  let dailyRides = 0;
  let weeklyRides = 0;
  let monthlyRides = 0;
  let completedRides = 0;
  let cancelledRides = 0;

  for (const r of rides) {
    const ts = new Date(r.created_at).getTime();
    if (ts >= startOfDay) dailyRides++;
    if (ts >= sevenDaysAgo) weeklyRides++;
    if (ts >= thirtyDaysAgo) monthlyRides++;
    if (r.status === "completed") completedRides++;
    if (CANCELLED_STATUSES.has(r.status)) cancelledRides++;
  }

  const finished = completedRides + cancelledRides;
  const completionRate =
    finished > 0 ? Number(((completedRides / finished) * 100).toFixed(1)) : 0;

  return {
    dailyRides,
    weeklyRides,
    monthlyRides,
    completedRides,
    cancelledRides,
    completionRate,
  };
}

function sanitizeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  // Prevent CSV formula injection in spreadsheet apps (Excel/Sheets)
  const neutralized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(neutralized)) {
    return `"${neutralized.replaceAll('"', '""')}"`;
  }
  return neutralized;
}

export function toCsvString(
  headers: string[],
  rows: Array<Array<unknown>>
): string {
  const headerLine = headers.map(sanitizeCsvCell).join(",");
  const bodyLines = rows.map((row) => row.map(sanitizeCsvCell).join(","));
  return [headerLine, ...bodyLines].join("\r\n");
}
