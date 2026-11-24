import { BookRideForm } from "@/components/passenger/BookRideForm";
import { ErrorState } from "@/components/ui/ErrorStates";
import { requireRole } from "@/lib/auth/guards";
import {
  getActiveFareSetting,
  getPassengerActiveRideData,
} from "@/lib/passenger/queries";

export default async function BookRidePage() {
  const { userId } = await requireRole("passenger");
  const [fareSetting, { activeRide }] = await Promise.all([
    getActiveFareSetting(),
    getPassengerActiveRideData(userId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
          Book a Ride
        </h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Choose your pickup and destination to calculate an upfront fare
          estimate and request a verified SakayNa driver.
        </p>
      </div>

      {!fareSetting ? (
        <ErrorState
          title="Fare configuration unavailable"
          message="No active fare rules were found in Supabase. Please contact an Administrator to configure fare settings."
        />
      ) : (
        <BookRideForm
          fareSetting={fareSetting}
          hasActiveRide={Boolean(activeRide)}
        />
      )}
    </div>
  );
}
