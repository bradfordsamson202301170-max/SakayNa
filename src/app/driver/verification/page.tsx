import {
  DocumentUploadCard,
  DriverOnboardingForm,
} from "@/components/driver/DriverClientControls";
import { SectionCard } from "@/components/ui/Cards";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireRole } from "@/lib/auth/guards";
import { getDriverAndVehicle } from "@/lib/driver/queries";

export default async function DriverVerificationPage() {
  const { userId } = await requireRole("driver");
  const { driver, vehicle } = await getDriverAndVehicle(userId);
  const approval = driver?.approval_status ?? "pending";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Driver &amp; Motorcycle Verification
          </h1>
        </div>
        <StatusBadge
          label={`Status: ${approval.toUpperCase()}`}
          tone={
            approval === "approved"
              ? "emerald"
              : approval === "pending"
                ? "amber"
                : "red"
          }
          dot
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="1. Driver & Motorcycle Details">
          <DriverOnboardingForm driver={driver} vehicle={vehicle} />
        </SectionCard>

        <SectionCard
          title="2. Private Document Uploads"
          description="5 MB max · JPG, PNG, or PDF."
        >
          <div className="space-y-4">
            <DocumentUploadCard
              kind="profile_photo"
              title="Driver Profile Photo"
              description="Clear headshot photo for identity verification."
              currentPath={driver?.profile_photo_path ?? null}
            />
            <DocumentUploadCard
              kind="license_doc"
              title="Driver's License Document"
              description="Front scan/photo of your valid motorcycle driver's license."
              currentPath={driver?.license_doc_path ?? null}
            />
            <DocumentUploadCard
              kind="vehicle_registration"
              title="Vehicle Registration Document (OR / CR)"
              description="Official motorcycle registration document."
              currentPath={
                vehicle?.registration_doc_path ?? driver?.orcr_doc_path ?? null
              }
            />
            <DocumentUploadCard
              kind="motorcycle_photo"
              title="Motorcycle Photo"
              description="Clear photo of your motorcycle showing the plate number."
              currentPath={vehicle?.photo_path ?? null}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
