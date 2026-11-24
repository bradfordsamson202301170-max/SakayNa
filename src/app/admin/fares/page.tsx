import { FareSettingsForm } from "@/components/admin/AdminClientControls";
import { SectionCard } from "@/components/ui/Cards";
import { getAdminFareSetting } from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminFaresPage() {
  await requireRole("admin");
  const fareSetting = await getAdminFareSetting();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
          Fare Settings
        </h1>
      </div>

      <SectionCard title="Active Fare Configuration">
        <FareSettingsForm fareSetting={fareSetting} />
      </SectionCard>
    </div>
  );
}
