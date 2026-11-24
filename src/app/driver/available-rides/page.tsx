import {
  AvailableRidesClient,
  OnlineToggleControl,
} from "@/components/driver/DriverClientControls";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/ErrorStates";
import { requireRole } from "@/lib/auth/guards";
import { canDriverAcceptRides } from "@/lib/domain/driver";
import {
  getAvailableRideRequests,
  getDriverAndVehicle,
} from "@/lib/driver/queries";

export default async function DriverAvailableRidesPage() {
  const { userId } = await requireRole("driver");
  const { driver, vehicle } = await getDriverAndVehicle(userId);

  const approval = driver?.approval_status ?? "pending";
  const availability = driver?.availability_status ?? "offline";
  const gate = canDriverAcceptRides({
    approvalStatus: approval,
    availabilityStatus: availability,
    hasActiveVehicle: Boolean(vehicle),
  });

  const rides =
    gate.allowed && driver ? await getAvailableRideRequests(driver.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Available Rides
          </h1>
        </div>

        <OnlineToggleControl
          approvalStatus={approval}
          availabilityStatus={availability}
          hasActiveVehicle={Boolean(vehicle)}
        />
      </div>

      {!gate.allowed ? (
        <EmptyState
          title="Ride Dispatch Locked"
          description={
            gate.reason ??
            "Only approved online drivers with an active motorcycle can view and accept ride requests."
          }
          action={
            approval !== "approved" ? (
              <LinkButton href="/driver/verification" variant="primary" size="sm">
                Check Driver Verification
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <AvailableRidesClient rides={rides} />
      )}
    </div>
  );
}
