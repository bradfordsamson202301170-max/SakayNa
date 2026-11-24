import { DriverActiveRideClient } from "@/components/driver/DriverClientControls";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/ErrorStates";
import { requireRole } from "@/lib/auth/guards";
import { getDriverActiveRideDetails } from "@/lib/driver/queries";

export default async function DriverActiveRidePage() {
  const { userId } = await requireRole("driver");
  const { activeRide, passenger } = await getDriverActiveRideDetails(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
          Active Ride
        </h1>
      </div>

      {!activeRide ? (
        <EmptyState
          title="No active ride assigned"
          description="Go online and accept an available ride request to manage a live trip here."
          action={
            <LinkButton href="/driver/available-rides" variant="primary">
              View Available Rides
            </LinkButton>
          }
        />
      ) : (
        <DriverActiveRideClient
          ride={activeRide}
          passengerLabel={passenger?.label ?? "Assigned Passenger"}
        />
      )}
    </div>
  );
}
