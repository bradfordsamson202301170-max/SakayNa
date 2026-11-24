import { ProfileForm } from "@/components/auth/AuthForms";
import { SectionCard } from "@/components/ui/Cards";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireRole } from "@/lib/auth/guards";

export default async function PassengerProfilePage() {
  const { profile } = await requireRole("passenger");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Passenger Profile
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Manage your personal contact information.
          </p>
        </div>
        <StatusBadge
          label={`Account: ${profile.account_status}`}
          tone={profile.account_status === "active" ? "emerald" : "red"}
          dot
        />
      </div>

      <SectionCard title="Personal Information">
        <ProfileForm
          fullName={profile.full_name}
          email={profile.email}
          phone={profile.phone ?? ""}
          roleLabel="Passenger"
        />
      </SectionCard>
    </div>
  );
}
