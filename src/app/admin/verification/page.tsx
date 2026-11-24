import { ExternalLink } from "lucide-react";
import { DriverReviewActions } from "@/components/admin/AdminClientControls";
import { SectionCard } from "@/components/ui/Cards";
import { EmptyState } from "@/components/ui/ErrorStates";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getAdminDrivers } from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminDriverVerificationPage() {
  await requireRole("admin");
  const drivers = await getAdminDrivers(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
          Driver Verification
        </h1>
      </div>

      {drivers.length === 0 ? (
        <EmptyState
          title="No driver applications yet"
          description="When drivers register and upload their license and motorcycle documents, they will appear here for review."
        />
      ) : (
        <div className="space-y-5">
          {drivers.map((driver) => (
            <SectionCard
              key={driver.id}
              title={driver.full_name}
              description={`${driver.email} · ${driver.phone ?? "No phone"} · License: ${driver.license_number}`}
              action={
                <StatusBadge
                  label={driver.approval_status.toUpperCase()}
                  tone={
                    driver.approval_status === "approved"
                      ? "emerald"
                      : driver.approval_status === "pending"
                        ? "amber"
                        : "red"
                  }
                  dot
                />
              }
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-4 space-y-1.5">
                    <p>
                      <span className="text-slate-500">Address:</span>{" "}
                      <span className="font-medium text-[#181A20]">
                        {driver.address ?? "Not provided"}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500">Motorcycle:</span>{" "}
                      <span className="font-medium text-[#181A20]">
                        {driver.vehicleLabel ?? "Not registered"}{" "}
                        {driver.plateNumber ? `(${driver.plateNumber})` : ""}
                      </span>
                    </p>
                    {driver.rejection_reason && (
                      <p className="text-xs text-red-700">
                        Previous rejection reason: {driver.rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    {[
                      { label: "Profile Photo", url: driver.documents.profilePhotoUrl },
                      { label: "Driver's License", url: driver.documents.licenseDocUrl },
                      { label: "Vehicle Reg (OR/CR)", url: driver.documents.vehicleRegUrl },
                      { label: "Motorcycle Photo", url: driver.documents.motorcyclePhotoUrl },
                    ].map((doc) =>
                      doc.url ? (
                        <a
                          key={doc.label}
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-[#181A20] hover:border-orange-400 hover:text-orange-600"
                        >
                          <span>{doc.label}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <div
                          key={doc.label}
                          className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-slate-400"
                        >
                          <span>{doc.label}</span>
                          <span>Missing</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <DriverReviewActions
                  driverId={driver.id}
                  currentStatus={driver.approval_status}
                />
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
