import { ActiveRideClient } from "@/components/passenger/ActiveRideClient";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/ErrorStates";
import { requireRole } from "@/lib/auth/guards";
import { getPassengerActiveRideData } from "@/lib/passenger/queries";

export default async function PassengerActiveRidePage() {
  const { userId } = await requireRole("passenger");
  const { activeRide, assignedDriver, history, existingRating } =
    await getPassengerActiveRideData(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
          Active Ride
        </h1>
      </div>

      {!activeRide ? (
        <EmptyState
          title="No active ride right now"
          description="When you request a ride, you can track driver assignment and live trip status right here."
          action={
            <LinkButton href="/passenger/book" variant="primary">
              Book a Ride
            </LinkButton>
          }
        />
      ) : (
        <ActiveRideClient
          ride={activeRide}
          assignedDriver={assignedDriver}
          history={history}
          existingRating={existingRating}
        />
      )}
    </div>
  );
}
