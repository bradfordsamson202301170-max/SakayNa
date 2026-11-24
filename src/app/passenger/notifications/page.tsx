import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Cards";
import { EmptyState } from "@/components/ui/ErrorStates";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireRole } from "@/lib/auth/guards";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/passenger/actions";
import { getPassengerNotifications } from "@/lib/passenger/queries";

export default async function PassengerNotificationsPage() {
  const { userId } = await requireRole("passenger");
  const notifications = await getPassengerNotifications(userId);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Notifications
          </h1>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck className="h-4 w-4" />
              Mark All Read ({unreadCount})
            </Button>
          </form>
        )}
      </div>

      <SectionCard title={`Alerts (${notifications.length})`}>
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="When your ride status changes or a driver accepts your trip, alerts will appear here."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      item.is_read
                        ? "bg-slate-100 text-slate-500"
                        : "bg-orange-50 text-orange-600"
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#181A20]">
                        {item.title}
                      </p>
                      {!item.is_read && (
                        <StatusBadge label="Unread" tone="orange" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {!item.is_read && (
                  <form action={markNotificationReadAction}>
                    <input
                      type="hidden"
                      name="notification_id"
                      value={item.id}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      Mark Read
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
